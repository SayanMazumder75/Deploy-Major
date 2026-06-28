// flashcardService
//
// Bundle stage: generate active-recall flashcards FROM the polished
// chapter summaries (NOT from the raw source text — using the already-
// summarised content keeps cards focused on the high-yield material).
//
// Returns an array of `{ question, answer, difficulty }` objects. Difficulty
// is normalised to easy / medium / hard.

import { generateJson } from '../providers/index.js';
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
 * @param {number} [args.count]  Default 12 — tuneable per call site.
 * @returns {Promise<Array<{question:string,answer:string,difficulty:string}>>}
 */
export const generateFlashcards = async ({ chapters, settings, count = 12 }) => {
    if (!chapters?.length) return [];
    try {
        const raw = await generateJson(
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
