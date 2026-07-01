import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, FileText, Search, Upload, X } from 'lucide-react';
import documentService from '../../../services/documentService';
import Spinner from '../../../components/common/Spinner';

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
        <section
            className={`overflow-hidden rounded-2xl border border-white/20 bg-white/12 shadow-2xl shadow-purple-950/25 backdrop-blur-2xl ${
                disabled ? 'pointer-events-none opacity-60' : ''
            }`}
        >
            <div className="border-b border-white/10 bg-white/8 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-100">
                            Upload Area
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">Choose your source</h2>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                        <Upload className="h-5 w-5 text-fuchsia-100" strokeWidth={2.2} />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/10 p-1">
                    {[
                        { id: 'library', label: 'Documents' },
                        { id: 'upload', label: 'Upload PDF' },
                    ].map((tab) => {
                        const active = mode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setMode(tab.id)}
                                className={`h-9 rounded-lg text-xs font-bold transition-all ${
                                    active
                                        ? 'bg-white text-violet-800 shadow-lg shadow-purple-950/20'
                                        : 'text-purple-100/75 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-5">
                <AnimatePresence mode="wait">
                    {mode === 'library' && (
                        <motion.div
                            key="library"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18 }}
                        >
                            <div className="relative mb-3">
                                <Search
                                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-100/70"
                                    strokeWidth={2}
                                />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search documents"
                                    className="h-11 w-full rounded-xl border border-white/15 bg-white/10 pl-9 pr-3 text-sm text-white placeholder:text-purple-100/45 outline-none transition focus:border-fuchsia-200/70 focus:bg-white/15"
                                />
                            </div>

                            <div className="max-h-80 overflow-y-auto pr-1">
                                {loadingDocs ? (
                                    <div className="flex justify-center py-8">
                                        <Spinner />
                                    </div>
                                ) : filteredDocs.length === 0 ? (
                                    <div className="rounded-xl border border-white/10 bg-white/8 px-4 py-8 text-center text-sm text-purple-100/70">
                                        {docs.length === 0
                                            ? 'No documents found. Switch to Upload PDF to add a one-off source.'
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
                                                        className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                                                            active
                                                                ? 'border-fuchsia-200/70 bg-white text-violet-900 shadow-xl shadow-purple-950/20'
                                                                : 'border-white/10 bg-white/8 text-white hover:border-white/25 hover:bg-white/14'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                                                active
                                                                    ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white'
                                                                    : 'border border-white/10 bg-white/10 text-fuchsia-100'
                                                            }`}
                                                        >
                                                            <FileText className="h-4.5 w-4.5" strokeWidth={2.2} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-bold" title={doc.title}>
                                                                {doc.title}
                                                            </p>
                                                            <p
                                                                className={`mt-0.5 text-[11px] ${
                                                                    active ? 'text-violet-600' : 'text-purple-100/55'
                                                                }`}
                                                            >
                                                                {formatBytes(doc.fileSize) || 'PDF document'}
                                                            </p>
                                                        </div>
                                                        {active && (
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500">
                                                                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                                            </span>
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
                                <div className="flex items-center gap-3 rounded-2xl border border-fuchsia-200/50 bg-white text-violet-900 p-4 shadow-xl shadow-purple-950/20">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white">
                                        <FileText className="h-5 w-5" strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold" title={value.label}>
                                            {value.label}
                                        </p>
                                        <p className="mt-0.5 text-xs font-medium text-violet-500">
                                            {formatBytes(value.fileSize)} / Ready to summarize
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg text-violet-500 transition hover:bg-red-50 hover:text-red-500"
                                        title="Remove selected PDF"
                                    >
                                        <X className="h-4 w-4" strokeWidth={2.2} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    htmlFor="ai-intel-pdf-upload"
                                    className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-fuchsia-200/60 bg-white/8 px-5 py-10 text-center transition hover:border-white/70 hover:bg-white/12"
                                >
                                    <input
                                        id="ai-intel-pdf-upload"
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                    />
                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-violet-500 shadow-xl shadow-fuchsia-950/30">
                                        <Upload className="h-7 w-7 text-white" strokeWidth={2} />
                                    </div>
                                    <p className="text-sm font-bold text-white">Click to upload or drag a PDF</p>
                                    <p className="mt-1 text-xs text-purple-100/60">
                                        PDF up to 100MB / Saved to Documents only when you choose to save it
                                    </p>
                                </label>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default SourcePicker;
