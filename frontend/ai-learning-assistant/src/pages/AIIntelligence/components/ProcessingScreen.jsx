import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    AlertTriangle,
    SkipForward,
    Loader2,
    GraduationCap,
    Network,
    HelpCircle,
    Mic,
    PenSquare,
    BookMarked,
    Tag,
} from 'lucide-react';

import aiIntelligenceService from '../../../services/aiIntelligenceService';

// ─────────────────────────────────────────────────────────────────────────────
// ProcessingScreen (V2)
//
// Subscribes to the backend's SSE progress stream for a given `summaryId`
// and renders REAL per-stage progress. Replaces the V1 client-side faked
// animation entirely.
//
// Props:
//   - summaryId               (required)  — id returned by the generate endpoint
//   - fileLabel               (optional) — display label for the source file
//   - onPipelineComplete()    (optional) — fires when SSE emits pipeline:complete
//   - onPipelineFailed(err)   (optional) — fires on pipeline:failed
//
// Architecture: the SSE bus gives us authoritative state for every stage
// (status / progress / durationMs / error). We store it in `stagesById` and
// derive the visible list from `stagePlan` so the UI shows every planned
// stage from the start (even ones that haven't started yet), avoiding the
// "stages appear one-by-one" pop-in.
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_ICONS = {
    ingest: Upload,
    chunk: Layers,
    extract: FileText,
    chapters: BookMarked,
    definitions: Tag,
    formulas: Calculator,
    examples: BookOpen,
    tips: GraduationCap,
    flashcards: PenSquare,
    quiz: HelpCircle,
    viva: Mic,
    mindmap: Network,
    compose: FileSearch,
};

const STAGE_GRADIENTS = [
    'from-purple-400 to-pink-500',
    'from-fuchsia-400 to-purple-500',
    'from-pink-400 to-violet-500',
    'from-violet-400 to-fuchsia-500',
    'from-purple-500 to-pink-500',
    'from-fuchsia-500 to-purple-500',
];

