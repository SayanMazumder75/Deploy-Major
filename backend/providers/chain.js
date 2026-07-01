// ─────────────────────────────────────────────────────────────────────────────
// providers/chain
//
// V4: factory for building provider chains. A "chain" is an ordered list of
// providers we try in priority order; the first one to succeed wins.
//
// Two chains live in production today:
//   - `defaultChain` (providers/index.js)       — NVIDIA → Gemini → Groq → OpenRouter
//   - `intelligenceChain` (providers/intelligence.js) — NVIDIA → Gemini → Groq → OpenRouter
//
// V4 replaces V3's "disable for the rest of the generation" behaviour with
// a per-provider COOLDOWN. This was causing every later AI Intelligence
// stage to fail once Groq hit its first 429, because Groq (the workhorse
// provider) got permanently benched for the rest of that run even though
// its 429 is almost always a short-lived per-minute limit.
//
//   429 / rate-limit
//     ↓
//   provider put on a short cooldown (NOT disabled)
//     ↓
//   next call skips it while on cooldown, tries the next provider
//     ↓
//   cooldown expires → provider becomes eligible again, even within the
//   SAME generation/scope
//
// Cooldown state lives at the CHAIN level (shared by every scope AND the
// unscoped path) because a 429 is a fact about the provider's real quota,
// not about "this particular generation" — a fictional per-scope memory
// was the root cause of the bug.
//
// Requirements implemented:
//   1. PRIORITY FALLBACK with retryable errors rolling to the next
//      available (not-on-cooldown) provider. Non-retryable errors surface
//      immediately.
//   2. PER-PROVIDER COOLDOWN, configurable per provider id. Default is a
//      short cooldown; Groq defaults to 30s since it's the provider most
//      likely to hit a per-minute token cap on a big pipeline run.
//   3. BOUNDED WAIT-AND-RETRY: if every configured provider is temporarily
//      on cooldown (not permanently unavailable), the chain waits for the
//      soonest cooldown to expire (capped) and retries once instead of
//      failing the whole stage.
//   4. NVIDIA-SPECIFIC 503 POLICY: one retry after 10s before the normal
//      cooldown kicks in — unchanged from V3.
//   5. INTROSPECTION: callers can read which providers are currently on
//      cooldown vs active (used by the SSE progress emitter).
//   6. LIGHTWEIGHT RESPONSE CACHE: identical (prompt + tier + label) calls
//      within a short TTL are served from memory instead of re-hitting a
//      provider. This is a big chunk of the "reduce AI calls by 70%" and
//      "never summarize the same content twice" token-optimisation goals,
//      implemented once here instead of in every calling service.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import { ProviderError } from './BaseProvider.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── per-provider cooldown config ────────────────────────────────────────────
// Overridable via env so a deploy can tune this without a code change.
// "Immediately available" from the spec == 0ms cooldown (the provider is
// eligible again on the very next call; it only sits out the CURRENT
// fallback pass).
const DEFAULT_COOLDOWN_MS = {
    groq: Number(process.env.GROQ_COOLDOWN_MS) || 30_000,
    gemini: Number(process.env.GEMINI_COOLDOWN_MS) || 0,
    nvidia: Number(process.env.NVIDIA_COOLDOWN_MS) || 0,
    openrouter: Number(process.env.OPENROUTER_COOLDOWN_MS) || 0,
};
const FALLBACK_COOLDOWN_MS = 5_000; // any provider id not listed above

// If every provider is on cooldown, how long we're willing to sit and wait
// for the soonest one to free up before giving up entirely. Keeps a stuck
// generation from hanging forever while still honouring "later reuse Groq".
const MAX_WAIT_FOR_COOLDOWN_MS = 20_000;

// V3 spec carried forward: NVIDIA 503 = retry ONCE after 10s before the
// normal cooldown applies.
const NVIDIA_503_RETRY_DELAY_MS = 10_000;

const is503 = (err) => {
    const status = err?.status || err?.response?.status;
    if (status === 503) return true;
    if (err?.code === 'server') {
        return /503|ResourceExhausted/i.test(err.message || '');
    }
    return false;
};

