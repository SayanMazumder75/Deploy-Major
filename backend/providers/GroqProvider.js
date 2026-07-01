// GroqProvider — Groq's llama-3.3-70b-versatile via the official SDK.
//
// Reads `GROQ_API_KEY2` first (the dedicated AI-Intelligence key), then
// falls back to the primary `GROQ_API_KEY` so local dev works without
// provisioning a second key. This is the same resolution logic that the
// (now-superseded) `groqIntelligenceClient.js` used.

import Groq from 'groq-sdk';
import { BaseProvider, ProviderError } from './BaseProvider.js';

// Tiered model routing (see providers/BaseProvider.js for the tier
// contract). Groq's 8b model is fast + cheap on tokens for high-volume,
// low-stakes calls (per-chunk extraction); the 70b model is reserved for
// calls where quality actually matters (merges, flashcards/quiz, rewrite).
const MODELS = {
    fast: process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant',
    medium: process.env.GROQ_MODEL_MEDIUM || 'llama-3.3-70b-versatile',
    best: process.env.GROQ_MODEL_BEST || 'llama-3.3-70b-versatile',
};
const DEFAULT_TIER = 'medium';

export class GroqProvider extends BaseProvider {
    constructor() {
        super();
        this.key = process.env.GROQ_API_KEY2 || process.env.GROQ_API_KEY || '';
        this.usingDedicatedKey = !!process.env.GROQ_API_KEY2;
        // `client` is created lazily on first call so a bad/missing key only
        // surfaces at the point of use, not at module import time.
        this.client = null;
    }

    _modelFor(options = {}) {
        return MODELS[options.tier] || MODELS[DEFAULT_TIER];
    }

    get id() {
        return 'groq';
    }

    isAvailable() {
        return !!this.key;
    }

    _ensureClient() {
        if (!this.client) {
            if (!this.key) {
                throw new ProviderError('Groq API key not configured', {
                    provider: this.id,
                    retryable: false,
                    code: 'auth',
                });
            }
            this.client = new Groq({ apiKey: this.key });
        }
        return this.client;
    }

    async generateText(prompt, options = {}) {
        const client = this._ensureClient();
        try {
            const completion = await client.chat.completions.create({
                model: this._modelFor(options),
                messages: [{ role: 'user', content: prompt }],
                temperature: options.temperature ?? 0.5,
                max_tokens: options.maxTokens ?? 4096,
            });
            return completion.choices[0]?.message?.content || '';
        } catch (err) {
            // Groq SDK throws errors with `.status` for HTTP failures. 429 +
            // 402 are retryable from the chain's point of view (quota / rate
            // limit); 401/403 are auth failures and *also* retryable — the
            // user's other providers might still work.
            const status = err?.status || err?.response?.status;
            const code =
                status === 429
                    ? 'rate_limit'
                    : status === 401 || status === 403
                    ? 'auth'
                    : 'error';
            throw new ProviderError(`Groq call failed: ${err.message}`, {
                provider: this.id,
                retryable: true,
                code,
                cause: err,
            });
        }
    }

    async generateJson(prompt, options = {}) {
        const client = this._ensureClient();
        try {
            const completion = await client.chat.completions.create({
                model: this._modelFor(options),
                messages: [{ role: 'user', content: prompt }],
                temperature: options.temperature ?? 0.4,
                max_tokens: options.maxTokens ?? 4096,
                // Groq supports OpenAI-style structured output. Using it
                // dramatically reduces parse failures on the merge stage.
                response_format: { type: 'json_object' },
            });
            return completion.choices[0]?.message?.content || '';
        } catch (err) {
            const status = err?.status || err?.response?.status;
            const code =
                status === 429
                    ? 'rate_limit'
                    : status === 401 || status === 403
                    ? 'auth'
                    : 'error';
            throw new ProviderError(`Groq JSON call failed: ${err.message}`, {
                provider: this.id,
                retryable: true,
                code,
                cause: err,
            });
        }
    }
}
