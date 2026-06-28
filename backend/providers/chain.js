// ─────────────────────────────────────────────────────────────────────────────
// providers/chain
//
// V3: factory for building provider chains. A "chain" is an ordered list of
// providers we try in priority order; the first one to succeed wins and the
// failures of the prior ones are remembered for the rest of this generation.
//
// Two chains live in production today:
//   - `defaultChain` (providers/index.js)       — NVIDIA → Gemini → Groq → OpenRouter
//   - `intelligenceChain` (providers/intelligence.js) — NVIDIA → Groq → OpenRouter
//     (Gemini deliberately skipped per the V3 spec; the rest of the app
//     keeps using Gemini through the global default chain.)
//
// The factory's runtime semantics implement four V3 requirements:
//   1. PRIORITY FALLBACK with retryable errors auto-rolling to the next
//      provider. Non-retryable errors surface immediately.
//   2. PER-GENERATION HEALTH CACHE via `chain.runScoped()`. A scope keeps a
//      `disabled` set; once a provider trips a retryable error inside a
//      scope, every later call in that same scope skips it. The cache
//      resets when the scope ends — different generations always start
//      with a clean slate.
//   3. NVIDIA-SPECIFIC 503 POLICY: if NVIDIA returns 503 we retry ONCE
//      after 10s before disabling. This handles NVIDIA's transient
//      ResourceExhausted blips without burning the rest of the chain.
//   4. INTROSPECTION: callers can read which providers are available and
//      which got disabled mid-scope (used by the SSE progress emitter).
// ─────────────────────────────────────────────────────────────────────────────

import { ProviderError } from './BaseProvider.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// V3 spec: NVIDIA 503 = retry ONCE after 10s, then disable for the rest of
// the generation. We do NOT retry beyond that — production timings are
// critical, and a second retry would risk doubling the worst-case latency.
const NVIDIA_503_RETRY_DELAY_MS = 10_000;

const is503 = (err) => {
    const status = err?.status || err?.response?.status;
    if (status === 503) return true;
    // Provider classes wrap the raw error and stash the status code in
    // err.code as 'server' for any 5xx — fall back to inspecting the
    // message for the canonical token NVIDIA returns.
    if (err?.code === 'server') {
        return /503|ResourceExhausted/i.test(err.message || '');
    }
    return false;
};

/**
 * Build a chain instance.
 *
 * @param {Array<import('./BaseProvider.js').BaseProvider>} providers
 *        Ordered list — earlier entries are tried first.
 * @param {Object} [opts]
 * @param {string} [opts.name='ai-chain']  Human-readable label for logs.
 * @returns {{
 *   generateText: (prompt: string, options?: object) => Promise<string>,
 *   generateJson: (prompt: string, options?: object) => Promise<string>,
 *   runScoped:    () => ReturnType<typeof createScope>,
 *   getStatus:    () => Array<{id: string, available: boolean}>,
 *   name:         string,
 *   providers:    typeof providers,
 * }}
 */
