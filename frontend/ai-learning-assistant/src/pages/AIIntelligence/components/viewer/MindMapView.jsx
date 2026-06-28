import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Network, AlertTriangle, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownRenderer from '../../../../components/common/MarkdownRenderer';

// ─────────────────────────────────────────────────────────────────────────────
// MindMapView
//
// Renders the AI-generated Mermaid mindmap with mermaid.js for an interactive
// SVG diagram, plus a textual outline fallback below it. If mermaid.js fails
// to render (invalid syntax, network issue, etc.) we surface a friendly
// error + still show the outline + Mermaid source so the user gets value.
//
// mermaid.js is imported dynamically so it doesn't bloat the main bundle —
// only users who open a summary that has a mindmap pay for the ~400KB.
// ─────────────────────────────────────────────────────────────────────────────

const MindMapView = ({ mindmap }) => {
    const containerRef = useRef(null);
    const [svg, setSvg] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const render = async () => {
            if (!mindmap?.mermaid) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const mod = await import('mermaid');
                const mermaid = mod.default || mod;
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'strict',
                    fontFamily:
                        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                });
                // mermaid.render requires a unique id per call — we use a
                // timestamp so successive regenerations don't clash.
                const renderId = `aim-mindmap-${Date.now()}`;
                const result = await mermaid.render(renderId, mindmap.mermaid);
                if (cancelled) return;
                setSvg(result.svg || '');
            } catch (err) {
                if (cancelled) return;
                setError(err?.message || 'Failed to render mind map.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        render();
        return () => {
            cancelled = true;
        };
    }, [mindmap?.mermaid]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(mindmap?.mermaid || '');
            setCopied(true);
            toast.success('Mermaid source copied.');
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error('Copy failed.');
        }
    };

    if (!mindmap || (!mindmap.mermaid && !mindmap.outlineMarkdown)) {
        return (
            <div className="text-sm text-purple-500/80">
                No mind map was generated for this summary.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-purple-200/60 bg-white/90 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Network className="w-4 h-4 text-purple-500" strokeWidth={2.2} />
                    <h3 className="text-sm font-semibold text-violet-700">
                        Interactive Mind Map
                    </h3>
                </div>
                {loading ? (
                    <div className="flex items-center gap-2 text-purple-500/80 text-sm py-8 justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Rendering mind map…
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            strokeWidth={2.2}
                        />
                        <div>
                            <p className="font-semibold">Mind map rendering failed</p>
                            <p className="text-xs mt-0.5 opacity-80">{error}</p>
                            <p className="text-xs mt-1 opacity-70">
                                The textual outline below still works.
                            </p>
                        </div>
                    </div>
                ) : svg ? (
                    <motion.div
                        ref={containerRef}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="mindmap-svg-host overflow-x-auto"
                        // mermaid emits a self-contained SVG — safe to inject.
                        // Note: mermaid is initialised with securityLevel:'strict'
                        // which sanitises content before rendering.
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                ) : null}
            </div>

            {mindmap.outlineMarkdown && (
                <div className="rounded-2xl border border-purple-200/60 bg-white/90 p-4 sm:p-6">
                    <h3 className="text-sm font-semibold text-violet-700 mb-2">
                        Outline
                    </h3>
                    <div className="prose prose-sm max-w-none prose-headings:text-violet-700">
                        <MarkdownRenderer content={mindmap.outlineMarkdown} />
                    </div>
                </div>
            )}

            {mindmap.mermaid && (
                <div className="rounded-2xl border border-purple-200/60 bg-slate-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-purple-200/40 bg-slate-100/50">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Mermaid source
                        </span>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-violet-700 hover:bg-purple-100 transition-colors"
                        >
                            {copied ? (
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                            ) : (
                                <Copy className="w-3 h-3" strokeWidth={2.2} />
                            )}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <pre className="text-[12px] leading-relaxed font-mono text-slate-700 p-4 overflow-x-auto whitespace-pre">
                        {mindmap.mermaid}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default MindMapView;
