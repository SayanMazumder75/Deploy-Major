import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// VivaView
//
// Accordion list of viva-style oral-exam questions. Each row collapses to
// the question text by default; expanding reveals the expected answer with
// a "Hide answer / Show answer" toggle so users can self-test.
//
// Difficulty badges match the colour scheme used by FlashcardsView so the
// UI vocabulary is consistent across the viewer's bundle sections.
// ─────────────────────────────────────────────────────────────────────────────

const difficultyTint = {
    easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-rose-100 text-rose-700 border-rose-200',
};

const VivaRow = ({ item, index, isOpen, onToggle }) => {
    const [showAnswer, setShowAnswer] = useState(false);

    return (
        <motion.li
            layout
            className="rounded-2xl border border-purple-200/60 bg-white/90 overflow-hidden"
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left group hover:bg-purple-50/40 transition-colors"
            >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-xs font-bold text-purple-600">
                    Q{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-700 leading-snug">
                        {item.question}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {item.difficulty && (
                        <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                difficultyTint[item.difficulty] || difficultyTint.medium
                            }`}
                        >
                            {item.difficulty.toUpperCase()}
                        </span>
                    )}
                    {isOpen ? (
                        <ChevronUp
                            className="w-4 h-4 text-purple-400 group-hover:text-violet-700"
                            strokeWidth={2.2}
                        />
                    ) : (
                        <ChevronDown
                            className="w-4 h-4 text-purple-400 group-hover:text-violet-700"
                            strokeWidth={2.2}
                        />
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-purple-200/40"
                    >
                        <div className="p-4 bg-gradient-to-br from-purple-50/60 to-pink-50/40">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase tracking-wide font-bold text-purple-600">
                                    Expected answer
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowAnswer((v) => !v)}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-violet-700 transition-colors"
                                >
                                    {showAnswer ? (
                                        <>
                                            <EyeOff className="w-3 h-3" strokeWidth={2.4} />
                                            Hide answer
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-3 h-3" strokeWidth={2.4} />
                                            Show answer
                                        </>
                                    )}
                                </button>
                            </div>
                            {showAnswer ? (
                                <p className="text-sm text-violet-800 leading-relaxed">
                                    {item.expectedAnswer}
                                </p>
                            ) : (
                                <p className="text-xs italic text-purple-400/80">
                                    Hidden — try answering the question yourself first.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
};

const VivaView = ({ vivaQuestions = [] }) => {
    const [openIndex, setOpenIndex] = useState(0);

    if (!vivaQuestions.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No viva questions were generated for this summary.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <Mic className="w-4 h-4 text-purple-500" strokeWidth={2.2} />
                {vivaQuestions.length} viva-style questions
            </div>
            <ul className="space-y-2.5">
                {vivaQuestions.map((item, idx) => (
                    <VivaRow
                        key={idx}
                        item={item}
                        index={idx}
                        isOpen={openIndex === idx}
                        onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                    />
                ))}
            </ul>
        </div>
    );
};

export default VivaView;
