import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, HelpCircle, RotateCcw, Trophy } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// QuizView
//
// Sequential single-question quiz UI. Each question shows 4 options; on
// select, the chosen + correct options are revealed and an explanation
// appears below. After the last question, a small "score" summary is shown
// with a reset button.
//
// Mirrors the conventions in the existing /pages/Quizzes/QuizTakePage so
// users get a consistent feel between the two surfaces.
// ─────────────────────────────────────────────────────────────────────────────

const QuizView = ({ quiz = [] }) => {
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { [questionIndex]: chosenOptionIndex }

    if (!quiz.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No quiz was generated for this summary.
            </div>
        );
    }

    const total = quiz.length;
    const allAnswered = Object.keys(answers).length === total;
    const correctCount = quiz.reduce(
        (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
        0
    );

    if (allAnswered && index >= total) {
        // Score summary screen.
        const pct = Math.round((correctCount / total) * 100);
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 to-pink-50 p-6 text-center"
            >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Trophy className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-violet-700 mb-1">
                    Quiz Complete!
                </h3>
                <p className="text-sm text-purple-500/80 mb-4">
                    You scored {correctCount} of {total} ({pct}%)
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setAnswers({});
                        setIndex(0);
                    }}
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold shadow shadow-purple-500/25 active:scale-[0.98]"
                >
                    <RotateCcw className="w-4 h-4" strokeWidth={2.4} />
                    Retake Quiz
                </button>
            </motion.div>
        );
    }

    const q = quiz[index];
    const chosen = answers[index];
    const answered = typeof chosen === 'number';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <HelpCircle className="w-4 h-4 text-purple-500" strokeWidth={2.2} />
                    Question {index + 1} of {total}
                </div>
                {answered && (
                    <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            chosen === q.correctIndex
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                    >
                        {chosen === q.correctIndex ? 'CORRECT' : 'INCORRECT'}
                    </span>
                )}
            </div>

            <div className="rounded-2xl border border-purple-200/60 bg-white/90 p-5">
                <p className="text-base font-semibold text-violet-700 leading-snug mb-4">
                    {q.question}
                </p>

                <div className="space-y-2">
                    {q.options.map((opt, i) => {
                        const isChosen = chosen === i;
                        const isCorrect = i === q.correctIndex;
                        let stateClasses =
                            'bg-white border-purple-200/60 hover:border-purple-300 hover:bg-purple-50/50';
                        if (answered) {
                            if (isCorrect) {
                                stateClasses =
                                    'bg-emerald-50 border-emerald-300 text-emerald-800';
                            } else if (isChosen) {
                                stateClasses =
                                    'bg-rose-50 border-rose-300 text-rose-800';
                            } else {
                                stateClasses = 'bg-white border-purple-100/60 opacity-60';
                            }
                        }
                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={answered}
                                onClick={() => setAnswers((a) => ({ ...a, [index]: i }))}
                                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${stateClasses} disabled:cursor-default`}
                            >
                                <span
                                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                        answered && isCorrect
                                            ? 'bg-emerald-500 text-white'
                                            : answered && isChosen
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-purple-100 text-purple-600 group-hover:bg-purple-200'
                                    }`}
                                >
                                    {answered && isCorrect ? (
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : answered && isChosen ? (
                                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : (
                                        String.fromCharCode(65 + i)
                                    )}
                                </span>
                                <span className="flex-1">{opt}</span>
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {answered && q.explanation && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 px-4 py-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50">
                                <p className="text-[11px] uppercase tracking-wide font-bold text-purple-600 mb-1">
                                    Why
                                </p>
                                <p className="text-sm text-violet-800">{q.explanation}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={index === 0}
                    className="px-4 py-2 rounded-xl border border-purple-200/60 bg-white/70 hover:bg-purple-50 text-sm font-semibold text-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <span className="text-xs text-purple-500/80 tabular-nums">
                    {Object.keys(answers).length} / {total} answered ·{' '}
                    {correctCount} correct
                </span>
                <button
                    type="button"
                    onClick={() => setIndex((i) => i + 1)}
                    disabled={!answered}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold shadow shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {index === total - 1 ? 'See Score' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default QuizView;
