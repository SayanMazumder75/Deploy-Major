import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Lightbulb,
    Volume2,
    Languages,
    RefreshCw,
    Download,
    Save,
    Sparkles,
    Send,
    X,
    StopCircle,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import aiIntelligenceService from '../../../services/aiIntelligenceService';
import MarkdownRenderer from '../../../components/common/MarkdownRenderer';

// ─────────────────────────────────────────────────────────────────────────────
// AIActionsSidebar
//
// The right-rail "AI Actions" panel for the Summary Viewer. Each action is a
// small pill button that either fires a backend call directly or opens an
// inline popover (Ask AI, Translate). Heavy actions (regenerate, save) are
// proxied up to the parent so the parent stays the single source of truth
// for the displayed summary.
//
// Read Aloud uses the browser's SpeechSynthesis API — no backend hit. We
// strip markdown roughly before reading to avoid the speaker enunciating
// asterisks and hashes.
// ─────────────────────────────────────────────────────────────────────────────

const stripMarkdown = (md) =>
    (md || '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[-*]\s+/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/---+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const ActionButton = ({ icon: Icon, label, onClick, active = false, disabled = false }) => (
    <motion.button
        type="button"
        whileHover={!disabled ? { x: 2 } : undefined}
        whileTap={!disabled ? { scale: 0.97 } : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            active
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300 shadow shadow-purple-200/40'
                : 'bg-white/70 border-purple-100 hover:border-purple-300 hover:bg-purple-50/50'
        }`}
    >
        <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shadow shadow-purple-500/25 ${
                active
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-gradient-to-br from-purple-100 to-pink-100'
            }`}
        >
            <Icon
                className={`w-4 h-4 ${active ? 'text-white' : 'text-purple-600'}`}
                strokeWidth={2.2}
            />
        </div>
        <span className="text-sm font-semibold text-violet-700">{label}</span>
    </motion.button>
);

const InlinePopover = ({ title, onClose, children }) => (
    <motion.div
        initial={{ opacity: 0, y: -6, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -6, height: 0 }}
        transition={{ duration: 0.18 }}
        className="overflow-hidden"
    >
        <div className="mt-2 rounded-xl border border-purple-200 bg-white/95 backdrop-blur-xl shadow-lg shadow-purple-200/40">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-purple-100">
                <span className="text-xs font-semibold text-violet-700">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-purple-400 hover:text-violet-700 hover:bg-purple-50 transition-colors"
                >
                    <X className="w-3.5 h-3.5" strokeWidth={2.2} />
                </button>
            </div>
            <div className="p-3">{children}</div>
        </div>
    </motion.div>
);

