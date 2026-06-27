// ─────────────────────────────────────────────────────────────────────────────
// groqIntelligenceClient
//
// A dedicated Groq client for the AI Document Intelligence module. Uses a
// SEPARATE API key (`GROQ_API_KEY2`) so the heavy multi-stage summarisation
// pipeline doesn't burn through the primary `GROQ_API_KEY` token-per-day
// budget that powers flashcards / quizzes / chat / viva / etc.
//
// Resolution order for the key:
//   1. process.env.GROQ_API_KEY2  ← preferred (the dedicated key)
//   2. process.env.GROQ_API_KEY   ← fallback so local dev works without
//                                   provisioning a second key
//
// If both are missing the module logs a warning at startup but does NOT
// exit the process — the primary `geminiService.js` already enforces that
// constraint at boot, so by the time we reach this code we know at least
// one key exists for the rest of the app. We only refuse to call Groq from
// here if literally no key is available.
//
// Everything below mirrors the `rawGenerate` helper in geminiService.js so
// the call sites can swap the import path without changing their shape.
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const RESOLVED_KEY = process.env.GROQ_API_KEY2 || process.env.GROQ_API_KEY || '';
const USING_DEDICATED_KEY = !!process.env.GROQ_API_KEY2;

if (!RESOLVED_KEY) {
    console.warn(
        '[AI Intelligence] No Groq API key found (GROQ_API_KEY2 and GROQ_API_KEY are both empty). ' +
            'AI Document Intelligence generation calls will fail until a key is set.'
    );
} else if (USING_DEDICATED_KEY) {
    console.log('[AI Intelligence] Using dedicated GROQ_API_KEY2 for summarisation.');
} else {
    console.log(
        '[AI Intelligence] GROQ_API_KEY2 not set — falling back to primary GROQ_API_KEY. ' +
            'Set GROQ_API_KEY2 in the backend env to use a dedicated key.'
    );
}

// We instantiate the SDK lazily-but-once. If RESOLVED_KEY is empty we still
// create the client with an empty string so import-side code doesn't crash;
// the actual API call will then fail with a clear authentication error
// instead of a cryptic undefined-key error.
const groq = new Groq({ apiKey: RESOLVED_KEY || 'missing' });

const MODEL = 'llama-3.3-70b-versatile';

/**
 * Single-shot text generation against the AI Intelligence Groq account.
 * Drop-in replacement for `rawGenerate` from `geminiService.js`.
 *
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
export const rawGenerate = async (prompt, maxTokens = 4096) => {
    if (!RESOLVED_KEY) {
        throw new Error(
            'AI Document Intelligence is not configured: set GROQ_API_KEY2 (or GROQ_API_KEY) in the backend environment.'
        );
    }
    const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens,
    });
    return completion.choices[0].message.content;
};

// Convenience flag the rest of the codebase can read for debug endpoints.
export const isUsingDedicatedIntelligenceKey = USING_DEDICATED_KEY;
