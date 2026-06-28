// OpenRouterProvider — final fallback through openrouter.ai.
//
// OpenRouter exposes most popular open-weight + closed models through an
// OpenAI-compatible REST endpoint. We use it as the chain's last-resort
// safety net: if NVIDIA quota is exhausted, Gemini quota is exhausted,
// AND Groq quota is exhausted, this gives the user one more shot before
// we surface an error.
//
// Activated by setting `OPENROUTER_API_KEY`. Model defaults to one with a
// permissive free tier; override via `OPENROUTER_MODEL` in env.

import { BaseProvider, ProviderError } from './BaseProvider.js';

const DEFAULT_MODEL =
    process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterProvider extends BaseProvider {
    constructor() {
        super();
        this.key = process.env.OPENROUTER_API_KEY || '';
        this.model = DEFAULT_MODEL;
    }

    get id() {
        return 'openrouter';
    }

    isAvailable() {
        return !!this.key;
    }

    async _call(prompt, options, jsonMode) {
        if (!this.key) {
            throw new ProviderError('OPENROUTER_API_KEY not configured', {
                provider: this.id,
                retryable: true,
                code: 'auth',
            });
        }

        const body = {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature ?? 0.5,
            max_tokens: options.maxTokens ?? 4096,
        };
        if (jsonMode) body.response_format = { type: 'json_object' };

        let res;
        try {
            res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.key}`,
                    'Content-Type': 'application/json',
                    // OpenRouter requires HTTP-Referer + X-Title headers for
                    // analytics on free models. We send a stable identifier
                    // so usage shows up cleanly in the OpenRouter dashboard.
                    'HTTP-Referer':
                        process.env.OPENROUTER_REFERRER ||
                        'https://meetmind.ai',
                    'X-Title': 'MeetMind AI · Document Intelligence',
                },
                body: JSON.stringify(body),
                signal: options.signal,
            });
        } catch (err) {
            throw new ProviderError(`OpenRouter network error: ${err.message}`, {
                provider: this.id,
                retryable: true,
                code: 'network',
                cause: err,
            });
        }

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const code =
                res.status === 429
                    ? 'rate_limit'
                    : res.status === 401 || res.status === 403
                    ? 'auth'
                    : res.status >= 500
                    ? 'server'
                    : 'error';
            throw new ProviderError(
                `OpenRouter ${res.status}: ${text.slice(0, 240) || res.statusText}`,
                { provider: this.id, retryable: true, code }
            );
        }

        const data = await res.json().catch(() => null);
        return data?.choices?.[0]?.message?.content || '';
    }

    async generateText(prompt, options = {}) {
        return this._call(prompt, options, false);
    }

    async generateJson(prompt, options = {}) {
        return this._call(prompt, options, true);
    }
}
