import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import aiIntelligenceService from '../../services/aiIntelligenceService';

import SourcePicker from './components/SourcePicker';
import SummarySettings from './components/SummarySettings';
import { DEFAULT_SETTINGS } from './components/summarySettingsDefaults';
import ProcessingScreen from './components/ProcessingScreen';
import ResultsDashboard from './components/ResultsDashboard';
import HistoryList from './components/HistoryList';

// ─────────────────────────────────────────────────────────────────────────────
// AIIntelligencePage
//
// Single orchestrator page for the AI Document Intelligence module. Drives a
// 3-state UI:
//   - idle        → source picker + settings + history
//   - processing  → multi-stage progress screen (history still visible)
//   - results     → results dashboard (compression stats + resources + actions)
//
// The Summary Viewer lives at a sibling route /ai-intelligence/:id so users
// can share a URL or jump straight to a result from the history list. Saving
// to Documents and Regenerating happen from inside the viewer too — this
// page only owns the "first impression" experience.
//
// Routing note: when the user navigates here with `state: { reopenId }` we
// auto-load that summary into the results view (used by the "Generate Again"
// flow from the viewer page).
// ─────────────────────────────────────────────────────────────────────────────

const AIIntelligencePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // view state
    const [view, setView] = useState('idle'); // 'idle' | 'processing' | 'results'

    // generation state
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [source, setSource] = useState(null);
    const [generationDone, setGenerationDone] = useState(false);
    const [activeSummary, setActiveSummary] = useState(null);
    const [generating, setGenerating] = useState(false);

    // results dashboard state
    const [savingToDocs, setSavingToDocs] = useState(false);

    // history
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const sourceLabel = source?.label || activeSummary?.sourceTitle || 'Document.pdf';

    // ── data fetch: history ──────────────────────────────────────────────────
    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const res = await aiIntelligenceService.listHistory();
            setHistory(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to fetch AI Intelligence history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };
    useEffect(() => {
        fetchHistory();
    }, []);

    // ── deep-link via router state: ?reopenId or history nav ────────────────
    useEffect(() => {
        const reopenId = location.state?.reopenId;
        if (!reopenId) return;
        (async () => {
            try {
                const res = await aiIntelligenceService.getById(reopenId);
                if (res?.data?.status === 'completed') {
                    setActiveSummary(res.data);
                    setView('results');
                }
            } catch (err) {
                console.error('Reopen failed:', err);
            }
        })();
        // Clear the router state so a back-nav doesn't loop forever.
        navigate(location.pathname, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state?.reopenId]);

    // ── handlers ─────────────────────────────────────────────────────────────
    const canGenerate = !!source && !generating;

    const startGeneration = async () => {
        if (!source) {
            toast.error('Pick a document or upload a PDF first.');
            return;
        }
        setGenerationDone(false);
        setActiveSummary(null);
        setView('processing');
        setGenerating(true);

        try {
            // Fire-and-await — the ProcessingScreen runs its own animated bars
            // independently, and "isComplete" flips when this promise resolves.
            const res = await aiIntelligenceService.generate({
                source:
                    source.kind === 'file'
                        ? { file: source.file, title: source.title }
                        : { documentId: source.documentId, title: source.label },
                settings,
            });
            const summary = res?.data;
            if (!summary) throw new Error('Generation returned no data.');
            setActiveSummary(summary);
            setGenerationDone(true);
            // Refresh history so the new row appears underneath without a
            // full page reload.
            fetchHistory();
        } catch (err) {
            console.error('AI summary generation failed:', err);
            toast.error(err?.message || err?.error || 'Failed to generate summary.');
            setView('idle');
        } finally {
            setGenerating(false);
        }
    };

    // Called by ProcessingScreen when its bars have all snapped to 100%.
    const handleProcessingComplete = () => {
        if (activeSummary) setView('results');
    };

    // Results dashboard → "View Summary"
    const handleView = () => {
        if (activeSummary?._id) navigate(`/ai-intelligence/${activeSummary._id}`);
    };

    // Results dashboard → "Download PDF"
    const handleDownload = async () => {
        if (!activeSummary?._id) return;
        const tid = toast.loading('Preparing PDF…');
        try {
            const res = await aiIntelligenceService.downloadPdf(activeSummary._id);
            const url = res?.data?.url;
            if (!url) throw new Error('No PDF URL returned.');
            toast.success('PDF ready.', { id: tid });
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast.error(err?.message || 'Failed to prepare PDF.', { id: tid });
        }
    };

    // Results dashboard → "Save to Documents"
    const handleSaveToDocuments = async () => {
        if (!activeSummary?._id || activeSummary.savedToDocuments) return;
        setSavingToDocs(true);
        const tid = toast.loading('Saving to Documents…');
        try {
            const res = await aiIntelligenceService.saveToDocuments(activeSummary._id);
            if (res?.data?.summary) {
                setActiveSummary(res.data.summary);
                toast.success('Saved to your Documents.', { id: tid });
                fetchHistory();
            }
        } catch (err) {
            toast.error(err?.message || 'Failed to save.', { id: tid });
        } finally {
            setSavingToDocs(false);
        }
    };

    // Results dashboard → "Generate Again"
    const handleGenerateAgain = () => {
        setActiveSummary(null);
        setGenerationDone(false);
        setView('idle');
    };

    // History → delete
    const handleDeleteHistory = async (item) => {
        const tid = toast.loading('Deleting…');
        try {
            await aiIntelligenceService.remove(item._id);
            setHistory((h) => h.filter((row) => row._id !== item._id));
            toast.success('Deleted.', { id: tid });
        } catch (err) {
            toast.error(err?.message || 'Delete failed.', { id: tid });
        }
    };

    // ── derived ──────────────────────────────────────────────────────────────
    const realInsights = useMemo(
        () => (generationDone && activeSummary ? activeSummary.insights : null),
        [generationDone, activeSummary]
    );

    // ── render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen w-full p-2 sm:p-4 space-y-6">
            {/* page header */}
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <BrainCircuit className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-violet-700 tracking-tight">
                            AI Document Intelligence
                        </h1>
                        <p className="text-sm text-purple-500/80">
                            Upload large PDFs, generate study-ready summaries, and save what you
                            actually need.
                        </p>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                {view === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        <div className="lg:col-span-1 space-y-6">
                            <SourcePicker value={source} onChange={setSource} disabled={generating} />
                            <GenerateCTA
                                disabled={!canGenerate}
                                source={source}
                                settings={settings}
                                onClick={startGeneration}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <SummarySettings
                                value={settings}
                                onChange={setSettings}
                                disabled={generating}
                            />
                        </div>
                    </motion.div>
                )}

                {view === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <ProcessingScreen
                            fileLabel={sourceLabel}
                            isComplete={generationDone}
                            realInsights={realInsights}
                            onAllStagesComplete={handleProcessingComplete}
                        />
                    </motion.div>
                )}

                {view === 'results' && activeSummary && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                    >
                        <ResultsDashboard
                            summary={activeSummary}
                            saving={savingToDocs}
                            onView={handleView}
                            onDownload={handleDownload}
                            onSaveToDocuments={handleSaveToDocuments}
                            onRegenerateAgain={handleGenerateAgain}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* history rail (always visible) */}
            <HistoryList
                items={history}
                loading={historyLoading}
                onDelete={handleDeleteHistory}
                onRefresh={fetchHistory}
            />
        </div>
    );
};

