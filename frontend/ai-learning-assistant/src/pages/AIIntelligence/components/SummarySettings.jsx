import React from 'react';
import { motion } from 'framer-motion';
import {
    GraduationCap,
    Zap,
    BookOpen,
    Microscope,
    Briefcase,
    FileText,
    Languages,
    Sliders,
    Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SummarySettings
//
// The "tell the AI what you actually need" panel. Three pickers + an
// advanced-options checklist, all feeding a single `settings` object owned by
// the parent page. Designed to be friendly enough that a panicked student at
// 2 a.m. can pick "Exam Tomorrow" and go.
//
// Props:
//   - value      : settings object (see ../../../models/AISummary on backend)
//   - onChange   : (next) => void
//   - disabled   : grey-out everything during generation
// ─────────────────────────────────────────────────────────────────────────────

const STUDY_GOALS = [
    { id: 'exam_tomorrow', label: 'Exam Tomorrow', icon: Zap, blurb: 'High-yield facts only' },
    { id: 'quick_revision', label: 'Quick Revision', icon: BookOpen, blurb: 'Scannable bullets' },
    { id: 'detailed_notes', label: 'Detailed Notes', icon: FileText, blurb: 'Comprehensive coverage' },
    { id: 'research_mode', label: 'Research Mode', icon: Microscope, blurb: 'Preserve nuance' },
    { id: 'interview_prep', label: 'Interview Preparation', icon: Briefcase, blurb: 'Q&A-friendly' },
];

const LENGTHS = [
    { id: 'auto', label: 'AI Decide', sub: 'Adapt to source' },
    { id: '2', label: '2 Pages', sub: 'Cheat-sheet' },
    { id: '5', label: '5 Pages', sub: 'Balanced' },
    { id: '10', label: '10 Pages', sub: 'In-depth' },
];

const LANGUAGES = [
    { id: 'english', label: 'English', flag: 'EN' },
    { id: 'hindi', label: 'Hindi', flag: 'हि' },
    { id: 'bengali', label: 'Bengali', flag: 'বা' },
];

const ADVANCED = [
    { id: 'preserveFormulas', label: 'Preserve formulas' },
    { id: 'preserveDefinitions', label: 'Preserve important definitions' },
    { id: 'explainDiagrams', label: 'Explain diagrams' },
    { id: 'includeToc', label: 'Include table of contents' },
    { id: 'keepExamples', label: 'Keep important examples' },
];

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/25">
            <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
        </div>
        <div>
            <h3 className="text-sm font-semibold text-violet-700 leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-purple-500/80">{subtitle}</p>}
        </div>
    </div>
);

const SummarySettings = ({ value, onChange, disabled = false }) => {
    const setStudyGoal = (id) => onChange({ ...value, studyGoal: id });
    const setLength = (id) => onChange({ ...value, summaryLength: id });
    const setLanguage = (id) => onChange({ ...value, language: id });
    const toggleAdvanced = (key) =>
        onChange({
            ...value,
            advancedOptions: {
                ...(value.advancedOptions || {}),
                [key]: !value.advancedOptions?.[key],
            },
        });

    return (
        <div
            className={`relative w-full bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden ${
                disabled ? 'pointer-events-none opacity-60' : ''
            }`}
        >
            {/* gradient accent header */}
            <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-violet-700">Summary Settings</h2>
                    <p className="text-xs text-purple-500/80">
                        Tell the AI how to tune your summary
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-7">
                {/* ── Study Goal ──────────────────────────────────────────── */}
                <section>
                    <SectionHeader
                        icon={GraduationCap}
                        title="Study Goal"
                        subtitle="What are you using this summary for?"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        {STUDY_GOALS.map((g) => {
                            const active = value.studyGoal === g.id;
                            const Icon = g.icon;
                            return (
                                <motion.button
                                    key={g.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setStudyGoal(g.id)}
                                    className={`relative text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
                                        active
                                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-purple-50/40 border-purple-200/60 text-violet-700 hover:bg-purple-50 hover:border-purple-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon
                                            className={`w-4 h-4 ${active ? 'text-white' : 'text-purple-500'}`}
                                            strokeWidth={2.2}
                                        />
                                        <span className="text-xs font-semibold leading-none">
                                            {g.label}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-[11px] ${
                                            active ? 'text-white/85' : 'text-purple-500/80'
                                        }`}
                                    >
                                        {g.blurb}
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Summary Length ──────────────────────────────────────── */}
                <section>
                    <SectionHeader
                        icon={FileText}
                        title="Summary Length"
                        subtitle="How long should the summary be?"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {LENGTHS.map((l) => {
                            const active = value.summaryLength === l.id;
                            return (
                                <motion.button
                                    key={l.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setLength(l.id)}
                                    className={`relative text-center px-3 py-3 rounded-xl border transition-all duration-200 ${
                                        active
                                            ? 'bg-gradient-to-br from-fuchsia-500 to-purple-500 border-transparent text-white shadow-lg shadow-fuchsia-500/30'
                                            : 'bg-purple-50/40 border-purple-200/60 text-violet-700 hover:bg-purple-50 hover:border-purple-300'
                                    }`}
                                >
                                    <p className="text-sm font-semibold leading-tight">{l.label}</p>
                                    <p
                                        className={`text-[11px] mt-0.5 ${
                                            active ? 'text-white/85' : 'text-purple-500/80'
                                        }`}
                                    >
                                        {l.sub}
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Language ────────────────────────────────────────────── */}
                <section>
                    <SectionHeader icon={Languages} title="Language" subtitle="Output language" />
                    <div className="grid grid-cols-3 gap-2.5">
                        {LANGUAGES.map((lang) => {
                            const active = value.language === lang.id;
                            return (
                                <motion.button
                                    key={lang.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setLanguage(lang.id)}
                                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all duration-200 ${
                                        active
                                            ? 'bg-gradient-to-br from-violet-500 to-pink-500 border-transparent text-white shadow-lg shadow-violet-500/30'
                                            : 'bg-purple-50/40 border-purple-200/60 text-violet-700 hover:bg-purple-50 hover:border-purple-300'
                                    }`}
                                >
                                    <span
                                        className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                                            active ? 'bg-white/20' : 'bg-white text-purple-500'
                                        }`}
                                    >
                                        {lang.flag}
                                    </span>
                                    <span className="text-sm font-semibold">{lang.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Advanced ────────────────────────────────────────────── */}
                <section>
                    <SectionHeader
                        icon={Sliders}
                        title="Advanced Options"
                        subtitle="Fine-grained controls"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ADVANCED.map((opt) => {
                            const active = !!value.advancedOptions?.[opt.id];
                            return (
                                <label
                                    key={opt.id}
                                    className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                                        active
                                            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300'
                                            : 'bg-white/60 border-purple-200/60 hover:border-purple-300'
                                    }`}
                                >
                                    <span
                                        className={`relative w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${
                                            active
                                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-transparent'
                                                : 'bg-white border-purple-300 group-hover:border-purple-400'
                                        }`}
                                    >
                                        {active && (
                                            <svg
                                                className="w-3 h-3 text-white"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleAdvanced(opt.id)}
                                            className="sr-only"
                                        />
                                    </span>
                                    <span className="text-sm font-medium text-violet-700 select-none">
                                        {opt.label}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SummarySettings;
