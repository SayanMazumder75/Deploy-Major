import React from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    FileText,
    Sparkles,
    BookOpen,
    BrainCircuit,
    Calculator,
    Network,
    Mic,
    Download,
    Eye,
    Save,
    RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// ResultsDashboard
//
// The "Summary Generated Successfully" screen. Shows the high-level outcome
// stats (original pages → summary pages → compression → reading time), a grid
// of generated-resource cards, and the four action buttons:
//   - View Summary       → navigate to /ai-intelligence/:id viewer
//   - Download PDF       → fetch download URL + open in new tab
//   - Save to Documents  → call save-to-documents endpoint (only NOW is the
//                          document actually persisted to the library)
//   - Generate Again     → ask the parent to drop back to the settings view
//
// Pure presentation — all behaviour is plumbed in via callbacks from the
// parent page so this stays easy to reason about.
// ─────────────────────────────────────────────────────────────────────────────

const RESOURCE_CARDS = [
    { id: 'summary', label: 'Summary PDF', icon: FileText, tint: 'from-purple-500 to-pink-500' },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen, tint: 'from-pink-500 to-violet-500' },
    { id: 'quiz', label: 'Quiz', icon: BrainCircuit, tint: 'from-fuchsia-500 to-purple-500' },
    {
        id: 'formula',
        label: 'Formula Sheet',
        icon: Calculator,
        tint: 'from-violet-500 to-pink-500',
    },
    { id: 'mindmap', label: 'Mind Map', icon: Network, tint: 'from-purple-500 to-fuchsia-500' },
    { id: 'viva', label: 'Viva Questions', icon: Mic, tint: 'from-pink-500 to-purple-500' },
];

const StatTile = ({ label, value, sub, accent = false }) => (
    <div
        className={`rounded-2xl px-5 py-4 border ${
            accent
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-transparent text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/80 border-purple-200/60 backdrop-blur-xl'
        }`}
    >
        <p
            className={`text-[11px] uppercase tracking-wide font-semibold ${
                accent ? 'text-white/85' : 'text-purple-500/80'
            }`}
        >
            {label}
        </p>
        <p
            className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${
                accent ? 'text-white' : 'text-violet-700'
            }`}
        >
            {value}
        </p>
        {sub && (
            <p
                className={`text-[11px] mt-1 ${
                    accent ? 'text-white/80' : 'text-purple-500/80'
                }`}
            >
                {sub}
            </p>
        )}
    </div>
);

const ResultsDashboard = ({
    summary,
    saving = false,
    onView,
    onDownload,
    onSaveToDocuments,
    onRegenerateAgain,
}) => {
    if (!summary) return null;

    const originalPages = summary.originalPageCount || 0;
    const summaryPages = summary.summaryPageCount || 0;
    const compression =
        typeof summary.compressionPercent === 'number' && summary.compressionPercent > 0
            ? `${summary.compressionPercent}%`
            : originalPages > 0
            ? `${Math.max(0, Math.min(99, Math.round((1 - summaryPages / originalPages) * 100)))}%`
            : '—';
    const readingTime = summary.insights?.estimatedReadingTime || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
        >
            {/* success banner */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 px-6 py-6 shadow-xl shadow-purple-500/30">
                <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-pink-300/30 blur-2xl pointer-events-none" />
                <div className="relative flex items-start gap-4">
                    <motion.div
                        initial={{ scale: 0.6, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
                        className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow"
                    >
                        <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.2} />
                    </motion.div>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-white tracking-tight">
                            Summary Generated Successfully
                        </h2>
                        <p className="text-white/85 text-sm mt-0.5">
                            {summary.sourceTitle} · Ready to review
                        </p>
                    </div>
                </div>
            </div>

            {/* stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile
                    label="Original PDF"
                    value={originalPages > 0 ? `${originalPages} Pages` : '—'}
                    sub={summary.sourceFileName || ''}
                />
                <StatTile
                    label="AI Summary"
                    value={`${summaryPages || 1} Pages`}
                    sub="Concise · readable"
                    accent
                />
                <StatTile label="Compression" value={compression} sub="Less to read" />
                <StatTile
                    label="Est. Reading Time"
                    value={`${readingTime || 1} min`}
                    sub="At a comfortable pace"
                />
            </div>

            {/* generated resources */}
            <div className="bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/25">
                        <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-violet-700">
                            Generated Resources
                        </h3>
                        <p className="text-[11px] text-purple-500/80">
                            Bundled materials produced from this summary
                        </p>
                    </div>
                </div>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {RESOURCE_CARDS.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * idx, duration: 0.25 }}
                                className="group relative flex flex-col items-center justify-center rounded-xl border border-purple-200/60 bg-white/70 hover:bg-purple-50/50 hover:border-purple-300 px-3 py-4 cursor-default transition-all"
                            >
                                <div
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.tint} flex items-center justify-center shadow shadow-purple-500/25 mb-2 group-hover:scale-110 transition-transform`}
                                >
                                    <Icon
                                        className="w-5 h-5 text-white"
                                        strokeWidth={2.2}
                                    />
                                </div>
                                <p className="text-xs font-semibold text-violet-700 text-center">
                                    {card.label}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <ActionButton
                    primary
                    icon={Eye}
                    label="View Summary"
                    onClick={onView}
                    disabled={saving}
                />
                <ActionButton
                    icon={Download}
                    label="Download PDF"
                    onClick={onDownload}
                    disabled={saving}
                />
                <ActionButton
                    icon={Save}
                    label={summary.savedToDocuments ? 'Saved to Documents' : 'Save to Documents'}
                    onClick={onSaveToDocuments}
                    disabled={saving || summary.savedToDocuments}
                    loading={saving}
                />
                <ActionButton
                    icon={RefreshCw}
                    label="Generate Again"
                    onClick={onRegenerateAgain}
                    disabled={saving}
                    variant="outline"
                />
            </div>
        </motion.div>
    );
};

const ActionButton = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    primary = false,
    loading = false,
    variant = 'solid',
}) => {
    const base =
        'group inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed';
    const styles =
        primary
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/30'
            : variant === 'outline'
            ? 'bg-white/80 backdrop-blur-xl text-violet-700 border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
            : 'bg-white/80 backdrop-blur-xl text-violet-700 border border-purple-200/60 hover:bg-purple-50 hover:border-purple-300';

    return (
        <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
            {loading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
                <Icon className="w-4 h-4" strokeWidth={2.2} />
            )}
            {label}
        </button>
    );
};

export default ResultsDashboard;
