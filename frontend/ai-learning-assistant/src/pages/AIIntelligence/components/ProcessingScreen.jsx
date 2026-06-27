import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    FileText,
    Layers,
    BrainCircuit,
    Sparkles,
    FileSearch,
    BookOpen,
    Calculator,
    Image as ImageIcon,
    Clock,
    Activity,
    Check,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ProcessingScreen
//
// "Dedicated processing page" the spec calls for. We don't get true streaming
// progress from Groq for free, so we drive a believable client-side animation
// across six stages while the backend works. Each stage advances with a
// non-linear curve and stalls right before completion so the bars don't
// finish before the actual API call returns — that would be jarring.
//
// As soon as the backend resolves (the parent passes `isComplete=true`), we
// snap every bar to 100% and emit `onAllStagesComplete` so the parent can
// hand off to the Results Dashboard.
//
// The side rail shows AI insights that "tick up" as the bars progress —
// purely cosmetic until we have real telemetry, but it makes the wait feel
// productive. Once the real summary arrives, those numbers get replaced
// with the real insights (parent passes `realInsights` in).
// ─────────────────────────────────────────────────────────────────────────────

const STAGES = [
    { id: 'upload', label: 'Uploading...', icon: Upload },
    { id: 'extract', label: 'Extracting Text...', icon: FileText },
    { id: 'chunks', label: 'Detecting Chapters...', icon: Layers },
    { id: 'concepts', label: 'Understanding Concepts...', icon: BrainCircuit },
    { id: 'summary', label: 'Generating AI Summary...', icon: Sparkles },
    { id: 'format', label: 'Formatting PDF...', icon: FileSearch },
];

// Each stage's *fake* duration in ms when there's no real progress signal.
// Sum (~16s) sits comfortably under the typical Groq round-trip; if the
// backend takes longer we'll just sit at ~92% on the last stage.
const STAGE_DURATIONS = [1100, 2200, 2400, 3000, 4500, 2800];

const formatNumber = (n) => {
    const v = Math.max(0, Math.round(n || 0));
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
};

const ProgressBar = ({ value, gradient }) => (
    <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
        <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        />
    </div>
);

