// NvidiaProvider — NVIDIA NIM cloud endpoint (build.nvidia.com).
//
// NVIDIA exposes their hosted Nemotron / Llama / Cosmos models through an
// OpenAI-compatible REST endpoint at:
//
//   https://integrate.api.nvidia.com/v1/chat/completions
//
// This means we can talk to them with a vanilla `fetch` call — no SDK
// required, and no extra dependencies on the backend. The user provisions
// an API key from build.nvidia.com and drops it into `NVIDIA_API_KEY`.
//
// The default model is the Nemotron Ultra reasoning model. The model id
// can be overridden per environment via `NVIDIA_MODEL` for experimentation.
//
// IMPORTANT: this provider is `isAvailable() === false` whenever
// `NVIDIA_API_KEY` is unset, which is the case for most users today. The
// chain in ./index.js will silently skip it and try the next provider.
// This means setting it up is a non-event for existing deploys — zero
// behavioural change until the user opts in by setting the env var.

import { BaseProvider, ProviderError } from './BaseProvider.js';

const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const ENDPOINT =
    process.env.NVIDIA_API_BASE_URL ||
    'https://integrate.api.nvidia.com/v1/chat/completions';

export class NvidiaProvider extends BaseProvider {
    constructor() {
        super();
        this.key = process.env.NVIDIA_API_KEY || '';
        this.model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
    }

    get id() {
        return 'nvidia';
    }

    isAvailable() {
        return !!this.key;
    }

    async _call(prompt, options, jsonMode) {
        if (!this.key) {
            throw new ProviderError('NVIDIA_API_KEY not configured', {
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
            stream: false,
        };
        // NVIDIA's NIM follows OpenAI's structured-output protocol where it
        // is supported. We pass it but tolerate the call failing — some
        // models on the endpoint don't recognise the parameter yet, in which
        // case we just retry without it.
        if (jsonMode) body.response_format = { type: 'json_object' };

        let res;
        try {
            res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.key}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
                signal: options.signal,
            });
        } catch (err) {
            throw new ProviderError(`NVIDIA network error: ${err.message}`, {
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
            // Retry once without response_format if the model rejected it.
            if (jsonMode && /response_format/i.test(text)) {
                return this._call(prompt, options, false);
            }
            throw new ProviderError(
                `NVIDIA ${res.status}: ${text.slice(0, 240) || res.statusText}`,
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
