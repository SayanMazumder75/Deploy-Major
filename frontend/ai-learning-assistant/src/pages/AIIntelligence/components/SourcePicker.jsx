import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Search, Check, X } from 'lucide-react';
import documentService from '../../../services/documentService';
import Spinner from '../../../components/common/Spinner';

// ─────────────────────────────────────────────────────────────────────────────
// SourcePicker
//
// Two-mode source selector for the AI Document Intelligence page:
//   1. Pick from existing Documents library (default — uses the same backend
//      endpoint the Documents page hits, so anything the user has previously
//      uploaded is immediately available here).
//   2. Upload a fresh PDF in-line for one-off summarization without polluting
//      the Documents library.
//
// Emits a `source` object compatible with aiIntelligenceService.generate:
//   - { documentId }  (library mode)
//   - { file, title } (upload mode)
// plus a label/file-size for display purposes.
// ─────────────────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
    if (!bytes || bytes < 1) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
};

const SourcePicker = ({ value, onChange, disabled = false }) => {
    const [mode, setMode] = useState(value?.kind === 'file' ? 'upload' : 'library');
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = await documentService.getDocuments();
                if (!cancelled) setDocs(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error('SourcePicker: failed to fetch documents', err);
            } finally {
                if (!cancelled) setLoadingDocs(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredDocs = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return docs;
        return docs.filter((d) => (d.title || '').toLowerCase().includes(q));
    }, [docs, search]);

    const handlePickDocument = (doc) => {
        if (disabled) return;
        onChange({
            kind: 'document',
            documentId: doc._id,
            label: doc.title,
            fileSize: doc.fileSize,
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const title = file.name.replace(/\.pdf$/i, '');
        onChange({ kind: 'file', file, title, label: title, fileSize: file.size });
    };

    const clearFile = () => onChange(null);

    return (
        <div
            className={`relative w-full bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden ${
                disabled ? 'pointer-events-none opacity-60' : ''
            }`}
        >
            <div className="px-6 py-4 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50">
                <h2 className="text-base font-semibold text-violet-700">Source</h2>
                <p className="text-xs text-purple-500/80">Pick a document or upload a new PDF</p>
            </div>

            {/* mode toggle */}
            <div className="px-6 pt-4 flex gap-1.5">
                {[
                    { id: 'library', label: 'From Documents' },
                    { id: 'upload', label: 'Upload PDF' },
                ].map((tab) => {
                    const active = mode === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setMode(tab.id)}
                            className={`relative px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                active
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow shadow-purple-500/25'
                                    : 'bg-purple-50/40 text-violet-700 hover:bg-purple-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="p-6">
                <AnimatePresence mode="wait">
                    {mode === 'library' && (
                        <motion.div
                            key="library"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                        >
                            {/* search */}
                            <div className="relative mb-3">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400"
                                    strokeWidth={2}
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search your documents..."
                                    className="w-full h-10 pl-9 pr-3 rounded-xl border-2 border-purple-200 bg-purple-50/40 text-sm text-slate-900 placeholder-purple-400 focus:outline-none focus:border-purple-500 focus:bg-white"
                                />
                            </div>

                            {/* list */}
                            <div className="max-h-72 overflow-y-auto pr-1 -mr-1">
                                {loadingDocs ? (
                                    <Spinner />
                                ) : filteredDocs.length === 0 ? (
                                    <div className="text-center py-10 text-sm text-purple-500/80">
                                        {docs.length === 0
                                            ? 'No documents yet. Upload one from the Documents page, or switch to "Upload PDF".'
                                            : 'No documents match your search.'}
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {filteredDocs.map((doc) => {
                                            const active =
                                                value?.kind === 'document' &&
                                                value.documentId === doc._id;
                                            return (
                                                <motion.li
                                                    key={doc._id}
                                                    whileHover={{ x: 2 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePickDocument(doc)}
                                                        className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition-all duration-200 text-left ${
                                                            active
                                                                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-400 shadow shadow-purple-200/40'
                                                                : 'bg-white/70 border-purple-100 hover:border-purple-300 hover:bg-purple-50/50'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                                                                active
                                                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow shadow-purple-500/30'
                                                                    : 'bg-gradient-to-br from-purple-100 to-pink-100'
                                                            }`}
                                                        >
                                                            <FileText
                                                                className={`w-4 h-4 ${
                                                                    active
                                                                        ? 'text-white'
                                                                        : 'text-purple-600'
                                                                }`}
                                                                strokeWidth={2.2}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p
                                                                className="text-sm font-semibold text-violet-700 truncate"
                                                                title={doc.title}
                                                            >
                                                                {doc.title}
                                                            </p>
                                                            <p className="text-[11px] text-purple-500/80">
                                                                {formatBytes(doc.fileSize)}
                                                            </p>
                                                        </div>
                                                        {active && (
                                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/40">
                                                                <Check
                                                                    className="w-3 h-3 text-white"
                                                                    strokeWidth={3}
                                                                />
                                                            </div>
                                                        )}
                                                    </button>
                                                </motion.li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {mode === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                        >
                            {value?.kind === 'file' ? (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow shadow-purple-500/30">
                                        <FileText
                                            className="w-5 h-5 text-white"
                                            strokeWidth={2.2}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className="text-sm font-semibold text-violet-700 truncate"
                                            title={value.label}
                                        >
                                            {value.label}
                                        </p>
                                        <p className="text-[11px] text-purple-500/80">
                                            {formatBytes(value.fileSize)} · Ready to summarize
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <X className="w-4 h-4" strokeWidth={2.2} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    htmlFor="ai-intel-pdf-upload"
                                    className="relative flex flex-col items-center justify-center py-10 px-6 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-400 cursor-pointer transition-all"
                                >
                                    <input
                                        id="ai-intel-pdf-upload"
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-3">
                                        <Upload className="w-7 h-7 text-white" strokeWidth={2} />
                                    </div>
                                    <p className="text-sm font-semibold text-violet-700 mb-1">
                                        <span className="text-fuchsia-600">Click to upload</span>{' '}
                                        or drag and drop
                                    </p>
                                    <p className="text-[11px] text-purple-500/80">
                                        PDF up to 10MB · Will not appear in Documents until you
                                        save it
                                    </p>
                                </label>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SourcePicker;
