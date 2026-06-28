// flashcardService (V3)
//
// Bundle stage — generates active-recall flashcards from the REWRITTEN
// chapter summaries. ONE AI call total per generation (V2 also did this in
// one call, but it imported the unscoped generateJson; V3 threads the
// scoped Intelligence chain through so per-generation provider health is
// respected — if Groq got disabled during chunk extraction, this call
// automatically falls through to OpenRouter without retrying Groq).
//
// Returns an array of `{ question, answer, difficulty }` objects. Difficulty
// is normalised to easy / medium / hard.

import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { flashcardsPrompt } from './shared/promptTemplates.js';

const normaliseDifficulty = (v) =>
    ['easy', 'medium', 'hard'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

/**
 * @param {Object} args
 * @param {Array<{title:string,content:string}>} args.chapters
 * @param {Object} args.settings
 * @param {number} [args.count]                        Default 12.
 * @param {{ generateJson: Function }} args.chain      Scoped intelligence chain.
 * @returns {Promise<Array<{question:string,answer:string,difficulty:string}>>}
 */
export const generateFlashcards = async ({
    chapters,
    settings,
    count = 12,
    chain,
}) => {
    if (!chapters?.length) return [];
    try {
        const raw = await chain.generateJson(
            flashcardsPrompt({ chapters, settings, count }),
            { label: 'flashcards', maxTokens: 4096, temperature: 0.6 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.flashcards);
        return list
            .filter((c) => c && c.question && c.answer)
            .slice(0, count)
            .map((c) => ({
                question: String(c.question).trim(),
                answer: String(c.answer).trim(),
                difficulty: normaliseDifficulty(c.difficulty),
            }));
    } catch (err) {
        console.error('generateFlashcards failed:', err.message);
        return [];
    }
};
