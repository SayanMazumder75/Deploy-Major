import React, { useEffect, useState } from "react";
import aiService from "../../services/aiService";
import ReactMarkdown from "react-markdown";
import { Sparkles, Brain, FileText, BookOpen, GraduationCap } from "lucide-react";

const StudyVaultPage = () => {
    const [resources, setResources] = useState([]);
    const [selectedResource, setSelectedResource] = useState(null);
    const [expandedView, setExpandedView] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, resourceId: null });

    const groupedResources = resources.reduce((acc, resource) => {
        const docId = resource.documentId;
        if (!acc[docId]) {
            acc[docId] = {
                title: resource.title.split(" Summary")[0]
                    .split(" Viva")[0]
                    .split(" Revision")[0]
                    .split(" Memory")[0],
                resources: [],
            };
        }
        acc[docId].resources.push(resource);
        return acc;
    }, {});

    const handleDeleteResource = async () => {
        try {
            await aiService.deleteAIResource(deleteModal.resourceId);
            setResources((prev) => prev.filter((r) => r._id !== deleteModal.resourceId));
            setDeleteModal({ open: false, resourceId: null });
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const response = await aiService.getAIResources();
                setResources(response.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchResources();
    }, []);

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 p-8 shadow-2xl shadow-purple-300/40 dark:shadow-purple-900/50 mb-8">
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg">
                                <Sparkles className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold text-white">Study Vault</h1>
                                <p className="text-purple-100 mt-1">Your AI-powered personal learning library</p>
                            </div>
                        </div>
                        <p className="max-w-2xl text-sm md:text-base text-purple-100 leading-relaxed">
                            Access all your AI-generated summaries, revision notes, viva questions, and memory tricks in one intelligent space.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center justify-center w-32 h-32 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
                        <Brain className="w-14 h-14 text-white" />
                    </div>
                </div>
            </div>

            {/* Resource Grid */}
            <div className="space-y-8">
                {Object.entries(groupedResources).map(([docId, group]) => (
                    <div
                        key={docId}
                        className="rounded-3xl border border-purple-100 dark:border-purple-800/40 bg-white dark:bg-slate-900 shadow-xl dark:shadow-purple-900/30 p-6 transition-colors duration-300"
                    >
                        {/* Document Header */}
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-violet-800 dark:text-purple-300">
                                    {group.title}
                                </h2>
                                <p className="text-purple-500 dark:text-purple-400 mt-1">
                                    {group.resources.length} AI resources available
                                </p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center shadow-lg">
                                <Brain className="w-7 h-7 text-white" />
                            </div>
                        </div>

                        {/* Resources */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
                            {group.resources.map((resource, i) => {
                                let Icon = FileText;
                                let gradient = "from-violet-500 to-pink-500";
                                let lightBg = "bg-violet-50";
                                let darkBg = "dark:bg-violet-950/60";
                                let lightBorder = "border-violet-100";
                                let darkBorder = "dark:border-violet-800/50";

                                if (resource.type === "viva") {
                                    Icon = GraduationCap;
                                    gradient = "from-pink-500 to-purple-500";
                                    lightBg = "bg-pink-50";
                                    darkBg = "dark:bg-pink-950/60";
                                    lightBorder = "border-pink-100";
                                    darkBorder = "dark:border-pink-800/50";
                                }
                                if (resource.type === "memory") {
                                    Icon = Brain;
                                    gradient = "from-yellow-500 to-pink-500";
                                    lightBg = "bg-yellow-50";
                                    darkBg = "dark:bg-yellow-950/40";
                                    lightBorder = "border-yellow-100";
                                    darkBorder = "dark:border-yellow-800/40";
                                }
                                if (resource.type === "revision") {
                                    Icon = BookOpen;
                                    gradient = "from-purple-500 to-indigo-500";
                                    lightBg = "bg-purple-50";
                                    darkBg = "dark:bg-purple-950/60";
                                    lightBorder = "border-purple-100";
                                    darkBorder = "dark:border-purple-800/50";
                                }

                                return (
                                    <div
                                        key={i}
                                        className={`rounded-2xl ${lightBg} ${darkBg} border ${lightBorder} ${darkBorder} p-4 shadow-md hover:shadow-xl dark:hover:shadow-purple-900/40 transition-all duration-300`}
                                    >
                                        {/* Delete Button */}
                                        <div className="flex justify-end mb-2">
                                            <button
                                                onClick={() => setDeleteModal({ open: true, resourceId: resource._id })}
                                                className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 flex items-center justify-center shadow-sm"
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-md mb-4`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>

                                        {/* Type Label */}
                                        <p className="text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400 font-semibold mb-2">
                                            {resource.type}
                                        </p>

                                        {/* Title */}
                                        <h3 className="text-base font-bold text-violet-800 dark:text-purple-200 mb-3">
                                            {resource.title}
                                        </h3>

                                        {/* Open Button */}
                                        <button
                                            onClick={() => setSelectedResource(resource)}
                                            className={`w-full h-9 rounded-xl bg-gradient-to-r ${gradient} text-white font-semibold shadow-lg hover:scale-[1.02] transition-all duration-200`}
                                        >
                                            Open Resource
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {Object.keys(groupedResources).length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center shadow-xl mb-6">
                        <Brain className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-violet-800 dark:text-purple-300 mb-2">No Resources Yet</h3>
                    <p className="text-gray-500 dark:text-slate-400 max-w-sm">
                        Upload a document and generate AI resources to see them here.
                    </p>
                </div>
            )}

            {/* Resource Modal */}
            {selectedResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`relative w-full overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl dark:shadow-purple-900/50 border border-purple-100 dark:border-purple-800/40 transition-all duration-300 ${expandedView ? "max-w-7xl h-[96vh]" : "max-w-3xl max-h-[90vh]"}`}>

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-100 dark:border-purple-800/40 bg-gradient-to-r from-violet-500 to-pink-500">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-purple-100 font-semibold">
                                    {selectedResource.type}
                                </p>
                                <h2 className="text-2xl font-bold text-white">
                                    {selectedResource.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setExpandedView(!expandedView)}
                                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xl transition-all duration-200"
                                >
                                    {expandedView ? "🗕" : "🗖"}
                                </button>
                                <button
                                    onClick={() => setSelectedResource(null)}
                                    className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xl transition-all duration-200"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className={`overflow-y-auto px-12 py-10 bg-white dark:bg-slate-900 ${expandedView ? "max-h-[85vh]" : "max-h-[70vh]"}`}>
                            <div className="prose prose-lg max-w-none
                                prose-headings:text-violet-700 dark:prose-headings:text-purple-300
                                prose-headings:font-bold prose-headings:mb-6 prose-headings:mt-12
                                prose-p:text-gray-700 dark:prose-p:text-slate-300
                                prose-p:leading-9 prose-p:mb-6
                                prose-strong:text-violet-800 dark:prose-strong:text-purple-300
                                prose-li:text-gray-700 dark:prose-li:text-slate-300
                                prose-li:mb-3 prose-ul:my-6 prose-ol:my-6 prose-hr:my-10
                                prose-hr:border-purple-100 dark:prose-hr:border-purple-800/40
                                tracking-wide
                            ">
                                <ReactMarkdown
                                    components={{
                                        h2: ({ children }) => (
                                            <div className="mt-12 mb-8">
                                                <div className="inline-block px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold text-xl shadow-lg">
                                                    {children}
                                                </div>
                                            </div>
                                        ),
                                        p: ({ children }) => (
                                            <p className="mb-6 leading-9 text-gray-700 dark:text-slate-300">
                                                {children}
                                            </p>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="space-y-6 my-8 list-decimal pl-6 text-gray-800 dark:text-slate-300">
                                                {children}
                                            </ol>
                                        ),
                                        li: ({ children }) => (
                                            <li className="leading-8 text-lg">{children}</li>
                                        ),
                                    }}
                                >
                                    {selectedResource.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-800/40 shadow-2xl dark:shadow-purple-900/50 overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-white">
                            <h2 className="text-2xl font-bold">Delete Resource</h2>
                            <p className="text-white/80 mt-1">This action cannot be undone.</p>
                        </div>
                        <div className="p-6 bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-4xl">
                                    🗑️
                                </div>
                            </div>
                            <p className="text-center text-gray-600 dark:text-slate-400 text-lg leading-relaxed">
                                Are you sure you want to permanently delete this study resource?
                            </p>
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => setDeleteModal({ open: false, resourceId: null })}
                                    className="flex-1 h-12 rounded-2xl border border-gray-200 dark:border-slate-700 font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteResource}
                                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold shadow-lg hover:scale-[1.02] transition-all duration-200"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyVaultPage;