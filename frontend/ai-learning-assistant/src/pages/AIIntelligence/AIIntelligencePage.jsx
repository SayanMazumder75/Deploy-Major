import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    BrainCircuit,
    CheckCircle2,
    FileText,
    Sparkles,
    Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import aiIntelligenceService from '../../services/aiIntelligenceService';
import SourcePicker from './components/SourcePicker';
import SummarySettings from './components/SummarySettings';
import { DEFAULT_SETTINGS } from './components/summarySettingsDefaults';
import ProcessingScreen from './components/ProcessingScreen';
import ResultsDashboard from './components/ResultsDashboard';
import HistoryList from './components/HistoryList';

const AIIntelligencePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [view, setView] = useState('idle');
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [source, setSource] = useState(null);
    const [pendingSummaryId, setPendingSummaryId] = useState(null);
    const [activeSummary, setActiveSummary] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [savingToDocs, setSavingToDocs] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const sourceLabel = source?.label || activeSummary?.sourceTitle || 'Document.pdf';

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
        queueMicrotask(fetchHistory);
    }, []);

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
        navigate(location.pathname, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state?.reopenId]);

    const canGenerate = !!source && !generating;

    const startGeneration = async () => {
        if (!source) {
            toast.error('Pick a document or upload a PDF first.');
            return;
        }

        setActiveSummary(null);
        setPendingSummaryId(null);
        setView('processing');
        setGenerating(true);

        try {
            const res = await aiIntelligenceService.generate({
                source:
                    source.kind === 'file'
                        ? { file: source.file, title: source.title }
                        : { documentId: source.documentId, title: source.label },
                settings,
            });
            const summaryId = res?.data?.summaryId;
            if (!summaryId) throw new Error('Generation did not return a summary id.');
            setPendingSummaryId(summaryId);
            fetchHistory();
        } catch (err) {
            console.error('AI summary generation failed:', err);
            toast.error(err?.message || err?.error || 'Failed to generate summary.');
            setView('idle');
            setGenerating(false);
        }
    };

    const handleProcessingComplete = async () => {
        if (!pendingSummaryId) return;
        try {
            const res = await aiIntelligenceService.getById(pendingSummaryId);
            const summary = res?.data;
            if (!summary) throw new Error('Generation completed but the summary could not be loaded.');
            setActiveSummary(summary);
            setView('results');
            fetchHistory();
        } catch (err) {
            console.error('Post-completion fetch failed:', err);
            toast.error(err?.message || 'Failed to load the generated summary.');
            setView('idle');
        } finally {
            setGenerating(false);
        }
    };

    const handleProcessingFailed = (errMsg) => {
        toast.error(`Generation failed: ${errMsg || 'unknown error'}`);
        setView('idle');
        setGenerating(false);
        fetchHistory();
    };

    const handleView = () => {
        if (activeSummary?._id) navigate(`/ai-intelligence/${activeSummary._id}`);
    };

    const handleDownload = async () => {
        if (!activeSummary?._id) return;
        const tid = toast.loading('Preparing PDF...');
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

    const handleSaveToDocuments = async () => {
        if (!activeSummary?._id || activeSummary.savedToDocuments) return;
        setSavingToDocs(true);
        const tid = toast.loading('Saving to Documents...');
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

    const handleGenerateAgain = () => {
        setActiveSummary(null);
        setPendingSummaryId(null);
        setView('idle');
    };

    const handleDeleteHistory = async (item) => {
        const tid = toast.loading('Deleting...');
        try {
            await aiIntelligenceService.remove(item._id);
            setHistory((h) => h.filter((row) => row._id !== item._id));
            toast.success('Deleted.', { id: tid });
        } catch (err) {
            toast.error(err?.message || 'Delete failed.', { id: tid });
        }
    };

    return (
        <div className="ai-intelligence relative min-h-full overflow-hidden rounded-[28px] border border-purple-200 bg-[#faf7ff] text-violet-950 shadow-2xl shadow-purple-200/40 dark:border-white/15 dark:bg-[#17072f] dark:text-white dark:shadow-purple-950/30 transition-colors duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(236,72,153,0.12),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.16),transparent_30%),linear-gradient(135deg,rgba(250,247,255,0.98),rgba(255,255,255,0.98)_52%,rgba(253,244,255,0.96))] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(236,72,153,0.28),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(168,85,247,0.34),transparent_30%),linear-gradient(135deg,rgba(54,18,103,0.98),rgba(23,7,47,0.98)_52%,rgba(72,20,118,0.96))]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/70 to-transparent dark:via-white/60" />

            <div className="relative p-4 sm:p-6 xl:p-8">
                <motion.header
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
                >
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-700 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-purple-100">
                            <Sparkles className="h-3.5 w-3.5 text-fuchsia-500 dark:text-fuchsia-200" strokeWidth={2.4} />
                            MeetMind AI Workspace
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border border-purple-200 bg-white/80 shadow-xl shadow-purple-200/50 backdrop-blur-xl dark:border-white/20 dark:bg-white/15 dark:shadow-fuchsia-950/30">
                                <BrainCircuit className="h-7 w-7 text-fuchsia-600 dark:text-fuchsia-100" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-violet-950 dark:text-white sm:text-4xl">
                                    AI Document Intelligence
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-700 dark:text-purple-100/80">
                                    Upload a PDF or choose from Documents, tune the summary output,
                                    then generate a study-ready AI package from the same trusted flow.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-purple-200 bg-white/80 p-2 shadow-lg shadow-purple-200/30 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:shadow-none">
                        <Metric icon={FileText} label="Source" value={source ? 'Selected' : 'Needed'} />
                        <Metric icon={Wand2} label="Mode" value={settings.summaryLength === 'auto' ? 'Auto' : `${settings.summaryLength}p`} />
                        <Metric icon={CheckCircle2} label="History" value={history.length} />
                    </div>
                </motion.header>

                <AnimatePresence mode="wait">
                    {view === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.4fr)]"
                        >
                            <div className="space-y-5">
                                <SourcePicker value={source} onChange={setSource} disabled={generating} />
                                <GenerateCTA
                                    disabled={!canGenerate}
                                    source={source}
                                    settings={settings}
                                    onClick={startGeneration}
                                />
                            </div>
                            <SummarySettings
                                value={settings}
                                onChange={setSettings}
                                disabled={generating}
                            />
                        </motion.div>
                    )}

                    {view === 'processing' && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                        >
                            <ProcessingScreen
                                summaryId={pendingSummaryId}
                                fileLabel={sourceLabel}
                                onPipelineComplete={handleProcessingComplete}
                                onPipelineFailed={handleProcessingFailed}
                            />
                        </motion.div>
                    )}

                    {view === 'results' && activeSummary && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
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

                <div className="mt-5">
                    <HistoryList
                        items={history}
                        loading={historyLoading}
                        onDelete={handleDeleteHistory}
                        onRefresh={fetchHistory}
                    />
                </div>
            </div>
        </div>
    );
};

