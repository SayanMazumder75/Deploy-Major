import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Sparkles,
    BookOpen,
    Calculator,
    Lightbulb,
    List,
    Network,
    Tag,
    FileText,
    GraduationCap,
    Layers,
    AlertCircle,
    PenSquare,
    HelpCircle,
    Mic,
} from 'lucide-react';
import moment from 'moment';
import toast from 'react-hot-toast';

import aiIntelligenceService from '../../services/aiIntelligenceService';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';
import Spinner from '../../components/common/Spinner';
import AIActionsSidebar from './components/AIActionsSidebar';

// V2 rich-resource viewers — lazy-imported as part of the viewer page so the
// initial bundle for /ai-intelligence (the list/processing screen) doesn't
// pay for them.
import FlashcardsView from './components/viewer/FlashcardsView';
import QuizView from './components/viewer/QuizView';
import VivaView from './components/viewer/VivaView';
import MindMapView from './components/viewer/MindMapView';
import {
    RichDefinitionsView,
    RichFormulasView,
    RichExamplesView,
    KeyConceptsView,
    ExamTipsView,
} from './components/viewer/RichCardsView';

// ─────────────────────────────────────────────────────────────────────────────
// AISummaryViewerPage
//
// Beautiful reading interface for an AI-generated summary. Three-column on
// desktop, stacks on mobile:
//
//   left rail (sections nav)
//     ├── Reading sections     — Full Summary + Chapter Summaries + TOC + …
//     └── Interactive resources — Flashcards, Quiz, Viva, Mind Map, rich card sections (V2 only)
//
//   center
//     ├── For markdown sections: rendered markdown
//     └── For interactive resources: bespoke React components from /components/viewer
//
//   right rail (AIActionsSidebar — Ask AI, Read Aloud, Translate, Regenerate,
//                                  Download PDF, Save to Documents)
//
// The translation banner: when the user clicks Translate, we replace the
// rendered markdown with the translation client-side only. The underlying
// AISummary on the server is unchanged so the user can dismiss the banner
// and return to the original at any time. Interactive resources are
// language-agnostic (they're structured data, not free-form text), so they
// don't need translation.
// ─────────────────────────────────────────────────────────────────────────────

const KIND_ICON = {
    chapter: BookOpen,
    toc: List,
    definitions: Tag,
    concepts: Lightbulb,
    formulas: Calculator,
    examples: FileText,
    tips: GraduationCap,
    mindmap: Network,
};

const KIND_LABEL = {
    chapter: 'Chapter',
    toc: 'Contents',
    definitions: 'Definitions',
    concepts: 'Key Concepts',
    formulas: 'Formulas',
    examples: 'Examples',
    tips: 'Exam Tips',
    mindmap: 'Mind Map',
};

// V2 interactive resource keys — when activeKey starts with `v2:` we render
// a React component in the centre column instead of markdown.
const V2_RESOURCES = [
    {
        id: 'v2:definitions',
        label: 'Definitions',
        icon: Tag,
        present: (s) => (s.richDefinitions || []).length > 0,
    },
    {
        id: 'v2:formulas',
        label: 'Formulas',
        icon: Calculator,
        present: (s) => (s.richFormulas || []).length > 0,
    },
    {
        id: 'v2:examples',
        label: 'Examples',
        icon: BookOpen,
        present: (s) => (s.richExamples || []).length > 0,
    },
    {
        id: 'v2:concepts',
        label: 'Key Concepts',
        icon: Lightbulb,
        present: (s) => (s.keyConcepts || []).length > 0,
    },
    {
        id: 'v2:tips',
        label: 'Exam Tips',
        icon: GraduationCap,
        present: (s) => (s.examTips || []).length > 0,
    },
    {
        id: 'v2:flashcards',
        label: 'Flashcards',
        icon: PenSquare,
        present: (s) => (s.flashcards || []).length > 0,
        badge: (s) => (s.flashcards || []).length,
    },
    {
        id: 'v2:quiz',
        label: 'Practice Quiz',
        icon: HelpCircle,
        present: (s) => (s.quiz || []).length > 0,
        badge: (s) => (s.quiz || []).length,
    },
    {
        id: 'v2:viva',
        label: 'Viva Questions',
        icon: Mic,
        present: (s) => (s.vivaQuestions || []).length > 0,
        badge: (s) => (s.vivaQuestions || []).length,
    },
    {
        id: 'v2:mindmap',
        label: 'Mind Map',
        icon: Network,
        present: (s) => Boolean(s.mindmap?.mermaid || s.mindmap?.outlineMarkdown),
    },
];