const InsightStat = ({ icon: Icon, label, value, tint = 'purple' }) => {
    const tintMap = {
        purple: 'from-purple-500 to-pink-500',
        pink: 'from-pink-500 to-rose-500',
        violet: 'from-violet-500 to-purple-500',
        amber: 'from-amber-400 to-pink-500',
        sky: 'from-sky-500 to-purple-500',
        red: 'from-rose-500 to-pink-500',
        emerald: 'from-emerald-400 to-emerald-600',
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

const ProgressBar = ({ value, gradient, indeterminate }) => (
    <div className="h-2 rounded-full bg-purple-100 overflow-hidden relative">
        {indeterminate ? (
            <motion.div
                className={`absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r ${gradient}`}
                animate={{ x: ['-30%', '130%'] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
        ) : (
            <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            />
        )}
    </div>
);

const formatNumber = (n) => {
    const v = Math.max(0, Math.round(n || 0));
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
};

const ProcessingScreen = ({
    summaryId,
    fileLabel = 'Document.pdf',
    onPipelineComplete,
    onPipelineFailed,
}) => {
    // Stage plan starts empty; the backend sends a `plan` event on subscribe
    // with the canonical ordered list. Until then we show a placeholder.
    const [stagePlan, setStagePlan] = useState([]);
    // Per-stage state keyed by id. Each entry is { status, progress, durationMs, error, label }.
    const [stagesById, setStagesById] = useState({});
    const [liveInsights, setLiveInsights] = useState(null);
    const [terminalStatus, setTerminalStatus] = useState(null); // 'complete' | 'failed' | null
    const [errorMessage, setErrorMessage] = useState('');

    // Keep latest handler refs to avoid re-subscribing on every parent rerender.
    const onCompleteRef = useRef(onPipelineComplete);
    const onFailedRef = useRef(onPipelineFailed);
    useEffect(() => {
        onCompleteRef.current = onPipelineComplete;
        onFailedRef.current = onPipelineFailed;
    });

    useEffect(() => {
        if (!summaryId) return;

        const close = aiIntelligenceService.streamProgress(
            summaryId,
            (event) => {
                switch (event.type) {
                    case 'plan': {
                        setStagePlan(event.stagePlan || []);
                        // Seed every stage as pending so the UI renders the
                        // whole plan up-front (avoids stages popping in).
                        setStagesById((prev) => {
                            const next = { ...prev };
                            for (const s of event.stagePlan || []) {
                                if (!next[s.id]) {
                                    next[s.id] = {
                                        status: 'pending',
                                        progress: 0,
                                        durationMs: 0,
                                        label: s.label,
                                    };
                                }
                            }
                            return next;
                        });
                        break;
                    }
                    case 'stage:start':
                        setStagesById((prev) => ({
                            ...prev,
                            [event.stageId]: {
                                ...(prev[event.stageId] || {}),
                                status: 'running',
                                progress: event.progress || 5,
                                label: event.label || prev[event.stageId]?.label || event.stageId,
                            },
                        }));
                        break;
                    case 'stage:progress':
                        setStagesById((prev) => ({
                            ...prev,
                            [event.stageId]: {
                                ...(prev[event.stageId] || {}),
                                status: 'running',
                                progress: event.progress || 0,
                            },
                        }));
                        break;
                    case 'stage:complete':
                        setStagesById((prev) => ({
                            ...prev,
                            [event.stageId]: {
                                ...(prev[event.stageId] || {}),
                                status: 'completed',
                                progress: 100,
                                durationMs: event.durationMs || 0,
                            },
                        }));
                        break;
                    case 'stage:failed':
                        setStagesById((prev) => ({
                            ...prev,
                            [event.stageId]: {
                                ...(prev[event.stageId] || {}),
                                status: 'failed',
                                error: event.error || 'Failed',
                                durationMs: event.durationMs || 0,
                            },
                        }));
                        break;
                    case 'stage:skipped':
                        setStagesById((prev) => ({
                            ...prev,
                            [event.stageId]: {
                                ...(prev[event.stageId] || {}),
                                status: 'skipped',
                                progress: 100,
                            },
                        }));
                        break;
                    case 'insights':
                        setLiveInsights(event.insights);
                        break;
                    case 'pipeline:complete':
                        setTerminalStatus('complete');
                        onCompleteRef.current?.();
                        break;
                    case 'pipeline:failed':
                        setTerminalStatus('failed');
                        setErrorMessage(event.error || 'Pipeline failed.');
                        onFailedRef.current?.(event.error || 'Pipeline failed.');
                        break;
                    default:
                        break;
                }
            },
            (err) => {
                console.error('[ProcessingScreen] SSE error:', err);
                // Don't surface as a fatal error to the parent — the
                // pipeline may still be running on the server; the parent's
                // polling fallback will pick it up.
            }
        );

        return () => close();
    }, [summaryId]);

    // Side-rail insights — prefer real numbers from SSE; otherwise show 0s.
    const insights = liveInsights || {
        chapterCount: 0,
        formulaCount: 0,
        definitionCount: 0,
        diagramCount: 0,
        keyConceptCount: 0,
        estimatedReadingTime: 0,
        difficulty: 'Analyzing',
    };

    // Overall progress = average of every visible stage's progress.
    const visibleStages = useMemo(() => {
        if (stagePlan.length === 0) {
            // No plan yet — synthesise a single "Connecting" placeholder so
            // the UI doesn't look empty during the SSE handshake.
            return [
                {
                    id: 'connecting',
                    label: 'Connecting to AI engine',
                    status: 'running',
                    progress: 0,
                },
            ];
        }
        return stagePlan.map((s) => ({
            id: s.id,
            label: s.label || s.id,
            ...stagesById[s.id],
        }));
    }, [stagePlan, stagesById]);

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
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
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
                            {terminalStatus === 'complete'
                                ? 'Generation complete — preparing your results'
                                : terminalStatus === 'failed'
                                ? `Generation failed: ${errorMessage}`
                                : 'AI is processing your document — this usually takes 30–90 seconds'}
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                    {visibleStages.map((stage, i) => {
                        const Icon = STAGE_ICONS[stage.id] || Sparkles;
                        const gradient = STAGE_GRADIENTS[i % STAGE_GRADIENTS.length];
                        const status = stage.status || 'pending';
                        const isRunning = status === 'running';
                        const isComplete = status === 'completed';
                        const isFailed = status === 'failed';
                        const isSkipped = status === 'skipped';
                        const progress = stage.progress || 0;

                        return (
                            <div key={stage.id}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                                isComplete
                                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow shadow-emerald-400/30'
                                                    : isFailed
                                                    ? 'bg-gradient-to-br from-rose-500 to-pink-500 shadow shadow-rose-500/30'
                                                    : isSkipped
                                                    ? 'bg-slate-200'
                                                    : isRunning
                                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow shadow-purple-500/30'
                                                    : 'bg-purple-100'
                                            }`}
                                        >
                                            {isComplete ? (
                                                <Check
                                                    className="w-3.5 h-3.5 text-white"
                                                    strokeWidth={3}
                                                />
                                            ) : isFailed ? (
                                                <AlertTriangle
                                                    className="w-3.5 h-3.5 text-white"
                                                    strokeWidth={2.4}
                                                />
                                            ) : isSkipped ? (
                                                <SkipForward
                                                    className="w-3.5 h-3.5 text-slate-500"
                                                    strokeWidth={2.4}
                                                />
                                            ) : isRunning ? (
                                                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                            ) : (
                                                <Icon
                                                    className="w-3.5 h-3.5 text-purple-400"
                                                    strokeWidth={2.2}
                                                />
                                            )}
                                        </div>
                                        <span
                                            className={`text-sm font-medium ${
                                                isSkipped
                                                    ? 'text-slate-500 line-through'
                                                    : isFailed
                                                    ? 'text-rose-600'
                                                    : 'text-violet-700'
                                            }`}
                                        >
                                            {stage.label}
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-purple-500 tabular-nums">
                                        {isComplete
                                            ? '100%'
                                            : isFailed
                                            ? 'failed'
                                            : isSkipped
                                            ? 'skipped'
                                            : isRunning && progress < 5
                                            ? '…'
                                            : `${progress}%`}
                                    </span>
                                </div>
                                <ProgressBar
                                    value={isSkipped ? 100 : isFailed ? 0 : progress}
                                    gradient={
                                        isFailed
                                            ? 'from-rose-400 to-pink-500'
                                            : isSkipped
                                            ? 'from-slate-300 to-slate-400'
                                            : gradient
                                    }
                                    // Show an indeterminate bar while running with low progress (extract/bundle stages don't always report fine-grained pct).
                                    indeterminate={isRunning && progress < 5}
                                />
                                {isFailed && stage.error && (
                                    <p className="text-[11px] text-rose-600 mt-1">
                                        {stage.error}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side rail — insights */}
            <div className="bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
                    <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                        <Activity
                            className="w-4 h-4 text-purple-500"
                            strokeWidth={2.2}
                        />
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
                        label="Formulas"
                        value={formatNumber(insights.formulaCount)}
                        tint="pink"
                    />
                    <InsightStat
                        icon={Tag}
                        label="Definitions"
                        value={formatNumber(insights.definitionCount)}
                        tint="violet"
                    />
                    <InsightStat
                        icon={BrainCircuit}
                        label="Key Concepts"
                        value={formatNumber(insights.keyConceptCount)}
                        tint="emerald"
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
                        value={`${insights.estimatedReadingTime || 0} min`}
                        tint="amber"
                    />
                    <InsightStat
                        icon={Activity}
                        label="Difficulty"
                        value={
                            typeof insights.difficulty === 'string'
                                ? insights.difficulty.charAt(0).toUpperCase() +
                                  insights.difficulty.slice(1)
                                : 'Analyzing'
                        }
                        tint="red"
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ProcessingScreen;