const Metric = ({ icon: Icon, label, value }) => (
    <div className="min-w-0 rounded-xl border border-purple-100 bg-purple-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/10">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-500 dark:text-purple-100/65">
            <Icon className="h-3.5 w-3.5 text-fuchsia-500 dark:text-fuchsia-200" strokeWidth={2.4} />
            {label}
        </div>
        <div className="mt-1 truncate text-sm font-bold text-violet-900 dark:text-white">{value}</div>
    </div>
);

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
        <motion.section
            whileHover={!disabled ? { y: -2 } : undefined}
            className="overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl shadow-purple-950/25 backdrop-blur-2xl"
        >
            <div className="border-b border-white/10 bg-gradient-to-r from-fuchsia-500/20 via-purple-500/20 to-violet-500/20 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-fuchsia-100">
                    <Wand2 className="h-4 w-4" strokeWidth={2.4} />
                    Generate Button
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">Create AI Summary</h2>
                <p className="mt-1 text-sm leading-5 text-purple-100/75">
                    Starts the existing backend generation flow with your selected source and settings.
                </p>
            </div>

            <div className="space-y-3 p-5">
                <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-purple-100/65">Source</span>
                        <span className="min-w-0 truncate font-semibold text-white">
                            {source?.label || 'No source selected'}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-purple-100/65">Settings</span>
                        <span className="font-semibold text-white">
                            {studyGoalLabels[settings.studyGoal] || 'Custom'} /{' '}
                            {lengthLabels[settings.summaryLength] || 'Custom'}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    disabled={disabled}
                    onClick={onClick}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-400 px-4 text-sm font-bold text-white shadow-xl shadow-fuchsia-950/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                    Generate Summary
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </button>
            </div>
        </motion.section>
    );
};

export default AIIntelligencePage;