const AISummaryViewerPage = () => {
    const { id } = useParams();

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeKey, setActiveKey] = useState('__all__'); // 'all' | 'idx:N' | 'group:KIND' | 'v2:*'
    const [translation, setTranslation] = useState(null); // { targetLanguage, markdown } | null

    const centerScrollRef = useRef(null);

    // ── fetch summary ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await aiIntelligenceService.getById(id);
                if (cancelled) return;
                if (!res?.data) {
                    setError('Summary not found.');
                } else {
                    setSummary(res.data);
                }
            } catch (err) {
                if (cancelled) return;
                setError(err?.message || 'Failed to load summary.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    // V1 sections list — kept for backwards compat with summaries generated
    // before the V2 rich shapes were introduced.
    const sections = useMemo(() => summary?.sections || [], [summary]);

    const railGroups = useMemo(() => {
        const groups = {};
        sections.forEach((s, idx) => {
            const cat = s.kind;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push({ idx, title: s.title });
        });
        return groups;
    }, [sections]);

    const ORDER = [
        'toc',
        'chapter',
        'definitions',
        'concepts',
        'formulas',
        'examples',
        'mindmap',
        'tips',
    ];

    // V2 resource entries available for THIS summary (only the ones with data).
    const availableV2Resources = useMemo(() => {
        if (!summary) return [];
        return V2_RESOURCES.filter((r) => r.present(summary));
    }, [summary]);

    const handleSelect = (key) => {
        setActiveKey(key);
        if (centerScrollRef.current) centerScrollRef.current.scrollTop = 0;
    };

    // What to render in the center column.
    const renderedMarkdown = useMemo(() => {
        if (!summary) return '';
        if (translation) return translation.markdown;
        if (activeKey === '__all__') {
            return sections
                .map((s) => `# ${s.title}\n\n${s.content}`)
                .join('\n\n---\n\n');
        }
        if (typeof activeKey === 'string' && activeKey.startsWith('idx:')) {
            const i = parseInt(activeKey.slice(4), 10);
            const s = sections[i];
            if (s) return `# ${s.title}\n\n${s.content}`;
        }
        if (activeKey.startsWith('group:')) {
            const cat = activeKey.slice(6);
            return sections
                .filter((s) => s.kind === cat)
                .map((s) => `# ${s.title}\n\n${s.content}`)
                .join('\n\n---\n\n');
        }
        return summary.rawMarkdown || '';
    }, [summary, sections, activeKey, translation]);

    // What to render in the center column when an interactive V2 resource is
    // selected — a React component instead of markdown.
    const renderActiveV2Resource = () => {
        if (!summary || !activeKey.startsWith('v2:')) return null;
        switch (activeKey) {
            case 'v2:definitions':
                return <RichDefinitionsView definitions={summary.richDefinitions} />;
            case 'v2:formulas':
                return <RichFormulasView formulas={summary.richFormulas} />;
            case 'v2:examples':
                return <RichExamplesView examples={summary.richExamples} />;
            case 'v2:concepts':
                return <KeyConceptsView concepts={summary.keyConcepts} />;
            case 'v2:tips':
                return <ExamTipsView tips={summary.examTips} />;
            case 'v2:flashcards':
                return <FlashcardsView flashcards={summary.flashcards} />;
            case 'v2:quiz':
                return <QuizView quiz={summary.quiz} />;
            case 'v2:viva':
                return <VivaView vivaQuestions={summary.vivaQuestions} />;
            case 'v2:mindmap':
                return <MindMapView mindmap={summary.mindmap} />;
            default:
                return null;
        }
    };

    const handleTranslate = ({ targetLanguage, markdown }) => {
        setTranslation({ targetLanguage, markdown });
        // Bounce back to markdown view since translation only applies there.
        setActiveKey('__all__');
    };

    const clearTranslation = () => setTranslation(null);

    const handleSummaryUpdate = (next) => {
        setSummary(next);
        setTranslation(null);
        toast.success(next.savedToDocuments ? 'Saved.' : 'Summary updated.');
    };

    // ── render ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 p-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <h2 className="text-lg font-semibold text-violet-700 mb-2">
                        Unable to load summary
                    </h2>
                    <p className="text-sm text-purple-500/80 mb-4">
                        {error || 'Not found.'}
                    </p>
                    <Link
                        to="/ai-intelligence"
                        className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold shadow shadow-purple-500/25"
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
                        Back to AI Intelligence
                    </Link>
                </div>
            </div>
        );
    }

    const showInteractive = activeKey.startsWith('v2:');

    return (
        <div className="min-h-screen p-2 sm:p-4 space-y-4">
            <div>
                <Link
                    to="/ai-intelligence"
                    className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-violet-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
                    Back to AI Intelligence
                </Link>
            </div>

            {/* hero */}
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 px-6 py-5 shadow-xl shadow-purple-500/30"
            >
                <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="relative flex flex-wrap items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-semibold text-white tracking-tight truncate">
                            {summary.sourceTitle}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/85">
                            <span>{summary.summaryPageCount || 1} Pages</span>
                            {summary.originalPageCount > 0 && (
                                <span>
                                    Compressed from {summary.originalPageCount} →{' '}
                                    {summary.summaryPageCount || 1}
                                </span>
                            )}
                            <span>
                                {summary.insights?.estimatedReadingTime || 1} min read
                            </span>
                            <span>Generated {moment(summary.createdAt).fromNow()}</span>
                            {summary.savedToDocuments && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-white/20">
                                    Saved to Documents
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {translation && !showInteractive && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-purple-200/60 bg-white/80 backdrop-blur-xl px-4 py-2.5"
                >
                    <p className="text-sm text-violet-700">
                        Showing{' '}
                        <span className="font-semibold">
                            {translation.targetLanguage}
                        </span>{' '}
                        translation. Original is preserved on the server.
                    </p>
                    <button
                        type="button"
                        onClick={clearTranslation}
                        className="text-xs font-semibold text-purple-600 hover:text-violet-700"
                    >
                        Show original
                    </button>
                </motion.div>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
                {/* ── left rail (sections nav) ─── */}
                <aside className="lg:w-72 lg:shrink-0">
                    <div className="sticky top-4 bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">
                        <div className="px-5 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
                            <h3 className="text-sm font-semibold text-violet-700 flex items-center gap-2">
                                <Layers
                                    className="w-4 h-4 text-purple-500"
                                    strokeWidth={2.2}
                                />
                                Sections
                            </h3>
                            <p className="text-[11px] text-purple-500/80">
                                Jump straight to a section
                            </p>
                        </div>

                        <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
                            {/* Markdown reading sections */}
                            <RailButton
                                active={activeKey === '__all__'}
                                icon={Sparkles}
                                onClick={() => handleSelect('__all__')}
                            >
                                Full Summary
                            </RailButton>

                            {ORDER.map((kind) => {
                                const items = railGroups[kind];
                                if (!items?.length) return null;
                                const Icon = KIND_ICON[kind] || BookOpen;

                                if (items.length === 1) {
                                    const item = items[0];
                                    const key = `idx:${item.idx}`;
                                    return (
                                        <RailButton
                                            key={key}
                                            active={activeKey === key}
                                            icon={Icon}
                                            onClick={() => handleSelect(key)}
                                        >
                                            {KIND_LABEL[kind] || item.title}
                                        </RailButton>
                                    );
                                }

                                return (
                                    <div key={kind}>
                                        <RailButton
                                            active={activeKey === `group:${kind}`}
                                            icon={Icon}
                                            onClick={() =>
                                                handleSelect(`group:${kind}`)
                                            }
                                        >
                                            {KIND_LABEL[kind] || kind}
                                            <span className="ml-auto text-[10px] font-bold text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-md">
                                                {items.length}
                                            </span>
                                        </RailButton>
                                        <ul className="ml-3 mt-1 space-y-1 border-l-2 border-purple-100 pl-2">
                                            {items.map((item) => {
                                                const key = `idx:${item.idx}`;
                                                return (
                                                    <li key={key}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSelect(key)
                                                            }
                                                            className={`w-full text-left text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                                                                activeKey === key
                                                                    ? 'text-violet-700 bg-purple-50'
                                                                    : 'text-purple-500/80 hover:text-violet-700 hover:bg-purple-50/50'
                                                            }`}
                                                            title={item.title}
                                                        >
                                                            <span className="truncate block">
                                                                {item.title}
                                                            </span>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                );
                            })}

                            {/* V2 interactive resources */}
                            {availableV2Resources.length > 0 && (
                                <div className="pt-3 mt-2 border-t border-purple-200/40">
                                    <p className="px-2 mb-2 text-[10px] uppercase tracking-wide font-bold text-purple-400">
                                        Interactive
                                    </p>
                                    <div className="space-y-1">
                                        {availableV2Resources.map((r) => {
                                            const Icon = r.icon || Sparkles;
                                            const badge = r.badge?.(summary);
                                            return (
                                                <RailButton
                                                    key={r.id}
                                                    active={activeKey === r.id}
                                                    icon={Icon}
                                                    onClick={() => handleSelect(r.id)}
                                                >
                                                    {r.label}
                                                    {typeof badge === 'number' && (
                                                        <span className="ml-auto text-[10px] font-bold text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-md">
                                                            {badge}
                                                        </span>
                                                    )}
                                                </RailButton>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── center column ─── */}
                <main className="flex-1 min-w-0">
                    <div
                        ref={centerScrollRef}
                        className="bg-white/85 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 p-6 md:p-8 max-h-[80vh] overflow-y-auto"
                    >
                        {showInteractive ? (
                            renderActiveV2Resource()
                        ) : (
                            <div className="prose prose-slate max-w-none prose-headings:text-violet-700 prose-headings:tracking-tight prose-h1:border-b prose-h1:border-purple-200 prose-h1:pb-2 prose-strong:text-fuchsia-700 prose-a:text-purple-600">
                                <MarkdownRenderer content={renderedMarkdown} />
                            </div>
                        )}
                    </div>
                </main>

                {/* ── right rail (AI Actions) ─── */}
                <AIActionsSidebar
                    summary={summary}
                    onSummaryUpdate={handleSummaryUpdate}
                    onTranslate={handleTranslate}
                />
            </div>
        </div>
    );
};

// ── small rail button ───────────────────────────────────────────────────────
const RailButton = ({ active, icon: Icon, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold transition-all duration-200 ${
            active
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-violet-700 border-2 border-purple-300'
                : 'border-2 border-transparent text-violet-700 hover:bg-purple-50/50'
        }`}
    >
        <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                active
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow shadow-purple-500/25'
                    : 'bg-purple-100'
            }`}
        >
            <Icon
                className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-purple-500'}`}
                strokeWidth={2.2}
            />
        </span>
        <span className="flex-1 min-w-0 truncate flex items-center gap-2">
            {children}
        </span>
    </button>
);

export default AISummaryViewerPage;
