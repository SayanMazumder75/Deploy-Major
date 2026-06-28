// quizService (V3)
//
// Bundle stage — generates an MCQ practice quiz from the rewritten chapter
// summaries. ONE AI call total per generation. Receives the scoped
// Intelligence chain from the orchestrator so per-generation provider
// health is respected.

import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { quizPrompt } from './shared/promptTemplates.js';

const normaliseDifficulty = (v) =>
    ['easy', 'medium', 'hard'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

export const generateQuiz = async ({
    chapters,
    settings,
    count = 8,
    chain,
}) => {
    if (!chapters?.length) return [];
    try {
        const raw = await chain.generateJson(
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
                // Trust correctIndex if it's in range; otherwise derive
                // from correctAnswer's text match against options. Failing
                // both, default to 0 — never undefined, so the UI can
                // always render *something*.
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
                if (correctIndex === -1) correctIndex = 0;
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
