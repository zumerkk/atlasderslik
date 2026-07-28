import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatOptions {
    system: string;
    user: string;
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
}

/**
 * Server-side proxy for the chat models. The API keys live only in the API
 * process env and are never shipped to the browser — the Groq key used to be
 * inlined into the client bundle, which exposed it to every visitor.
 *
 * Providers are tried in order, so a Groq outage or rate limit falls through to
 * Hugging Face instead of degrading every AI feature to static text. Both speak
 * the OpenAI chat-completions shape and serve the same Llama 3.3 70B model, so
 * output quality is consistent across the fallback.
 */
@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly config: ConfigService) { }

    /** Configured providers, in priority order. */
    private get providers(): Provider[] {
        const candidates: (Omit<Provider, 'apiKey'> & { apiKey?: string })[] = [
            {
                name: 'groq',
                url: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: this.config.get<string>('GROQ_API_KEY'),
                model: 'llama-3.3-70b-versatile',
                timeoutMs: 15000,
            },
            {
                name: 'huggingface',
                url: 'https://router.huggingface.co/v1/chat/completions',
                apiKey: this.config.get<string>('HUGGINGFACE_API_KEY'),
                model: 'meta-llama/Llama-3.3-70B-Instruct',
                // The HF router is slower than Groq; it only runs as a fallback.
                timeoutMs: 45000,
            },
        ];
        return candidates.filter((p): p is Provider => !!p.apiKey);
    }

    get isConfigured(): boolean {
        return this.providers.length > 0;
    }

    /** Returns the model's text, or null when every provider fails. */
    async chat(opts: ChatOptions): Promise<string | null> {
        const providers = this.providers;
        if (!providers.length) {
            this.logger.warn('No AI provider configured — features fall back to static content.');
            return null;
        }

        for (const provider of providers) {
            const text = await this.callProvider(provider, opts);
            if (text) {
                if (provider.name !== providers[0].name) {
                    this.logger.log(`Served by fallback provider "${provider.name}".`);
                }
                return text;
            }
        }

        this.logger.error(`All AI providers failed (${providers.map((p) => p.name).join(', ')}).`);
        return null;
    }

    private async callProvider(provider: Provider, opts: ChatOptions): Promise<string | null> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), provider.timeoutMs);
        try {
            const res = await fetch(provider.url, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${provider.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: [
                        { role: 'system', content: opts.system },
                        { role: 'user', content: opts.user },
                    ],
                    temperature: opts.temperature ?? 0.7,
                    max_tokens: opts.maxTokens ?? 200,
                    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
                }),
            });

            if (!res.ok) {
                const body = await res.text().catch(() => '');
                this.logger.warn(`${provider.name} failed (${res.status}): ${body.slice(0, 200)}`);
                return null;
            }

            const data = await res.json();
            return data?.choices?.[0]?.message?.content?.trim() || null;
        } catch (e: any) {
            const reason = e?.name === 'AbortError' ? `timed out after ${provider.timeoutMs}ms` : e?.message || String(e);
            this.logger.warn(`${provider.name} errored: ${reason}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    /** chat() that parses a JSON object response, or null if it isn't valid JSON. */
    async chatJson<T = any>(opts: ChatOptions): Promise<T | null> {
        const raw = await this.chat({ ...opts, json: true });
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            this.logger.error(`AI returned non-JSON payload: ${raw.slice(0, 200)}`);
            return null;
        }
    }

    requireConfigured() {
        if (!this.isConfigured) {
            throw new ServiceUnavailableException('AI servisi yapılandırılmamış.');
        }
    }
}