const AIActionsSidebar = ({
    summary,
    onSummaryUpdate, // called after Regenerate / Save with the fresh summary
    onTranslate, // called with translated markdown (display only — does not mutate persisted summary)
}) => {
    const [openAction, setOpenAction] = useState(null); // 'ask' | 'translate' | null
    const [askQuestion, setAskQuestion] = useState('');
    const [askAnswer, setAskAnswer] = useState('');
    const [askLoading, setAskLoading] = useState(false);
    const [translateLoading, setTranslateLoading] = useState(false);
    const [busyAction, setBusyAction] = useState(null); // 'regenerate' | 'download' | 'save' | 'explain' | null
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef(null);

    const toggle = (id) => setOpenAction((prev) => (prev === id ? null : id));

    // Stop speech on unmount so a torn-down viewer doesn't keep narrating.
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // ── Ask AI ──────────────────────────────────────────────────────────────
    const handleAsk = async (e) => {
        e?.preventDefault?.();
        const q = askQuestion.trim();
        if (!q) {
            toast.error('Type a question first.');
            return;
        }
        setAskLoading(true);
        setAskAnswer('');
        try {
            const res = await aiIntelligenceService.askAI(summary._id, q);
            setAskAnswer(res?.data?.answer || '');
        } catch (err) {
            toast.error(err?.message || 'Failed to get an answer.');
        } finally {
            setAskLoading(false);
        }
    };

    // ── Explain Further (one-click "deepen the whole summary") ──────────────
    const handleExplainFurther = async () => {
        setBusyAction('explain');
        try {
            const res = await aiIntelligenceService.askAI(
                summary._id,
                'Please explain the entire summary in more depth, with clearer intuition and worked examples. Maintain markdown formatting.'
            );
            setAskAnswer(res?.data?.answer || '');
            setOpenAction('ask');
        } catch (err) {
            toast.error(err?.message || 'Failed to expand the summary.');
        } finally {
            setBusyAction(null);
        }
    };

    // ── Read Aloud ─────────────────────────────────────────────────────────
    const handleReadAloud = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            toast.error('Your browser does not support speech synthesis.');
            return;
        }
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const text = stripMarkdown(summary.rawMarkdown);
        if (!text) {
            toast.error('Nothing to read.');
            return;
        }
        const u = new SpeechSynthesisUtterance(text.slice(0, 32000)); // cap for the engine
        // Best-effort language selection — fall back silently if not supported.
        u.lang =
            summary.settings?.language === 'hindi'
                ? 'hi-IN'
                : summary.settings?.language === 'bengali'
                ? 'bn-IN'
                : 'en-US';
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        utteranceRef.current = u;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        setIsSpeaking(true);
    };

    // ── Translate ──────────────────────────────────────────────────────────
    const handleTranslate = async (target) => {
        setTranslateLoading(true);
        try {
            const res = await aiIntelligenceService.translate(summary._id, target);
            if (res?.data?.translatedMarkdown) {
                onTranslate?.({
                    targetLanguage: target,
                    markdown: res.data.translatedMarkdown,
                });
                toast.success('Translated successfully.');
                setOpenAction(null);
            }
        } catch (err) {
            toast.error(err?.message || 'Translation failed.');
        } finally {
            setTranslateLoading(false);
        }
    };

    // ── Regenerate ─────────────────────────────────────────────────────────
    const handleRegenerate = async () => {
        if (!summary.sourceDocumentId) {
            toast.error(
                'This summary was generated from an uploaded PDF that was not added to your Documents library, so it cannot be regenerated.'
            );
            return;
        }
        setBusyAction('regenerate');
        const tid = toast.loading('Regenerating summary…');
        try {
            const res = await aiIntelligenceService.regenerate(summary._id);
            if (res?.data) {
                onSummaryUpdate?.(res.data);
                toast.success('Summary regenerated.', { id: tid });
            } else {
                toast.error('Regeneration returned no data.', { id: tid });
            }
        } catch (err) {
            toast.error(err?.message || 'Regeneration failed.', { id: tid });
        } finally {
            setBusyAction(null);
        }
    };

    // ── Download PDF ───────────────────────────────────────────────────────
    const handleDownload = async () => {
        setBusyAction('download');
        const tid = toast.loading('Preparing PDF…');
        try {
            const res = await aiIntelligenceService.downloadPdf(summary._id);
            const url = res?.data?.url;
            if (!url) throw new Error('No PDF URL returned.');
            toast.success('PDF ready.', { id: tid });
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast.error(err?.message || 'Failed to prepare PDF.', { id: tid });
        } finally {
            setBusyAction(null);
        }
    };

    // ── Save to Documents ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (summary.savedToDocuments) {
            toast.success('Already saved to your Documents.');
            return;
        }
        setBusyAction('save');
        const tid = toast.loading('Saving to Documents…');
        try {
            const res = await aiIntelligenceService.saveToDocuments(summary._id);
            if (res?.data?.summary) {
                onSummaryUpdate?.(res.data.summary);
                toast.success('Saved to your Documents.', { id: tid });
            } else {
                toast.error('Save returned no data.', { id: tid });
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to save.', { id: tid });
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <aside className="w-full lg:w-80 lg:shrink-0">
            <div className="sticky top-4 bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                <div className="px-5 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/30">
                        <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-violet-700">AI Actions</h3>
                        <p className="text-[11px] text-purple-500/80">
                            Do more with this summary
                        </p>
                    </div>
                </div>

                <div className="p-4 space-y-2">
                    {/* Ask AI */}
                    <div>
                        <ActionButton
                            icon={MessageSquare}
                            label="Ask AI"
                            onClick={() => toggle('ask')}
                            active={openAction === 'ask'}
                        />
                        <AnimatePresence>
                            {openAction === 'ask' && (
                                <InlinePopover title="Ask a follow-up question" onClose={() => setOpenAction(null)}>
                                    <form onSubmit={handleAsk} className="space-y-2">
                                        <textarea
                                            value={askQuestion}
                                            onChange={(e) => setAskQuestion(e.target.value)}
                                            placeholder="e.g. Can you explain dot product geometrically?"
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border-2 border-purple-200 bg-purple-50/40 text-sm text-slate-900 placeholder-purple-400 focus:outline-none focus:border-purple-500 focus:bg-white resize-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={askLoading || !askQuestion.trim()}
                                            className="w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow shadow-purple-500/25 disabled:opacity-60 active:scale-[0.98]"
                                        >
                                            {askLoading ? (
                                                <Loader2
                                                    className="w-3.5 h-3.5 animate-spin"
                                                    strokeWidth={2.5}
                                                />
                                            ) : (
                                                <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
                                            )}
                                            {askLoading ? 'Thinking…' : 'Ask'}
                                        </button>
                                    </form>
                                    {askAnswer && (
                                        <div className="mt-3 max-h-72 overflow-y-auto px-3 py-2 rounded-lg bg-gradient-to-br from-purple-50/70 to-pink-50/70 border border-purple-100 prose prose-sm max-w-none">
                                            <MarkdownRenderer content={askAnswer} />
                                        </div>
                                    )}
                                </InlinePopover>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Explain Further */}
                    <ActionButton
                        icon={Lightbulb}
                        label={busyAction === 'explain' ? 'Expanding…' : 'Explain Further'}
                        onClick={handleExplainFurther}
                        disabled={busyAction === 'explain'}
                    />

                    {/* Read Aloud */}
                    <ActionButton
                        icon={isSpeaking ? StopCircle : Volume2}
                        label={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                        onClick={handleReadAloud}
                        active={isSpeaking}
                    />

                    {/* Translate */}
                    <div>
                        <ActionButton
                            icon={Languages}
                            label="Translate"
                            onClick={() => toggle('translate')}
                            active={openAction === 'translate'}
                        />
                        <AnimatePresence>
                            {openAction === 'translate' && (
                                <InlinePopover
                                    title="Translate summary"
                                    onClose={() => setOpenAction(null)}
                                >
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'english', label: 'EN' },
                                            { id: 'hindi', label: 'हि' },
                                            { id: 'bengali', label: 'বা' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleTranslate(opt.id)}
                                                disabled={translateLoading}
                                                className="h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-violet-700 font-semibold text-sm transition-all disabled:opacity-60"
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {translateLoading && (
                                        <p className="text-[11px] text-purple-500/80 mt-2 flex items-center gap-1.5">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Translating…
                                        </p>
                                    )}
                                </InlinePopover>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Regenerate */}
                    <ActionButton
                        icon={RefreshCw}
                        label={busyAction === 'regenerate' ? 'Regenerating…' : 'Regenerate'}
                        onClick={handleRegenerate}
                        disabled={busyAction === 'regenerate'}
                    />

                    {/* Download PDF */}
                    <ActionButton
                        icon={Download}
                        label={busyAction === 'download' ? 'Preparing…' : 'Download PDF'}
                        onClick={handleDownload}
                        disabled={busyAction === 'download'}
                    />

                    {/* Save to Documents */}
                    <ActionButton
                        icon={Save}
                        label={
                            summary.savedToDocuments
                                ? 'Saved to Documents ✓'
                                : busyAction === 'save'
                                ? 'Saving…'
                                : 'Save to Documents'
                        }
                        onClick={handleSave}
                        disabled={busyAction === 'save' || summary.savedToDocuments}
                        active={summary.savedToDocuments}
                    />
                </div>
            </div>
        </aside>
    );
};

export default AIActionsSidebar;
