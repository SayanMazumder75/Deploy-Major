// ─────────────────────────────────────────────────────────────────────────────
// Provider chain
//
// Single entry point for the AI Document Intelligence module to talk to any
// language model. The chain tries providers in priority order; a retryable
// failure on one (quota / rate-limit / auth / network) automatically rolls
// to the next so a single bad quota never bricks the user's experience.
//
// Priority (from the V2 spec):
//   1. NVIDIA Nemotron Ultra   (premium reasoning)
//   2. Gemini Flash            (good free-tier fallback)
//   3. Groq llama-3.3-70b      (existing infrastructure)
//   4. OpenRouter              (last-resort safety net)
//
// Only providers that have an API key set in the environment participate;
// the rest are skipped silently. This makes the chain a no-op for deploys
// that only have a single provider configured (the usual case today).
// ─────────────────────────────────────────────────────────────────────────────

import { ProviderError } from './BaseProvider.js';
import { NvidiaProvider } from './NvidiaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';

// Instantiated once, at module load. Cheap — none of the constructors fire
// real network calls; clients are built lazily on first use.
const ALL_PROVIDERS = [
    new NvidiaProvider(),
    new GeminiProvider(),
    new GroqProvider(),
    new OpenRouterProvider(),
];

// Helpful one-shot startup log so production debugging is trivial.
const enabledIds = ALL_PROVIDERS.filter((p) => p.isAvailable()).map((p) => p.id);
if (enabledIds.length === 0) {
    console.warn(
        '[AI Intelligence] No providers configured. Set at least one of: NVIDIA_API_KEY, GEMINI_API_KEY, GROQ_API_KEY/GROQ_API_KEY2, OPENROUTER_API_KEY.'
    );
} else {
    console.log(
        `[AI Intelligence] Provider chain ready: ${enabledIds.join(' → ')}`
    );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Walk the priority list, attempting `op(provider)` against each provider
 * that is available. The first non-throwing result wins. Retryable
 * ProviderErrors roll to the next provider; non-retryable / unknown errors
 * are surfaced immediately.
 *
 * Adds a tiny exponential backoff between attempts so a rate-limit storm
 * doesn't hammer the next provider in line within the same millisecond.
 *
 * @template T
 * @param {(p: import('./BaseProvider.js').BaseProvider) => Promise<T>} op
 * @param {{ label?: string }} [opts]
 * @returns {Promise<T>}
 */
const tryChain = async (op, opts = {}) => {
    const label = opts.label || 'generate';
    const available = ALL_PROVIDERS.filter((p) => p.isAvailable());
    if (!available.length) {
        throw new Error(
            'AI Document Intelligence: no AI providers are configured. Set at least one API key in the backend environment.'
        );
    }

    const errors = [];
    for (let i = 0; i < available.length; i++) {
        const provider = available[i];
        try {
            const result = await op(provider);
            // Only log the first non-default provider being used so we can
            // monitor "did we end up on the fallback path?" without spamming
            // logs in steady-state.
            if (i > 0) {
                console.warn(
                    `[AI Intelligence] ${label} succeeded on fallback provider "${provider.id}" after ${i} skip(s).`
                );
            }
            return result;
        } catch (err) {
            const isRetryable =
                err instanceof ProviderError ? err.retryable : false;
            errors.push({ provider: provider.id, error: err });

            // Non-retryable -> bail out, this is a real bug not a quota issue.
            if (!isRetryable) {
                console.error(
                    `[AI Intelligence] ${label} fatal error on "${provider.id}":`,
                    err.message
                );
                throw err;
            }
            console.warn(
                `[AI Intelligence] ${label} on "${provider.id}" failed (${err.code || 'error'}): ${err.message}. Trying next provider…`
            );
            // Small backoff so we don't slam the next provider mid-storm.
            await sleep(150 * (i + 1));
        }
    }

    // All providers failed. Bundle the errors so the caller can see what
    // happened on each one.
    const detail = errors
        .map((e) => `${e.provider}: ${e.error.message}`)
        .join(' | ');
    const wrapped = new Error(
        `All AI providers failed for ${label}. ${detail}`
    );
    wrapped.errors = errors;
    throw wrapped;
};

/**
 * Free-form text generation via the chain.
 * @param {string} prompt
 * @param {import('./BaseProvider.js').GenerateOptions & { label?: string }} [options]
 * @returns {Promise<string>}
 */
export const generateText = (prompt, options = {}) =>
    tryChain((p) => p.generateText(prompt, options), {
        label: options.label || 'generateText',
    });

/**
 * Structured JSON generation via the chain. Returns the raw JSON-shaped
 * string; consumers should still defend with `safeParseJson`.
 * @param {string} prompt
 * @param {import('./BaseProvider.js').GenerateOptions & { label?: string }} [options]
 * @returns {Promise<string>}
 */
export const generateJson = (prompt, options = {}) =>
    tryChain((p) => p.generateJson(prompt, options), {
        label: options.label || 'generateJson',
    });

/**
 * Introspection helper used by the controller's "settings" endpoint and
 * by SSE progress events so the UI can show which provider is currently
 * serving the request.
 */
export const getProviderChainStatus = () =>
    ALL_PROVIDERS.map((p) => ({ id: p.id, available: p.isAvailable() }));

// Re-exports so consumers can `import { ProviderError } from '../providers'`.
export { ProviderError };
