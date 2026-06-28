import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Tag, BookOpen, Lightbulb, GraduationCap } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// RichCardsView
//
// Three thin wrapper components that render the V2 rich shapes
// (richDefinitions / richFormulas / richExamples / keyConcepts / examTips)
// as colour-rail cards in the Summary Viewer. Mirrors the PDF builder's
// card primitive visually so the on-screen viewer and the downloaded PDF
// feel like the same artefact.
//
// Each card uses a left-rail colour token consistent with the PDF builder:
//   definition → violet
//   formula    → pink
//   example    → sky
//   tip        → amber
//   concept    → emerald
// ─────────────────────────────────────────────────────────────────────────────

const railColors = {
    violet: 'bg-violet-500',
    pink: 'bg-pink-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
};

const importanceTint = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
};

const CardShell = ({ rail = 'violet', title, icon: Icon, children, idx }) => (
    <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: idx * 0.02 }}
        className="relative pl-3"
    >
        <div
            className={`absolute left-0 top-1 bottom-1 w-1 rounded-full ${railColors[rail]}`}
        />
        <div className="rounded-2xl border border-purple-200/50 bg-white/90 p-4 shadow-sm">
            {title && (
                <div className="flex items-center gap-2 mb-2">
                    {Icon && (
                        <Icon
                            className={`w-4 h-4 text-${rail}-600`}
                            strokeWidth={2.2}
                        />
                    )}
                    <h4 className="text-base font-bold text-violet-700 leading-snug">
                        {title}
                    </h4>
                </div>
            )}
            {children}
        </div>
    </motion.div>
);

const Row = ({ label, value, mono }) => {
    if (!value) return null;
    return (
        <div className="mt-2">
            {label && (
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-0.5">
                    {label}
                </p>
            )}
            <p
                className={`text-sm text-slate-700 leading-relaxed ${
                    mono ? 'font-mono text-[13px] bg-slate-50 rounded px-2 py-1' : ''
                }`}
            >
                {value}
            </p>
        </div>
    );
};

// ─── exports ────────────────────────────────────────────────────────────────

export const RichDefinitionsView = ({ definitions = [] }) => {
    if (!definitions.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No definitions were extracted for this summary.
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {definitions.map((d, i) => (
                <CardShell key={i} rail="violet" icon={Tag} title={d.term} idx={i}>
                    <Row label="Definition" value={d.definition} />
                    <Row label="Plain language" value={d.simpleExplanation} />
                    <Row label="Analogy" value={d.analogy} />
                    <Row label="Why it matters" value={d.importance} />
                    <Row label="Likely exam question" value={d.examQuestion} />
                    <Row
                        label="Likely interview question"
                        value={d.interviewQuestion}
                    />
                </CardShell>
            ))}
        </div>
    );
};

export const RichFormulasView = ({ formulas = [] }) => {
    if (!formulas.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No formulas were extracted for this summary.
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {formulas.map((f, i) => (
                <CardShell key={i} rail="pink" icon={Calculator} title={f.name} idx={i}>
                    <Row label="Expression" value={f.expression} mono />
                    <Row label="Variables" value={f.variables} />
                    <Row label="Explanation" value={f.explanation} />
                    <Row label="Example" value={f.example} />
                    {(f.examImportance || f.interviewImportance) && (
                        <div className="flex items-center gap-2 mt-3">
                            {f.examImportance && (
                                <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        importanceTint[f.examImportance] ||
                                        importanceTint.medium
                                    }`}
                                >
                                    Exam: {f.examImportance.toUpperCase()}
                                </span>
                            )}
                            {f.interviewImportance && (
                                <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        importanceTint[f.interviewImportance] ||
                                        importanceTint.medium
                                    }`}
                                >
                                    Interview: {f.interviewImportance.toUpperCase()}
                                </span>
                            )}
                        </div>
                    )}
                </CardShell>
            ))}
        </div>
    );
};

export const RichExamplesView = ({ examples = [] }) => {
    if (!examples.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No examples were extracted for this summary.
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {examples.map((e, i) => (
                <CardShell key={i} rail="sky" icon={BookOpen} title={e.title} idx={i}>
                    <Row label="Concept" value={e.conceptExample} />
                    <Row label="Real-world" value={e.realWorldExample} />
                    <Row label="Exam variant" value={e.examExample} />
                    <Row label="Interview variant" value={e.interviewExample} />
                </CardShell>
            ))}
        </div>
    );
};

export const KeyConceptsView = ({ concepts = [] }) => {
    if (!concepts.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No key concepts were extracted for this summary.
            </div>
        );
    }
    return (
        <div className="space-y-3">
            {concepts.map((c, i) => (
                <CardShell key={i} rail="emerald" icon={Lightbulb} title={c.title} idx={i}>
                    <Row value={c.explanation} />
                </CardShell>
            ))}
        </div>
    );
};

export const ExamTipsView = ({ tips = [] }) => {
    if (!tips.length) {
        return (
            <div className="text-sm text-purple-500/80">
                No exam tips were extracted for this summary.
            </div>
        );
    }
    return (
        <div className="space-y-2">
            {tips.map((tip, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60"
                >
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow shadow-amber-500/20">
                        <GraduationCap
                            className="w-4 h-4 text-white"
                            strokeWidth={2.2}
                        />
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed flex-1">
                        {tip}
                    </p>
                </motion.div>
            ))}
        </div>
    );
};

export default {
    RichDefinitionsView,
    RichFormulasView,
    RichExamplesView,
    KeyConceptsView,
    ExamTipsView,
};
