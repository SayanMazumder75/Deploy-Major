// vivaService
//
// Bundle stage: generate viva-style oral-exam questions from the polished
// chapter summaries. Each item has `question`, `expectedAnswer`, and a
// normalised difficulty.
//
// Note: this is the AI-Intelligence-LOCAL viva bundle. The existing
// /api/ai/viva endpoint (which drives the Voice Tutor on the Documents
// page) is a separate feature with conversational state and is unchanged.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { vivaPrompt } from './shared/promptTemplates.js';

const normaliseDifficulty = (v) =>
    ['easy', 'medium', 'hard'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

export const generateVivaQuestions = async ({ chapters, settings, count = 10 }) => {
    if (!chapters?.length) return [];
    try {
        const raw = await generateJson(
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
