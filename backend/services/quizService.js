// quizService
//
// Bundle stage: generate a multiple-choice quiz from the polished chapter
// summaries. Each question has 4 options + correctIndex + correctAnswer
// (kept redundantly so the frontend can render either by index or by
// exact-string lookup without re-deriving) + explanation + difficulty.
//
// Defensive validation: any question missing exactly 4 options or with an
// out-of-range correctIndex is dropped, since rendering them would be
// confusing.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { quizPrompt } from './shared/promptTemplates.js';

const normaliseDifficulty = (v) =>
    ['easy', 'medium', 'hard'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

export const generateQuiz = async ({ chapters, settings, count = 8 }) => {
    if (!chapters?.length) return [];
    try {
        const raw = await generateJson(
            quizPrompt({ chapters, settings, count }),
            { label: 'quiz', maxTokens: 4096, temperature: 0.5 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.quiz);
        return list
            .filter(
                (q) =>
                    q &&
                    q.question &&
                    Array.isArray(q.options) &&
                    q.options.length === 4
            )
            .slice(0, count)
            .map((q) => {
                // Trust correctIndex if it's in range; otherwise derive from
                // correctAnswer's text match against options.
                let correctIndex =
                    typeof q.correctIndex === 'number' &&
                    q.correctIndex >= 0 &&
                    q.correctIndex < 4
                        ? q.correctIndex
                        : -1;
                if (correctIndex === -1 && q.correctAnswer) {
                    const idx = q.options.findIndex(
                        (o) =>
                            String(o).trim().toLowerCase() ===
                            String(q.correctAnswer).trim().toLowerCase()
                    );
                    if (idx !== -1) correctIndex = idx;
                }
                if (correctIndex === -1) correctIndex = 0; // never undefined
                return {
                    question: String(q.question).trim(),
                    options: q.options.map((o) => String(o).trim()),
                    correctIndex,
                    correctAnswer: q.options[correctIndex],
                    explanation: q.explanation || '',
                    difficulty: normaliseDifficulty(q.difficulty),
                };
            });
    } catch (err) {
        console.error('generateQuiz failed:', err.message);
        return [];
    }
};
