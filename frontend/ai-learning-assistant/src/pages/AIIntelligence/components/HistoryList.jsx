import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    History as HistoryIcon,
    FileText,
    Trash2,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ArrowRight,
} from 'lucide-react';
import moment from 'moment';

// ─────────────────────────────────────────────────────────────────────────────
// HistoryList
//
// "Recent AI Generations" rail at the bottom of the AI Document Intelligence
// page. Each row deep-links to the Summary Viewer so users can reopen a
// previous result without paying for a regeneration.
//
// Status pill colour map:
//   completed  → green pill, "Completed"
//   processing → spinning yellow pill, "Processing..." (the spec literally
//                shows "Machine Learning · Processing..." as an example row)
//   failed     → red pill, "Failed"
// ─────────────────────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
    if (status === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                Processing...
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
                <AlertCircle className="w-3 h-3" strokeWidth={2.5} />
                Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
            Completed
        </span>
    );
};

const HistoryRow = ({ item, onDelete }) => {
    const navigate = useNavigate();

    const open = () => {
        if (item.status !== 'completed') return; // can't open a still-processing or failed entry
        navigate(`/ai-intelligence/${item._id}`);
    };

    return (
        <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 border border-purple-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
        >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/25">
                <FileText className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>

            <button
                type="button"
                onClick={open}
                className="flex-1 min-w-0 text-left"
                disabled={item.status !== 'completed'}
            >
                <div className="flex items-center gap-2">
                    <p
                        className="text-sm font-semibold text-violet-700 truncate"
                        title={item.sourceTitle}
                    >
                        {item.sourceTitle}
                    </p>
                    {item.savedToDocuments && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200">
                            Saved
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-purple-500/80">
                    {item.originalPageCount > 0 && (
                        <span className="tabular-nums">
                            {item.originalPageCount} → {item.summaryPageCount || 1} Pages
                        </span>
                    )}
                    <span>{moment(item.createdAt).fromNow()}</span>
                </div>
            </button>

            <StatusPill status={item.status} />

            {item.status === 'completed' && (
                <button
                    type="button"
                    onClick={open}
                    className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-purple-500 hover:text-violet-700 hover:bg-purple-100 transition-colors"
                    title="Open summary"
                >
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </button>
            )}

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                }}
                className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-purple-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete from history"
            >
                <Trash2 className="w-4 h-4" strokeWidth={2.2} />
            </button>
        </motion.li>
    );
};

const HistoryList = ({ items = [], loading = false, onDelete, onRefresh }) => {
    return (
        <div className="bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
            <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/25">
                        <HistoryIcon
                            className="w-4 h-4 text-white"
                            strokeWidth={2.2}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-violet-700">
                            Recent AI Generations
                        </h3>
                        <p className="text-[11px] text-purple-500/80">
                            Reopen previous summaries without regenerating
                        </p>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="text-[11px] font-semibold text-purple-500 hover:text-violet-700 transition-colors"
                    >
                        Refresh
                    </button>
                )}
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="py-8 flex items-center justify-center text-purple-500/80 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading history…
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-10 text-center text-sm text-purple-500/80">
                        No AI generations yet — generate your first summary above.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <HistoryRow key={item._id} item={item} onDelete={onDelete} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default HistoryList;