// ── response cache ──────────────────────────────────────────────────────────
// Small in-memory LRU-ish cache. Keyed on a hash of the exact prompt + tier
// + call label, so two different stages asking about the same chunk don't
// collide, but the SAME stage re-run on the SAME content (e.g. a retried
// stage, or "regenerate" re-processing an unchanged chunk) is served from
// memory instead of spending another provider call.
const CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS) || 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const responseCache = new Map(); // key -> { value, expiresAt }

const cacheKeyFor = (prompt, options) =>
    crypto
        .createHash('sha256')
        .update(`${options.label || ''}::${options.tier || ''}::${prompt}`)
        .digest('hex');

const cacheGet = (key) => {
    const hit = responseCache.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
        responseCache.delete(key);
        return undefined;
    }
    return hit.value;
};

const cacheSet = (key, value) => {
    if (responseCache.size >= CACHE_MAX_ENTRIES) {
        // Evict the oldest entry (Map preserves insertion order).
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey !== undefined) responseCache.delete(oldestKey);
    }
    responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Build a chain instance.
 *
 * @param {Array<import('./BaseProvider.js').BaseProvider>} providers
 * @param {Object} [opts]
 * @param {string} [opts.name='ai-chain']
 * @returns {{
 *   generateText: (prompt: string, options?: object) => Promise<string>,
 *   generateJson: (prompt: string, options?: object) => Promise<string>,
 *   runScoped:    () => ReturnType<typeof createScope>,
 *   getStatus:    () => Array<{id: string, available: boolean, cooldownMsRemaining: number}>,
 *   name:         string,
 *   providers:    typeof providers,
 * }}
 */
