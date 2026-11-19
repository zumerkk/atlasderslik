import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiBudgetService } from './openai-budget.service';

export interface ChatOptions {
    system: string;
    user: string;
    history?: { role: 'user' | 'assistant'; content: string; image?: string }[];
    image?: string;
    images?: string[];
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
}

interface Provider {
    name: string;
    url: string;
    apiKey: string;
    model: string;
    timeoutMs: number;
    vision?: boolean;
}

type ProviderResponse = {
    status?: string;
    output?: { type?: string; result?: string; content?: { type?: string; text?: string; refusal?: string }[] }[];
    choices?: { finish_reason?: string; message?: { content?: string } }[];
    usage?: { input_tokens?: number; output_tokens?: number };
};

// Standard USD per million tokens (also micro-USD per token). Input
// includes room for cache writes and a regional surcharge; don't assume
// that tokens were cached. Keep this allowlist aligned with OpenAI pricing.
const OPENAI_RATES = new Map<string, { input: number; output: number }>([
    ['gpt-6-luna', { input: 0.14, output: 0.55 }],
    ['gpt-6-sol', { input: 2.75, output: 11 }],
    ['gpt-6-astra', { input: 13.75, output: 55 }],
]);
const IMAGE_MODELS = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);
const TRANSCRIPTION_MODELS = new Set(['gpt-transcribe', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe']);
const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';

export class OpenAiTranscriptionException extends ServiceUnavailableException {
    constructor(readonly retryable: boolean) {
        super('Ders sesi şu anda yazıya çevrilemedi. OpenAI ayarlarını ve kullanım durumunu kontrol edin.');
    }
}

/** Credentials and model requests stay on the API server. */
@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly budget: OpenAiBudgetService,
    ) { }

    private get providers(): Provider[] {
        // A deployed key alone must not turn on billable calls. All inference
        // capabilities and outbound text, image and audio use this same gate.
        if (this.config.get<string>('NODE_ENV') === 'production'
            && this.config.get<string>('ATLAS_OPENAI_ENABLED') !== 'true') return [];
        const candidates: (Omit<Provider, 'apiKey'> & { apiKey?: string })[] = [
            {
                name: 'openai',
                url: RESPONSES_URL,
                apiKey: this.config.get<string>('OPENAI_API_KEY'),
                model: this.config.get<string>('OPENAI_MODEL')?.trim() || 'gpt-6-luna',
                timeoutMs: 60000,
                vision: true,
            },
            {
                name: 'groq',
                url: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: this.config.get<string>('GROQ_API_KEY'),
                model: this.config.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile',
                timeoutMs: 15000,
            },
            {
                name: 'huggingface',
                url: 'https://router.huggingface.co/v1/chat/completions',
                apiKey: this.config.get<string>('HUGGINGFACE_API_KEY'),
                model: this.config.get<string>('HUGGINGFACE_MODEL') || 'meta-llama/Llama-3.3-70B-Instruct',
                timeoutMs: 45000,
            },
        ];
        return candidates.filter((p): p is Provider => !!p.apiKey?.trim())
            .map(p => ({ ...p, apiKey: p.apiKey.trim() }));
    }

    get isConfigured(): boolean {
        return this.providers.length > 0;
    }

    get isOpenAiConfigured(): boolean {
        return this.providers.some(provider => provider.name === 'openai' && OPENAI_RATES.has(provider.model));
    }

    get supportsImages(): boolean {
        return this.isOpenAiConfigured;
    }

    get supportsImageGeneration(): boolean {
        return this.supportsImages && this.config.get<string>('ATLAS_IMAGE_GENERATION_ENABLED') !== 'false'
            && IMAGE_MODELS.has(this.imageModel);
    }

    private get imageModel() { return this.config.get<string>('OPENAI_IMAGE_MODEL')?.trim() || 'gpt-image-2.5-flare'; }

    async budgetStatus() {
        return { ...await this.budget.status(), providerConfigured: this.isOpenAiConfigured };
    }

    /** Images must never silently fall through to a model that cannot see them. */
    async chat(opts: ChatOptions): Promise<string | null> {
        const needsVision = !!opts.image || !!opts.images?.length || opts.history?.some((message) => !!message.image);
        const providers = this.providers.filter((provider) => !needsVision || provider.vision);
        if (!providers.length) return null;
        for (const provider of providers) {
            const reply = await this.callProvider(provider, opts);
            if (reply) return reply;
        }
        this.logger.warn('AI providers could not complete the request.');
        return null;
    }

    private requestBody(provider: Provider, opts: ChatOptions) {
        // A client can forge any previous speaker. Serialize it as data
        // instead of giving it a privileged conversation turn.
        const history = (opts.history || [])
            .filter((message) => ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
            .slice(-12)
            .map((message) => ({ role: message.role, content: message.content.slice(0, 4000), ...(message.role === 'user' && message.image ? { image: message.image } : {}) }));
        const content = history.length ? JSON.stringify({
            untrustedPreviousMessages: history.map(({ role, content }) => ({ claimedSpeaker: role, text: content })),
            request: opts.user,
        }) : opts.user;
        const attachments = [
            ...(opts.image ? [opts.image] : []), ...(opts.images || []),
            ...history.flatMap(row => row.image ? [row.image] : []),
        ].slice(0, 12);
        const maxTokens = Number.isSafeInteger(opts.maxTokens) ? opts.maxTokens! : 1800;
        if (provider.name === 'openai') {
            return {
                model: provider.model,
                instructions: opts.system,
                store: false,
                service_tier: 'default',
                input: [{ role: 'user', content: [
                    { type: 'input_text', text: content },
                    ...attachments.map(image => ({ type: 'input_image', image_url: image, detail: 'high' })),
                ] }],
                max_output_tokens: Math.min(12000, Math.max(256, maxTokens + 400)),
                reasoning: { effort: 'low' },
                ...(opts.json ? { text: { format: { type: 'json_object' } } } : {}),
            };
        }
        return {
            model: provider.model,
            messages: [
                { role: 'system', content: opts.system },
                { role: 'user', content },
            ],
            temperature: opts.temperature ?? 0.7,
            max_tokens: Math.min(12000, Math.max(128, maxTokens)),
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        };
    }

    private async openAiResponse(
        provider: Provider,
        body: { max_output_tokens?: number } & Record<string, unknown>,
        timeoutMs: number,
        imageTool = false,
    ): Promise<ProviderResponse | null> {
        const rates = OPENAI_RATES.get(provider.model);
        if (!rates || !body.max_output_tokens) throw new ServiceUnavailableException('AtlasAI için bütçe hesabı tanımlı bir OpenAI modeli seçilmeli.');
        let imageCount = 0;
        const meteredBody = JSON.stringify(body, (key, value: unknown) => {
            if (key !== 'image_url') return value;
            imageCount++;
            if (typeof value !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,/.test(value) || value.length > 24 * 1024 * 1024)
                throw new ServiceUnavailableException('AtlasAI yalnızca desteklenen, sınır içindeki görselleri işleyebilir.');
            return '';
        });
        // UTF-8 bytes bound text tokens; reserve separately for image patches
        // and serialization overhead. Prevent long-context price tiers.
        const inputTokens = Buffer.byteLength(meteredBody) + imageCount * 6000 + 8000;
        if (inputTokens > 250_000) throw new ServiceUnavailableException('AtlasAI isteği çok uzun. Daha kısa içerikle yeniden deneyin.');
        const toolReserve = imageTool ? 300_000 + imageCount * 50_000 : 0;
        const reserve = Math.ceil(inputTokens * rates.input + body.max_output_tokens * rates.output + toolReserve);
        await this.budget.reserve(reserve);
        try {
            const response = await fetch(provider.url, {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
                headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                this.logger.warn(`OpenAI request failed (${response.status}).`);
                return null;
            }
            const data = await response.json() as ProviderResponse;
            const input = data.usage?.input_tokens, output = data.usage?.output_tokens;
            if (!imageTool && typeof input === 'number' && Number.isSafeInteger(input) && input > 0
                && typeof output === 'number' && Number.isSafeInteger(output) && output >= 0) {
                const longContext = input > 272_000;
                await this.budget.settle(reserve, Math.ceil(
                    input * rates.input * (longContext ? 2 : 1) + output * rates.output * (longContext ? 1.5 : 1),
                ));
            }
            return data;
        } catch {
            // Timeouts may still have been billed. Keep the reservation.
            this.logger.warn('OpenAI request failed or timed out.');
            return null;
        }
    }

    private async callProvider(provider: Provider, opts: ChatOptions): Promise<string | null> {
        if (provider.name === 'openai') {
            const data = await this.openAiResponse(provider, this.requestBody(provider, opts), provider.timeoutMs);
            if (data?.status !== 'completed') return null;
            const content = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []);
            return content.find(item => item.type === 'refusal')?.refusal?.trim()
                || content.filter(item => item.type === 'output_text').map(item => item.text || '').join('\n').trim() || null;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), provider.timeoutMs);
        try {
            const response = await fetch(provider.url, {
                method: 'POST',
                redirect: 'error',
                signal: controller.signal,
                headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(this.requestBody(provider, opts)),
            });
            if (!response.ok) {
                // Provider bodies can contain user data or credentials: log status only.
                this.logger.warn(`${provider.name} request failed (${response.status}).`);
                return null;
            }
            const data = await response.json() as ProviderResponse;
            const choice = data.choices?.[0];
            if (choice?.finish_reason === 'length') return null;
            return choice?.message?.content?.trim() || null;
        } catch {
            this.logger.warn(`${provider.name} request failed or timed out.`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async chatJson<T = unknown>(opts: ChatOptions): Promise<T | null> {
        const raw = await this.chat({ ...opts, json: true });
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            this.logger.warn('AI returned an invalid JSON response.');
            return null;
        }
    }

    /** Strict structured generation is OpenAI-only; callers still validate semantics. */
    async chatStructured<T>(opts: ChatOptions, schema: Record<string, unknown>, name: string): Promise<T | null> {
        const provider = this.providers.find(item => item.name === 'openai');
        if (!provider) return null;
        const result = await this.openAiResponse(provider, {
            ...this.requestBody(provider, opts),
            text: { format: { type: 'json_schema', name, strict: true, schema } },
        }, 120000);
        if (result?.status !== 'completed') return null;
        try {
            const content = (result.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []);
            if (content.some(item => item.type === 'refusal')) return null;
            const raw = content.filter(item => item.type === 'output_text').map(item => item.text || '').join('');
            return JSON.parse(raw) as T;
        } catch { this.logger.warn('OpenAI returned invalid structured output.'); return null; }
    }

    /** Explicit opt-in image mode only. One OpenAI response; never a text fallback. */
    async generateImage(opts: ChatOptions): Promise<{
        reply: string;
        generatedImage?: { dataUrl: string; alt: string };
    } | null> {
        if (!this.supportsImageGeneration) return null;
        const provider = this.providers.find((item) => item.name === 'openai');
        if (!provider) return null;
        const data = await this.openAiResponse(provider, {
            ...this.requestBody(provider, opts),
            tools: [{
                type: 'image_generation', model: this.imageModel,
                size: '1024x1024', quality: 'medium', output_format: 'png',
            }],
            max_tool_calls: 1,
            parallel_tool_calls: false,
        }, 150000, true);
        if (data?.status !== 'completed') return null;
        try {
            const content = (data.output || []).filter((item) => item.type === 'message').flatMap((item) => item.content || []);
            const refusal = content.find((item) => item.type === 'refusal')?.refusal;
            if (refusal) return { reply: refusal };
            const reply = content.filter((item) => item.type === 'output_text').map((item) => item.text || '').join('\n').trim();
            const result = data.output?.find((item) => item.type === 'image_generation_call')?.result;
            if (!result) return reply ? { reply } : null;
            // Only the requested PNG bytes become an image, never arbitrary URLs/HTML.
            if (result.length > 24 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(result)) return null;
            const bytes = Buffer.from(result, 'base64');
            if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return null;
            return {
                reply: reply || 'Eğitim görselin hazır. Üzerindeki bilgileri ders kaynağınla birlikte kontrol edebilirsin.',
                generatedImage: { dataUrl: `data:image/png;base64,${result}`, alt: opts.user.slice(0, 300) },
            };
        } catch {
            this.logger.warn('OpenAI returned an invalid image.');
            return null;
        }
    }

    async transcribeAudio(bytes: Uint8Array, durationSeconds: number): Promise<string> {
        const provider = this.providers.find(item => item.name === 'openai');
        const model = this.config.get<string>('OPENAI_TRANSCRIPTION_MODEL')?.trim() || 'gpt-transcribe';
        if (!provider || !TRANSCRIPTION_MODELS.has(model) || !Number.isFinite(durationSeconds)
            || durationSeconds <= 0 || durationSeconds > 600 || !bytes.byteLength || bytes.byteLength > 24 * 1024 * 1024)
            throw new OpenAiTranscriptionException(false);
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }), 'lesson.mp3');
        form.append('model', model);
        form.append('language', 'tr');
        form.append('response_format', 'json');
        // Conservative charge for each started minute; no retry can skip it.
        await this.budget.reserve(Math.ceil(durationSeconds / 60) * 15_000 + 5000);
        try {
            const response = await fetch(TRANSCRIPTION_URL, {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
                headers: { Authorization: `Bearer ${provider.apiKey}` }, body: form,
            });
            if (!response.ok) {
                this.logger.warn(`OpenAI transcription failed (${response.status}).`);
                throw new OpenAiTranscriptionException(response.status === 408 || response.status >= 500);
            }
            const data = await response.json() as { text?: unknown };
            if (typeof data.text !== 'string') throw new OpenAiTranscriptionException(false);
            return data.text;
        } catch (error) {
            if (error instanceof OpenAiTranscriptionException) throw error;
            throw new OpenAiTranscriptionException(true);
        }
    }

    requireConfigured() {
        if (!this.isConfigured) throw new ServiceUnavailableException('AI servisi yapılandırılmamış.');
    }
}
