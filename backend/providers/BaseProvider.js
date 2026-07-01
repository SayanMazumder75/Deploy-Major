// ─────────────────────────────────────────────────────────────────────────────
// BaseProvider
//
// Abstract interface every concrete AI provider must implement. Keeping the
// surface deliberately narrow — `generateText` + `generateJson` — lets the
// rest of the codebase reason about AI calls without caring whether the
// answer is coming from NVIDIA Nemotron, Gemini, Groq, or OpenRouter.
//
// Concrete implementations live next to this file:
//   NvidiaProvider.js     (build.nvidia.com NIM, OpenAI-compatible REST)
//   GeminiProvider.js     (@google/genai SDK)
//   GroqProvider.js       (groq-sdk; reads GROQ_API_KEY2 with fallback)
//   OpenRouterProvider.js (openrouter.ai REST)
//
// And the priority chain lives in ./index.js.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GenerateOptions
 * @property {number} [maxTokens]      Defaults to 4096.
 * @property {number} [temperature]    Defaults to 0.5 (study material is mostly
 *                                     factual — we keep this on the lower end).
 * @property {AbortSignal} [signal]    Optional abort signal.
 * @property {'fast'|'medium'|'best'} [tier]
 *                                     Model routing hint. Every concrete
 *                                     provider maps this to one of its own
 *                                     models via a `_modelFor(options)`
 *                                     helper; providers without distinct
 *                                     tiers just map all three to the same
 *                                     model. Routing table:
 *                                       fast   → chunk extraction / summaries
 *                                       medium → chapter merge, flashcards, quiz
 *                                       best   → final summary, mind map
 *                                     Default (unset) behaves as 'medium'.
 * @property {string}  [label]        Human-readable call label for logs.
 * @property {boolean} [noCache]      Skip the chain-level response cache
 *                                     (see providers/chain.js) for calls
 *                                     that must not be memoised, e.g. "ask".
 */

export class BaseProvider {
    /** Human-readable id used in logs and error messages. */
    get id() {
        return 'base';
    }

    /**
     * True if this provider has a usable API key in the environment. Used by
     * the chain to decide whether to even attempt a call — keeps logs clean
     * for "I haven't provisioned NVIDIA yet" environments.
     */
    isAvailable() {
        return false;
    }

    /**
     * Generate a free-form text completion.
     * @param {string} _prompt
     * @param {GenerateOptions} [_options]
     * @returns {Promise<string>}
     */
    // eslint-disable-next-line no-unused-vars
    async generateText(_prompt, _options) {
        throw new Error(`${this.id}: generateText() not implemented`);
    }

    /**
     * Generate a JSON object response. Implementations should set
     * `response_format: { type: 'json_object' }` (or the provider's
     * equivalent) when the provider supports structured output natively.
     * Otherwise they should fall back to plain text and let the caller
     * parse it via `safeParseJson`.
     *
     * @param {string} prompt
     * @param {GenerateOptions} [options]
     * @returns {Promise<string>} Raw JSON-shaped string (still needs parsing).
     */
    async generateJson(prompt, options) {
        return this.generateText(prompt, options);
    }
}

/**
 * Quota / rate-limit / auth errors should throw a `ProviderError` so the
 * chain can decide whether to fall back to the next provider. Generic
 * Error instances are treated as fatal and surfaced to the caller.
 */
export class ProviderError extends Error {
    /**
     * @param {string} message
     * @param {Object} [opts]
     * @param {string} [opts.provider]
     * @param {boolean} [opts.retryable]  Whether the chain should try the next provider.
     * @param {string} [opts.code]        e.g. 'rate_limit' / 'quota' / 'auth'.
     * @param {Error}  [opts.cause]
     */
    constructor(message, opts = {}) {
        super(message);
        this.name = 'ProviderError';
        this.provider = opts.provider || 'unknown';
        this.retryable = opts.retryable !== false; // default true
        this.code = opts.code || 'error';
        if (opts.cause) this.cause = opts.cause;
    }
}