export const createProviderChain = (providers, opts = {}) => {
    const name = opts.name || 'ai-chain';

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

    // ── cooldown state — shared across every scope + the unscoped path ────
    const cooldownUntil = new Map(); // providerId -> epoch ms
    const nvidiaRetryUsed = new Set(); // reset per-process; NVIDIA 503 blips are rare

    const cooldownFor = (providerId) => DEFAULT_COOLDOWN_MS[providerId] ?? FALLBACK_COOLDOWN_MS;

    const putOnCooldown = (providerId, ms) => {
        cooldownUntil.set(providerId, Date.now() + ms);
    };

    const remainingCooldown = (providerId) => {
        const until = cooldownUntil.get(providerId) || 0;
        return Math.max(0, until - Date.now());
    };

    const isOnCooldown = (providerId) => remainingCooldown(providerId) > 0;

    const availableNow = () => providers.filter((p) => p.isAvailable() && !isOnCooldown(p.id));

    // Providers that are configured but currently cooling down — used to
    // decide whether a bounded wait-and-retry is worthwhile.
    const coolingDownConfigured = () =>
        providers.filter((p) => p.isAvailable() && isOnCooldown(p.id));

    /**
     * Try every currently-available provider in order for a single logical
     * call. If all configured providers are on cooldown (rather than
     * genuinely unconfigured), wait for the soonest cooldown to expire
     * (capped) and try once more before giving up.
     */
    const attempt = async (op, callLabel, { allowWait = true } = {}) => {
        const available = availableNow();

        if (!available.length) {
            const cooling = coolingDownConfigured();
            if (allowWait && cooling.length) {
                const soonest = Math.min(...cooling.map((p) => remainingCooldown(p.id)));
                const wait = Math.min(soonest, MAX_WAIT_FOR_COOLDOWN_MS);
                console.warn(
                    `[${name}] ${callLabel}: every provider on cooldown, waiting ${wait}ms for the soonest to free up…`
                );
                await sleep(wait);
                return attempt(op, callLabel, { allowWait: false });
            }
            throw new Error(
                `${name}: no AI providers are available for "${callLabel}" (configured: ${
                    providers.map((p) => p.id).join(', ') || 'none'
                }).`
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
                const retryable = err instanceof ProviderError ? err.retryable : false;
                errors.push({ provider: provider.id, error: err });

                if (!retryable) {
                    console.error(`[${name}] ${callLabel} fatal on "${provider.id}":`, err.message);
                    throw err;
                }

                // NVIDIA 503 → one retry after 10s before cooling down.
                if (provider.id === 'nvidia' && is503(err) && !nvidiaRetryUsed.has(callLabel + i)) {
                    nvidiaRetryUsed.add(callLabel + i);
                    console.warn(
                        `[${name}] NVIDIA 503 on "${callLabel}". Retrying once in ${
                            NVIDIA_503_RETRY_DELAY_MS / 1000
                        }s…`
                    );
                    await sleep(NVIDIA_503_RETRY_DELAY_MS);
                    try {
                        return await op(provider);
                    } catch (retryErr) {
                        console.warn(
                            `[${name}] NVIDIA retry still failed for "${callLabel}": ${retryErr.message}. Cooling down.`
                        );
                        putOnCooldown(provider.id, cooldownFor(provider.id) || 15_000);
                        errors.push({ provider: provider.id, error: retryErr });
                        continue;
                    }
                }

                // Normal case: put the provider on cooldown (NOT a permanent
                // disable) and fall through to the next one in `available`.
                const ms = cooldownFor(provider.id);
                putOnCooldown(provider.id, ms);
                console.warn(
                    `[${name}] ${callLabel} on "${provider.id}" failed (${err.code || 'error'}): ${
                        err.message
                    }. Cooling down for ${ms}ms, trying next provider…`
                );
                await sleep(150 * (i + 1));
            }
        }

        // Every currently-available provider failed this pass. If some
        // OTHER configured providers are cooling down (e.g. they were
        // already on cooldown before this call started), it's worth a
        // bounded wait rather than failing outright — Groq's 30s cooldown
        // is short enough that later stages in the same generation should
        // get to reuse it.
        const cooling = coolingDownConfigured();
        if (allowWait && cooling.length) {
            const soonest = Math.min(...cooling.map((p) => remainingCooldown(p.id)));
            const wait = Math.min(soonest, MAX_WAIT_FOR_COOLDOWN_MS);
            console.warn(
                `[${name}] ${callLabel}: all attempted providers failed, waiting ${wait}ms for cooldown to clear…`
            );
            await sleep(wait);
            return attempt(op, callLabel, { allowWait: false });
        }

        const detail = errors.map((e) => `${e.provider}: ${e.error.message}`).join(' | ');
        const wrapped = new Error(`All providers failed for ${callLabel}. ${detail}`);
        wrapped.errors = errors;
        throw wrapped;
    };

    const withCache = async (prompt, options, op, callLabel) => {
        // Caching is opt-out via options.noCache — a couple of call sites
        // (e.g. "ask" Q&A, which is intentionally non-deterministic per
        // question) may want that, though most benefit from it by default.
        if (options.noCache) return attempt(op, callLabel);

        const key = cacheKeyFor(prompt, options);
        const cached = cacheGet(key);
        if (cached !== undefined) {
            console.log(`[${name}] ${callLabel}: served from cache (no provider call).`);
            return cached;
        }
        const result = await attempt(op, callLabel);
        cacheSet(key, result);
        return result;
    };

    const generateText = (prompt, options = {}) =>
        withCache(prompt, options, (p) => p.generateText(prompt, options), options.label || 'generateText');

    const generateJson = (prompt, options = {}) =>
        withCache(prompt, options, (p) => p.generateJson(prompt, options), options.label || 'generateJson');

    // ── scoped runner ───────────────────────────────────────────────────
    // Kept for API compatibility with the pipeline (which threads one
    // `chain` object through every stage of a generation) and for the
    // introspection the SSE progress emitter reads. Cooldown state is
    // shared at the chain level now (see rationale above), so a "scope"
    // no longer maintains its own disabled-set — it's a thin view over
    // the same chain.
    const createScope = () => {
        const scopeId = Math.random().toString(36).slice(2, 10);
        return {
            scopeId,
            generateText,
            generateJson,
            getDisabledProviders: () =>
                providers.filter((p) => p.isAvailable() && isOnCooldown(p.id)).map((p) => p.id),
            getActiveProviders: () => availableNow().map((p) => p.id),
        };
    };

    return {
        name,
        providers,
        generateText,
        generateJson,
        runScoped: createScope,
        getStatus: () =>
            providers.map((p) => ({
                id: p.id,
                available: p.isAvailable() && !isOnCooldown(p.id),
                cooldownMsRemaining: remainingCooldown(p.id),
            })),
    };
};

export { ProviderError };
