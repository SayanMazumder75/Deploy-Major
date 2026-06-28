import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, BookOpen } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FlashcardsView
//
// Single-card-at-a-time flashcard browser with flip-on-click. The flip is
// implemented with a CSS 3D transform — we toggle a state, mount the
// "answer" face above the "question" face, and rotate the parent. Simple
// and snappy.
//
// Difficulty pills are coloured by level for at-a-glance scanability.
// ─────────────────────────────────────────────────────────────────────────────

const difficultyTint = {
    easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-rose-100 text-rose-700 border-rose-200',
};

const FlashcardsView = ({ flashcards = [] }) => {
    const [index, setIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);

    if (!flashcards.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No flashcards were generated for this summary.
            </div>
        );
    }

    const card = flashcards[index];
    const total = flashcards.length;

    const goPrev = () => {
        setFlipped(false);
        setIndex((i) => (i === 0 ? total - 1 : i - 1));
    };
    const goNext = () => {
        setFlipped(false);
        setIndex((i) => (i === total - 1 ? 0 : i + 1));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                    <BookOpen className="w-4 h-4 text-purple-500" strokeWidth={2.2} />
                    Flashcard {index + 1} of {total}
                </div>
                <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        difficultyTint[card.difficulty] || difficultyTint.medium
                    }`}
                >
                    {(card.difficulty || 'medium').toUpperCase()}
                </span>
            </div>

            <div className="relative" style={{ perspective: 1200 }}>
                <motion.div
                    className="relative w-full min-h-[260px]"
                    onClick={() => setFlipped((f) => !f)}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.55, ease: [0.25, 0.8, 0.4, 1] }}
                    style={{ transformStyle: 'preserve-3d', cursor: 'pointer' }}
                >
                    {/* front (question) */}
                    <div
                        className="absolute inset-0 rounded-2xl border border-purple-200/60 bg-gradient-to-br from-white/95 to-purple-50/70 backdrop-blur-xl p-6 flex items-center justify-center text-center"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-purple-500 mb-3">
                                Question
                            </p>
                            <p className="text-lg font-semibold text-violet-700 leading-snug">
                                {card.question}
                            </p>
                            <p className="text-[11px] text-purple-500/80 mt-4">
                                Click card to reveal answer
                            </p>
                        </div>
                    </div>

                    {/* back (answer) */}
                    <div
                        className="absolute inset-0 rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 flex items-center justify-center text-center shadow-lg shadow-purple-500/30"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <div>
                            <p className="text-[10px] uppercase tracking-wide font-bold text-white/85 mb-3">
                                Answer
                            </p>
                            <p className="text-base font-semibold leading-snug">
                                {card.answer}
                            </p>
                            <p className="text-[11px] text-white/80 mt-4">
                                Click to flip back
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={goPrev}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200/60 bg-white/70 hover:bg-purple-50 text-sm font-semibold text-violet-700 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.4} />
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => setFlipped((f) => !f)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold shadow shadow-purple-500/25"
                >
                    <RotateCw className="w-4 h-4" strokeWidth={2.4} />
                    Flip
                </button>
                <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200/60 bg-white/70 hover:bg-purple-50 text-sm font-semibold text-violet-700 transition-colors"
                >
                    Next
                    <ChevronRight className="w-4 h-4" strokeWidth={2.4} />
                </button>
            </div>

            {/* progress bar (visualises position in deck) */}
            <div className="h-1 rounded-full bg-purple-100 overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    initial={false}
                    animate={{ width: `${((index + 1) / total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* dot strip — quick-jump to any card */}
            <AnimatePresence>
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {flashcards.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                setFlipped(false);
                                setIndex(i);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${
                                i === index
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-6'
                                    : 'bg-purple-200 hover:bg-purple-300'
                            }`}
                            aria-label={`Go to flashcard ${i + 1}`}
                        />
                    ))}
                </div>
            </AnimatePresence>
        </div>
    );
};

export default FlashcardsView;