const InsightStat = ({ icon: Icon, label, value, tint = 'purple' }) => {
    const tintMap = {
        purple: 'from-purple-500 to-pink-500',
        pink: 'from-pink-500 to-rose-500',
        violet: 'from-violet-500 to-purple-500',
        amber: 'from-amber-400 to-pink-500',
        sky: 'from-sky-500 to-purple-500',
        red: 'from-rose-500 to-pink-500',
    };
    return (
        <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/70 border border-purple-100">
            <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tintMap[tint]} flex items-center justify-center shadow shadow-purple-500/20`}
            >
                <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] text-purple-500/80">{label}</p>
                <p className="text-sm font-bold text-violet-700 tracking-tight tabular-nums">
                    {value}
                </p>
            </div>
        </div>
    );
};

const ProcessingScreen = ({
    fileLabel = 'Document.pdf',
    isComplete = false,
    realInsights = null,
    onAllStagesComplete,
}) => {
    // Per-stage progress 0–100. We hold the in-flight ANIMATED progress here;
    // when `isComplete` flips we derive the displayed bars from it instead of
    // calling setState (avoids the React 19 "set-state-in-effect" lint
    // warning + the pointless re-render).
    const [progress, setProgress] = useState(STAGES.map(() => 0));
    const onCompleteRef = useRef(onAllStagesComplete);

    // Keep `onCompleteRef.current` in sync with the latest callback via an
    // effect (NOT during render — React 19 forbids ref mutation during render).
    useEffect(() => {
        onCompleteRef.current = onAllStagesComplete;
    });

    // Animate fake progress with rAF; cap each stage at 92% until the real
    // backend response arrives.
    useEffect(() => {
        let raf = null;
        let stageIndex = 0;
        let stageStart = performance.now();

        const tick = (now) => {
            const elapsed = now - stageStart;
            const dur = STAGE_DURATIONS[stageIndex] || 1500;
            const ratio = Math.min(elapsed / dur, 1);

            setProgress((prev) => {
                const next = [...prev];
                // Curve: ease-out so bars decelerate near 92%.
                const eased = 1 - Math.pow(1 - ratio, 2);
                next[stageIndex] = Math.min(92, Math.round(eased * 92));
                return next;
            });

            if (ratio >= 1 && stageIndex < STAGES.length - 1) {
                stageIndex += 1;
                stageStart = now;
            }
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    // When the real response arrives, schedule the "I'm done" callback. The
    // displayed bars snap to 100% via the derived `displayProgress` below so
    // we don't need an additional setState here.
    useEffect(() => {
        if (!isComplete) return;
        const t = setTimeout(() => {
            onCompleteRef.current?.();
        }, 500);
        return () => clearTimeout(t);
    }, [isComplete]);

    // Derived view-state: once the backend is done, every bar shows 100%.
    const displayProgress = isComplete ? STAGES.map(() => 100) : progress;

    // Side-rail insights — they "tick up" using the average of the bar
    // progress as a clock, OR — once the real summary lands — switch to the
    // real numbers.
    const avgProgress =
        displayProgress.reduce((a, b) => a + b, 0) / displayProgress.length;
    const tickRatio = Math.min(1, avgProgress / 100);

    const insights = realInsights || {
        chapterCount: Math.round(tickRatio * 18),
        formulaCount: Math.round(tickRatio * 142),
        definitionCount: Math.round(tickRatio * 86),
        diagramCount: Math.round(tickRatio * 12),
        estimatedReadingTime: Math.max(1, Math.round(tickRatio * 18)),
        difficulty: avgProgress < 40 ? 'Analyzing' : avgProgress < 75 ? 'Medium' : 'Hard',
    };

    const stageGradients = [
        'from-purple-400 to-pink-500',
        'from-fuchsia-400 to-purple-500',
        'from-pink-400 to-violet-500',
        'from-violet-400 to-fuchsia-500',
        'from-purple-500 to-pink-500',
        'from-fuchsia-500 to-purple-500',
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            {/* Main panel — stages */}
            <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                        >
                            <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                        </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-sm font-semibold text-violet-700 truncate"
                            title={fileLabel}
                        >
                            {fileLabel}
                        </p>
                        <p className="text-[11px] text-purple-500/80">
                            AI is processing your document — this usually takes 30–90 seconds
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {STAGES.map((stage, i) => {
                        const Icon = stage.icon;
                        const v = displayProgress[i];
                        const done = v >= 100;
                        const active = !done && (i === 0 || displayProgress[i - 1] >= 92);
                        return (
                            <div key={stage.id}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                                done
                                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow shadow-emerald-400/30'
                                                    : active
                                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow shadow-purple-500/30'
                                                    : 'bg-purple-100'
                                            }`}
                                        >
                                            {done ? (
                                                <Check
                                                    className="w-3.5 h-3.5 text-white"
                                                    strokeWidth={3}
                                                />
                                            ) : (
                                                <Icon
                                                    className={`w-3.5 h-3.5 ${
                                                        active ? 'text-white' : 'text-purple-400'
                                                    }`}
                                                    strokeWidth={2.2}
                                                />
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-violet-700">
                                            {stage.label}
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-purple-500 tabular-nums">
                                        {v}%
                                    </span>
                                </div>
                                <ProgressBar value={v} gradient={stageGradients[i]} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side rail — insights */}
            <div className="bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
                    <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" strokeWidth={2.2} />
                        AI Insights
                    </h3>
                    <p className="text-[11px] text-purple-500/80">
                        Live signals as the model reads your document
                    </p>
                </div>
                <div className="p-4 space-y-2.5">
                    <InsightStat
                        icon={BookOpen}
                        label="Detected Chapters"
                        value={formatNumber(insights.chapterCount)}
                        tint="purple"
                    />
                    <InsightStat
                        icon={Calculator}
                        label="Important Formulas"
                        value={formatNumber(insights.formulaCount)}
                        tint="pink"
                    />
                    <InsightStat
                        icon={BookOpen}
                        label="Definitions"
                        value={formatNumber(insights.definitionCount)}
                        tint="violet"
                    />
                    <InsightStat
                        icon={ImageIcon}
                        label="Diagrams"
                        value={formatNumber(insights.diagramCount)}
                        tint="sky"
                    />
                    <InsightStat
                        icon={Clock}
                        label="Est. Reading Time"
                        value={`${insights.estimatedReadingTime} min`}
                        tint="amber"
                    />
                    <InsightStat
                        icon={Activity}
                        label="Difficulty"
                        value={insights.difficulty}
                        tint="red"
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ProcessingScreen;
