// GeminiProvider — Google Gemini Flash via @google/genai.
//
// @google/genai is already a backend dep (added previously). Gemini Flash
// has a generous free tier, so this is the most natural mid-tier fallback
// between NVIDIA (premium reasoning) and Groq (token-day-limited).
//
// Activated by setting `GEMINI_API_KEY` (separate from the legacy
// placeholder that referenced Gemini in the env file; this is the real
// env var consumed by the SDK).

import { BaseProvider, ProviderError } from './BaseProvider.js';

// Tiered model routing. Flash covers fast + medium; if GEMINI_MODEL_BEST is
// provisioned we route "best" tier calls (final summary, mind map) to it,
// otherwise we fall back to Flash so nothing breaks for deploys that only
// set GEMINI_API_KEY.
const MODELS = {
    fast: process.env.GEMINI_MODEL_FAST || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    medium: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    best: process.env.GEMINI_MODEL_BEST || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
};
const DEFAULT_TIER = 'medium';

export class GeminiProvider extends BaseProvider {
    constructor() {
        super();
        this.key = process.env.GEMINI_API_KEY || '';
        this.client = null;
    }

    _modelFor(options = {}) {
        return MODELS[options.tier] || MODELS[DEFAULT_TIER];
    }

    get id() {
        return 'gemini';
    }

    isAvailable() {
        return !!this.key;
    }

    async _ensureClient() {
        if (this.client) return this.client;
        if (!this.key) {
            throw new ProviderError('GEMINI_API_KEY not configured', {
                provider: this.id,
                retryable: true,
                code: 'auth',
            });
        }
        // Imported lazily so a missing/broken @google/genai install can't
        // crash the whole AI Intelligence module at boot — only consumers
        // that actually need Gemini will fail.
        const mod = await import('@google/genai').catch((err) => {
            throw new ProviderError(
                `Failed to load @google/genai: ${err.message}. Run \`npm i\` in the backend.`,
                { provider: this.id, retryable: true, code: 'install', cause: err }
            );
        });
        const GoogleGenAI = mod.GoogleGenAI || mod.default;
        this.client = new GoogleGenAI({ apiKey: this.key });
        return this.client;
    }

    async _call(prompt, options, jsonMode) {
        const client = await this._ensureClient();
        const config = {
            temperature: options.temperature ?? 0.5,
            maxOutputTokens: options.maxTokens ?? 4096,
        };
        if (jsonMode) config.responseMimeType = 'application/json';

        try {
            const result = await client.models.generateContent({
                model: this._modelFor(options),
                contents: prompt,
                config,
            });
            // @google/genai exposes a top-level `.text` getter that flattens
            // the candidate list. Falls back to manually reaching into the
            // first candidate for older SDK versions.
            return (
                (typeof result.text === 'string' && result.text) ||
                result.candidates?.[0]?.content?.parts?.[0]?.text ||
                ''
            );
        } catch (err) {
            const msg = (err?.message || '').toLowerCase();
            const code = msg.includes('rate')
                ? 'rate_limit'
                : msg.includes('quota') || msg.includes('exceeded')
                ? 'rate_limit'
                : msg.includes('auth') || msg.includes('api key')
                ? 'auth'
                : 'error';
            throw new ProviderError(`Gemini call failed: ${err.message}`, {
                provider: this.id,
                retryable: true,
                code,
                cause: err,
            });
        }
    }

    async generateText(prompt, options = {}) {
        return this._call(prompt, options, false);
    }

    async generateJson(prompt, options = {}) {
        return this._call(prompt, options, true);
    }
}
