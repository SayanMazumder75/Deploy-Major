// vivaService (V3)
//
// Bundle stage — generates viva-style oral-exam questions from the
// rewritten chapter summaries. ONE AI call per generation, using the
// scoped Intelligence chain.

import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { vivaPrompt } from './shared/promptTemplates.js';

const normaliseDifficulty = (v) =>
    ['easy', 'medium', 'hard'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

export const generateVivaQuestions = async ({
    chapters,
    settings,
    count = 10,
    chain,
}) => {
    if (!chapters?.length) return [];
    try {
        const raw = await chain.generateJson(
            vivaPrompt({ chapters, settings, count }),
            { label: 'viva', maxTokens: 4096, temperature: 0.6 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.vivaQuestions);
        return list
            .filter((v) => v && v.question && v.expectedAnswer)
            .slice(0, count)
            .map((v) => ({
                question: String(v.question).trim(),
                expectedAnswer: String(v.expectedAnswer).trim(),
                difficulty: normaliseDifficulty(v.difficulty),
            }));
    } catch (err) {
        console.error('generateVivaQuestions failed:', err.message);
        return [];
    }
};
