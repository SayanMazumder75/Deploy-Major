import { motion } from 'framer-motion';
import {
    BookOpen,
    Briefcase,
    Check,
    FileText,
    GraduationCap,
    Languages,
    Microscope,
    Sliders,
    Sparkles,
    Zap,
} from 'lucide-react';

const STUDY_GOALS = [
    { id: 'exam_tomorrow', label: 'Exam Tomorrow', icon: Zap, blurb: 'High-yield facts' },
    { id: 'quick_revision', label: 'Quick Revision', icon: BookOpen, blurb: 'Fast scanning' },
    { id: 'detailed_notes', label: 'Detailed Notes', icon: FileText, blurb: 'Full coverage' },
    { id: 'research_mode', label: 'Research Mode', icon: Microscope, blurb: 'Preserve nuance' },
    { id: 'interview_prep', label: 'Interview Prep', icon: Briefcase, blurb: 'Q&A friendly' },
];

const LENGTHS = [
    { id: 'auto', label: 'AI Decide', sub: 'Adaptive' },
    { id: '2', label: '2 Pages', sub: 'Brief' },
    { id: '5', label: '5 Pages', sub: 'Balanced' },
    { id: '10', label: '10 Pages', sub: 'Detailed' },
];

const LANGUAGES = [
    { id: 'english', label: 'English', flag: 'EN' },
    { id: 'hindi', label: 'Hindi', flag: 'HI' },
    { id: 'bengali', label: 'Bengali', flag: 'BN' },
];

const ADVANCED = [
    { id: 'preserveFormulas', label: 'Preserve formulas' },
    { id: 'preserveDefinitions', label: 'Preserve important definitions' },
    { id: 'explainDiagrams', label: 'Explain diagrams' },
    { id: 'includeToc', label: 'Include table of contents' },
    { id: 'keepExamples', label: 'Keep important examples' },
];

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Icon className="h-4.5 w-4.5 text-fuchsia-100" strokeWidth={2.4} />
        </div>
        <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-purple-100/60">{subtitle}</p>}
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
        <section
            className={`overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl shadow-purple-950/25 backdrop-blur-2xl ${
                disabled ? 'pointer-events-none opacity-60' : ''
            }`}
        >
            <div className="border-b border-white/10 bg-white/8 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-100">
                            Summary Settings
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">Tune the AI output</h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-xl shadow-fuchsia-950/25">
                        <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                </div>
            </div>

            <div className="space-y-7 p-5">
                <section>
                    <SectionHeader
                        icon={GraduationCap}
                        title="Study Goal"
                        subtitle="Select the outcome this summary should optimize for"
                    />
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-5">
                        {STUDY_GOALS.map((goal) => {
                            const active = value.studyGoal === goal.id;
                            const Icon = goal.icon;
                            return (
                                <motion.button
                                    key={goal.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStudyGoal(goal.id)}
                                    className={`min-h-[92px] rounded-xl border p-3 text-left transition-all ${
                                        active
                                            ? 'border-fuchsia-200/70 bg-white text-violet-900 shadow-xl shadow-purple-950/20'
                                            : 'border-white/10 bg-white/8 text-white hover:border-white/25 hover:bg-white/14'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={`h-4 w-4 ${
                                                active ? 'text-fuchsia-600' : 'text-fuchsia-100'
                                            }`}
                                            strokeWidth={2.2}
                                        />
                                        <span className="text-xs font-bold">{goal.label}</span>
                                    </div>
                                    <p className={`mt-2 text-xs ${active ? 'text-violet-500' : 'text-purple-100/55'}`}>
                                        {goal.blurb}
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <SectionHeader
                        icon={FileText}
                        title="Summary Length"
                        subtitle="Choose the target size for the generated result"
                    />
                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                        {LENGTHS.map((length) => {
                            const active = value.summaryLength === length.id;
                            return (
                                <motion.button
                                    key={length.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setLength(length.id)}
                                    className={`min-h-[74px] rounded-xl border px-3 py-3 text-center transition-all ${
                                        active
                                            ? 'border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-400 to-violet-500 text-white shadow-xl shadow-fuchsia-950/25'
                                            : 'border-white/10 bg-white/8 text-white hover:border-white/25 hover:bg-white/14'
                                    }`}
                                >
                                    <p className="text-sm font-bold">{length.label}</p>
                                    <p className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-purple-100/55'}`}>
                                        {length.sub}
                                    </p>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <SectionHeader icon={Languages} title="Language" subtitle="Output language" />
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        {LANGUAGES.map((language) => {
                            const active = value.language === language.id;
                            return (
                                <motion.button
                                    key={language.id}
                                    type="button"
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setLanguage(language.id)}
                                    className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl border px-3 py-3 transition-all ${
                                        active
                                            ? 'border-fuchsia-200/70 bg-white text-violet-900 shadow-xl shadow-purple-950/20'
                                            : 'border-white/10 bg-white/8 text-white hover:border-white/25 hover:bg-white/14'
                                    }`}
                                >
                                    <span
                                        className={`rounded-md px-2 py-1 text-xs font-black ${
                                            active ? 'bg-violet-100 text-violet-700' : 'bg-white/10 text-fuchsia-100'
                                        }`}
                                    >
                                        {language.flag}
                                    </span>
                                    <span className="text-sm font-bold">{language.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <SectionHeader icon={Sliders} title="Advanced Options" subtitle="Fine tune retained details" />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ADVANCED.map((option) => {
                            const active = !!value.advancedOptions?.[option.id];
                            return (
                                <label
                                    key={option.id}
                                    className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
                                        active
                                            ? 'border-fuchsia-200/60 bg-white text-violet-900 shadow-lg shadow-purple-950/10'
                                            : 'border-white/10 bg-white/8 text-white hover:border-white/25 hover:bg-white/14'
                                    }`}
                                >
                                    <span
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                                            active
                                                ? 'border-transparent bg-gradient-to-br from-fuchsia-500 to-violet-500'
                                                : 'border-white/25 bg-white/8'
                                        }`}
                                    >
                                        {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleAdvanced(option.id)}
                                            className="sr-only"
                                        />
                                    </span>
                                    <span className="text-sm font-semibold">{option.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </section>
            </div>
        </section>
    );
};

export default SummarySettings;