// ── small inline CTA panel ─────────────────────────────────────────────────
const GenerateCTA = ({ disabled, onClick, source, settings }) => {
    const studyGoalLabels = {
        exam_tomorrow: 'Exam Tomorrow',
        quick_revision: 'Quick Revision',
        detailed_notes: 'Detailed Notes',
        research_mode: 'Research Mode',
        interview_prep: 'Interview Prep',
    };
    const lengthLabels = {
        auto: 'AI Decide',
        2: '2 Pages',
        5: '5 Pages',
        10: '10 Pages',
    };
    return (
        <motion.div
            whileHover={!disabled ? { y: -2 } : undefined}
            className="bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 rounded-2xl p-5 shadow-xl shadow-purple-500/30 text-white"
        >
            <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4" strokeWidth={2.4} />
                <p className="text-xs uppercase tracking-wide font-bold text-white/90">
                    Ready when you are
                </p>
            </div>
            <h3 className="text-lg font-semibold leading-tight">Generate AI Summary</h3>
            <p className="text-xs text-white/85 mt-1">
                Goal:{' '}
                <span className="font-semibold">
                    {studyGoalLabels[settings.studyGoal] || '—'}
                </span>{' '}
                · Length:{' '}
                <span className="font-semibold">
                    {lengthLabels[settings.summaryLength] || '—'}
                </span>
            </p>
            <p className="text-xs text-white/75 mt-2 truncate">
                Source:{' '}
                <span className="font-semibold">
                    {source?.label || 'No source selected'}
                </span>
            </p>
            <button
                type="button"
                disabled={disabled}
                onClick={onClick}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white text-violet-700 font-semibold text-sm shadow-lg shadow-purple-900/20 hover:bg-purple-50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Sparkles className="w-4 h-4" strokeWidth={2.4} />
                Generate Summary
                <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
            </button>
        </motion.div>
    );
};

export default AIIntelligencePage;