export const createProviderChain = (providers, opts = {}) => {
    const name = opts.name || 'ai-chain';

    // Friendly startup log so production debugging is trivial. We do this
    // lazily on first chain construction rather than at module load so the
    // env vars are guaranteed to be parsed before we inspect them.
    const enabledIds = providers.filter((p) => p.isAvailable()).map((p) => p.id);
    if (enabledIds.length === 0) {
        console.warn(
            `[${name}] No providers configured. Set at least one of: ${providers
                .map((p) => p.id)
                .join(', ')}.`
        );
    } else {
        console.log(`[${name}] Provider chain ready: ${enabledIds.join(' → ')}`);
    }

    // ── default (unscoped) chain — no per-generation disabling ────────────
    // Used by the rest of the app for one-shot AI calls that don't have a
    // longer-lived "generation" concept.
    const tryUnscoped = async (op, callLabel) => {
        const available = providers.filter((p) => p.isAvailable());
        if (!available.length) {
            throw new Error(
                `${name}: no AI providers are configured for "${callLabel}".`
            );
        }
        const errors = [];
        for (let i = 0; i < available.length; i++) {
            const provider = available[i];
            try {
                const result = await op(provider);
                if (i > 0) {
                    console.warn(
                        `[${name}] ${callLabel} succeeded on fallback "${provider.id}" after ${i} skip(s).`
                    );
                }
                return result;
            } catch (err) {
                const retryable =
                    err instanceof ProviderError ? err.retryable : false;
                errors.push({ provider: provider.id, error: err });
                if (!retryable) {
                    console.error(
                        `[${name}] ${callLabel} fatal on "${provider.id}":`,
                        err.message
                    );
                    throw err;
                }
                console.warn(
                    `[${name}] ${callLabel} on "${provider.id}" failed (${err.code || 'error'}): ${err.message}. Trying next provider…`
                );
                await sleep(150 * (i + 1));
            }
        }
        const detail = errors
            .map((e) => `${e.provider}: ${e.error.message}`)
            .join(' | ');
        const wrapped = new Error(`All providers failed for ${callLabel}. ${detail}`);
        wrapped.errors = errors;
        throw wrapped;
    };

    const generateText = (prompt, options = {}) =>
        tryUnscoped(
            (p) => p.generateText(prompt, options),
            options.label || 'generateText'
        );

    const generateJson = (prompt, options = {}) =>
        tryUnscoped(
            (p) => p.generateJson(prompt, options),
            options.label || 'generateJson'
        );

    // ── scoped runner — used by AI Intelligence per-generation ────────────
    // Each scope owns its own `disabled` Set; once a provider trips a
    // retryable error inside a scope, every subsequent call in that scope
    // skips it. This is the V3 "provider health cache" requirement.
    const createScope = () => {
        const scopeId = Math.random().toString(36).slice(2, 10);
        const disabled = new Set();
        // Track NVIDIA's "we already used our one retry" state per scope.
        const nvidiaRetryUsed = new Set();

        const tryScoped = async (op, callLabel) => {
            const available = providers.filter(
                (p) => p.isAvailable() && !disabled.has(p.id)
            );
            if (!available.length) {
                throw new Error(
                    `${name}[${scopeId}]: every provider is either unconfigured or disabled in this scope. Failed call: ${callLabel}.`
                );
            }
            const errors = [];
            for (let i = 0; i < available.length; i++) {
                const provider = available[i];
                try {
                    const result = await op(provider);
                    if (i > 0) {
                        console.warn(
                            `[${name}:${scopeId}] ${callLabel} succeeded on fallback "${provider.id}" after ${i} skip(s).`
                        );
                    }
                    return result;
                } catch (err) {
                    const retryable =
                        err instanceof ProviderError ? err.retryable : false;
                    errors.push({ provider: provider.id, error: err });

                    if (!retryable) {
                        console.error(
                            `[${name}:${scopeId}] ${callLabel} fatal on "${provider.id}":`,
                            err.message
                        );
                        throw err;
                    }

                    // V3 spec: NVIDIA 503 gets one 10s retry before being
                    // disabled. Any other failure (or NVIDIA's SECOND 503
                    // in the same scope) → disable for the rest of this
                    // generation.
                    const isNvidia = provider.id === 'nvidia';
                    if (
                        isNvidia &&
                        is503(err) &&
                        !nvidiaRetryUsed.has(provider.id)
                    ) {
                        nvidiaRetryUsed.add(provider.id);
                        console.warn(
                            `[${name}:${scopeId}] NVIDIA returned 503 on "${callLabel}". Retrying once in ${NVIDIA_503_RETRY_DELAY_MS / 1000}s…`
                        );
                        await sleep(NVIDIA_503_RETRY_DELAY_MS);
                        try {
                            const result = await op(provider);
                            console.log(
                                `[${name}:${scopeId}] NVIDIA recovered on retry for "${callLabel}".`
                            );
                            return result;
                        } catch (retryErr) {
                            console.warn(
                                `[${name}:${scopeId}] NVIDIA retry still failed for "${callLabel}": ${retryErr.message}. Disabling NVIDIA for this generation.`
                            );
                            disabled.add(provider.id);
                            errors.push({
                                provider: provider.id,
                                error: retryErr,
                            });
                            await sleep(150);
                            continue;
                        }
                    }

                    // Non-NVIDIA retryable failure → disable + move on.
                    disabled.add(provider.id);
                    console.warn(
                        `[${name}:${scopeId}] ${callLabel} on "${provider.id}" failed (${err.code || 'error'}): ${err.message}. Disabling for this generation, trying next provider…`
                    );
                    await sleep(150 * (i + 1));
                }
            }
            const detail = errors
                .map((e) => `${e.provider}: ${e.error.message}`)
                .join(' | ');
            const wrapped = new Error(
                `All providers failed for ${callLabel}. ${detail}`
            );
            wrapped.errors = errors;
            wrapped.scopeId = scopeId;
            throw wrapped;
        };

        return {
            scopeId,
            generateText: (prompt, options = {}) =>
                tryScoped(
                    (p) => p.generateText(prompt, options),
                    options.label || 'generateText'
                ),
            generateJson: (prompt, options = {}) =>
                tryScoped(
                    (p) => p.generateJson(prompt, options),
                    options.label || 'generateJson'
                ),
            /** Snapshot of provider state inside this scope. */
            getDisabledProviders: () => Array.from(disabled),
            getActiveProviders: () =>
                providers
                    .filter((p) => p.isAvailable() && !disabled.has(p.id))
                    .map((p) => p.id),
        };
    };

    return {
        name,
        providers,
        generateText,
        generateJson,
        runScoped: createScope,
        getStatus: () =>
            providers.map((p) => ({ id: p.id, available: p.isAvailable() })),
    };
};

export { ProviderError };
