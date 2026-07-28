import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface ChatOptions {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    json?: boolean;
}

/**
 * Server-side proxy for Groq. The API key lives only in the API process env
 * (GROQ_API_KEY) and is never shipped to the browser — previously it was
 * inlined into the client bundle, which exposed it to every visitor.
 */
@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(private readonly config: ConfigService) { }

    get isConfigured(): boolean {
        return !!this.config.get<string>('GROQ_API_KEY');
    }

    /** Returns the model's text, or null when the call fails for any reason. */
    async chat(opts: ChatOptions): Promise<string | null> {
        const key = this.config.get<string>('GROQ_API_KEY');
        if (!key) {
            this.logger.warn('GROQ_API_KEY is not set — AI features fall back to static content.');
            return null;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(GROQ_URL, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: MODEL,
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
                this.logger.error(`Groq request failed (${res.status}): ${body.slice(0, 300)}`);
                return null;
            }

            const data = await res.json();
            return data?.choices?.[0]?.message?.content?.trim() || null;
        } catch (e: any) {
            this.logger.error(`Groq request errored: ${e?.message || e}`);
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
            this.logger.error(`Groq returned non-JSON payload: ${raw.slice(0, 200)}`);
            return null;
        }
    }

    requireConfigured() {
        if (!this.isConfigured) {
            throw new ServiceUnavailableException('AI servisi yapılandırılmamış (GROQ_API_KEY eksik).');
        }
    }
}
