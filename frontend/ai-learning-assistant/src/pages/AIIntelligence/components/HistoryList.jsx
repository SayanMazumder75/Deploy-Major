import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    FileText,
    History as HistoryIcon,
    Loader2,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import moment from 'moment';

const StatusPill = ({ status }) => {
    if (status === 'processing') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/40 bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold text-amber-100">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
                Processing
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/40 bg-red-400/15 px-2.5 py-1 text-[11px] font-bold text-red-100">
                <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
                Failed
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/40 bg-emerald-300/15 px-2.5 py-1 text-[11px] font-bold text-emerald-100">
            <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
            Completed
        </span>
    );
};

const HistoryRow = ({ item, onDelete }) => {
    const navigate = useNavigate();

    const open = () => {
        if (item.status !== 'completed') return;
        navigate(`/ai-intelligence/${item._id}`);
    };

    return (
        <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="group grid gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 transition-all hover:border-white/25 hover:bg-white/12 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center"
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-lg shadow-fuchsia-950/25">
                <FileText className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>

            <button
                type="button"
                onClick={open}
                className="min-w-0 text-left"
                disabled={item.status !== 'completed'}
            >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-white" title={item.sourceTitle}>
                        {item.sourceTitle}
                    </p>
                    {item.savedToDocuments && (
                        <span className="rounded-full border border-fuchsia-200/40 bg-fuchsia-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-fuchsia-100">
                            Saved
                        </span>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-purple-100/60">
                    {item.originalPageCount > 0 && (
                        <span className="tabular-nums">
                            {item.originalPageCount} to {item.summaryPageCount || 1} pages
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
                    className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-purple-100 transition hover:bg-white hover:text-violet-700 sm:inline-flex"
                    title="Open summary"
                >
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                </button>
            )}

            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-purple-100/70 opacity-100 transition hover:border-red-200/60 hover:bg-red-400/15 hover:text-red-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="Delete from history"
            >
                <Trash2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
        </motion.li>
    );
};

const HistoryList = ({ items = [], loading = false, onDelete, onRefresh }) => {
    return (
        <section className="overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl shadow-purple-950/25 backdrop-blur-2xl">
            <div className="flex flex-col gap-3 border-b border-white/10 bg-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                        <HistoryIcon className="h-5 w-5 text-fuchsia-100" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-100">
                            Previous AI History
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">Recent generations</h2>
                    </div>
                </div>

                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold text-purple-100 transition hover:bg-white hover:text-violet-700"
                    >
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Refresh
                    </button>
                )}
            </div>

            <div className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 py-8 text-sm font-semibold text-purple-100/75">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading history...
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-10 text-center text-sm font-medium text-purple-100/70">
                        No AI generations yet. Your previous summaries will appear here.
                    </div>
                ) : (
                    <ul className="space-y-2.5">
                        {items.map((item) => (
                            <HistoryRow key={item._id} item={item} onDelete={onDelete} />
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default HistoryList;
