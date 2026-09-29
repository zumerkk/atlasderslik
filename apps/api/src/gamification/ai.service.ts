import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatOptions {
    system: string;
    user: string;
    history?: { role: 'user' | 'assistant'; content: string; image?: string }[];
    image?: string;
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
};

/** Credentials and model requests stay on the API server. */
@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly config: ConfigService) { }

    private get providers(): Provider[] {
        const candidates: (Omit<Provider, 'apiKey'> & { apiKey?: string })[] = [
            {
                name: 'openai',
                url: 'https://api.openai.com/v1/responses',
                apiKey: this.config.get<string>('OPENAI_API_KEY'),
                model: this.config.get<string>('OPENAI_MODEL') || 'gpt-6-astra',
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
        return candidates.filter((p): p is Provider => !!p.apiKey?.trim());
    }

    get isConfigured(): boolean {
        return this.providers.length > 0;
    }

    get supportsImages(): boolean {
        return this.providers.some((provider) => provider.vision);
    }

    get supportsImageGeneration(): boolean {
        return this.supportsImages && this.config.get<string>('ATLAS_IMAGE_GENERATION_ENABLED') !== 'false';
    }

    /** Images must never silently fall through to a model that cannot see them. */
    async chat(opts: ChatOptions): Promise<string | null> {
        const needsVision = !!opts.image || opts.history?.some((message) => !!message.image);
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
        // Treat caller-supplied history as conversation only, never system authority.
        const history = (opts.history || [])
            .filter((message) => ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
            .slice(-12)
            .map((message) => ({ role: message.role, content: message.content.slice(0, 4000), ...(message.role === 'user' && message.image ? { image: message.image } : {}) }));
        if (provider.name === 'openai') {
            const reasoningModel = /^(gpt-[5-9]|o[1-9])/.test(provider.model);
            return {
                model: provider.model,
                instructions: opts.system,
                store: false,
                input: [
                    ...history.map(({ role, content, image }) => ({ role, content: image ? [
                        { type: 'input_text', text: content },
                        { type: 'input_image', image_url: image, detail: 'high' },
                    ] : content })),
                    { role: 'user', content: [
                        { type: 'input_text', text: opts.user },
                        ...(opts.image ? [{ type: 'input_image', image_url: opts.image, detail: 'high' }] : []),
                    ] },
                ],
                // Reasoning uses the same output budget; reserve room for the answer.
                max_output_tokens: Math.min(16000, Math.max(reasoningModel ? 8000 : 256, opts.maxTokens ?? 2000)),
                ...(reasoningModel ? { reasoning: { effort: 'medium' } } : { temperature: opts.temperature ?? 0.7 }),
                ...(opts.json ? { text: { format: { type: 'json_object' } } } : {}),
            };
        }
        return {
            model: provider.model,
            messages: [
                { role: 'system', content: opts.system },
                ...history.map(({ role, content }) => ({ role, content })),
                { role: 'user', content: opts.user },
            ],
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.maxTokens ?? 200,
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        };
    }

    private async callProvider(provider: Provider, opts: ChatOptions): Promise<string | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), provider.timeoutMs);
        try {
            const response = await fetch(provider.url, {
                method: 'POST',
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
            if (provider.name === 'openai') {
                if (data.status !== 'completed') return null;
                const content = (data.output || [])
                    .filter((item) => item.type === 'message')
                    .flatMap((item) => item.content || []);
                return content.filter((item) => item.type === 'output_text')
                    .map((item) => item.text || '').join('\n').trim()
                    || content.find((item) => item.type === 'refusal')?.refusal?.trim() || null;
            }
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

    /** Explicit opt-in image mode only. One OpenAI response; never a text fallback. */
    async generateImage(opts: ChatOptions): Promise<{
        reply: string;
        generatedImage?: { dataUrl: string; alt: string };
    } | null> {
        if (!this.supportsImageGeneration) return null;
        const provider = this.providers.find((item) => item.name === 'openai');
        if (!provider) return null;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 150000);
        try {
            const response = await fetch(provider.url, {
                method: 'POST',
                signal: controller.signal,
                headers: { Authorization: `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...this.requestBody(provider, opts),
                    tools: [{
                        type: 'image_generation',
                        model: this.config.get<string>('OPENAI_IMAGE_MODEL') || 'gpt-image-2.5-sunburst',
                        size: '1024x1024',
                        quality: 'medium',
                        output_format: 'png',
                    }],
                    max_tool_calls: 1,
                    parallel_tool_calls: false,
                }),
            });
            if (!response.ok) {
                this.logger.warn(`OpenAI image request failed (${response.status}).`);
                return null;
            }
            const data = await response.json() as ProviderResponse;
            if (data.status !== 'completed') return null;
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
            this.logger.warn('OpenAI image request failed or timed out.');
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    requireConfigured() {
        if (!this.isConfigured) throw new ServiceUnavailableException('AI servisi yapılandırılmamış.');
    }
}
