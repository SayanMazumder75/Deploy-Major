import React, { useEffect, useState } from "react";
// import aiService from "../../services/aiService";
// import * as aiService from "../../services/aiService";
import aiService from "../../services/aiService";
import ReactMarkdown from "react-markdown";

import {
    Sparkles,
    Brain,
    FileText,
    BookOpen,
    GraduationCap,
} from "lucide-react";

const StudyVaultPage = () => {

    const [resources, setResources] = useState([]);

    //For grouping relative docs resources
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
    //Stores:currently opened resource
    const [selectedResource, setSelectedResource] = useState(null);
    //expand
    const [expandedView, setExpandedView] = useState(false);

    //DELETING VAULT
    const [deleteModal, setDeleteModal] = useState({
        open: false,
        resourceId: null,
    });

    //DELETING THE STUDY VAULT
    const handleDeleteResource = async () => {

        try {

            await aiService.deleteAIResource(deleteModal.resourceId);

            setResources((prev) =>
                prev.filter(
                    (resource) => resource._id !== deleteModal.resourceId
                )
            );

            setDeleteModal({
                open: false,
                resourceId: null,
            });

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
        <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-violet-50">

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 p-8 shadow-2xl shadow-purple-300/40 mb-8">

                <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex items-center justify-between flex-wrap gap-6">

                    <div>

                        <div className="flex items-center gap-3 mb-4">

                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-lg">

                                <Sparkles className="w-7 h-7 text-white" />

                            </div>

                            <div>

                                <h1 className="text-4xl font-bold text-white">
                                    Study Vault
                                </h1>

                                <p className="text-purple-100 mt-1">
                                    Your AI-powered personal learning library
                                </p>

                            </div>

                        </div>

                        <p className="max-w-2xl text-sm md:text-base text-purple-100 leading-relaxed">
                            Access all your AI-generated summaries, revision notes,
                            viva questions, and memory tricks in one intelligent space.
                        </p>

                    </div>

                    <div className="hidden md:flex items-center justify-center w-32 h-32 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">

                        <Brain className="w-14 h-14 text-white" />

                    </div>

                </div>

            </div>

            {/* Resource Grid */}
            <div className="space-y-8">

                {Object.entries(groupedResources).map(([docId, group], index) => (

                    <div
                        key={docId}
                        className="rounded-3xl border border-purple-100 bg-white/70 backdrop-blur-xl shadow-xl p-6"
                    >

                        {/* Document Header */}
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">

                            <div>

                                <h2 className="text-3xl font-bold text-violet-800">
                                    {group.title}
                                </h2>

                                <p className="text-purple-500 mt-1">
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
                                let bg = "from-violet-50 to-pink-50";

                                if (resource.type === "viva") {
                                    Icon = GraduationCap;
                                    gradient = "from-pink-500 to-purple-500";
                                    bg = "from-pink-50 to-purple-50";
                                }

                                if (resource.type === "memory") {
                                    Icon = Brain;
                                    gradient = "from-yellow-500 to-pink-500";
                                    bg = "from-yellow-50 to-pink-50";
                                }

                                if (resource.type === "revision") {
                                    Icon = BookOpen;
                                    gradient = "from-purple-500 to-indigo-500";
                                    bg = "from-purple-50 to-indigo-50";
                                }

                                return (

                                    <div
                                        key={i}
                                        className={`rounded-2xl bg-gradient-to-br ${bg} border border-purple-100 p-4 shadow-md hover:shadow-xl transition-all duration-300`}
                                    >

                                        <div className="flex justify-end mb-2">

                                            <button
                                                onClick={() =>
                                                    setDeleteModal({
                                                        open: true,
                                                        resourceId: resource._id,
                                                    })
                                                }
                                                className="w-8 h-8 rounded-lg bg-white/70 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all duration-200 flex items-center justify-center"
                                            >
                                                🗑️
                                            </button>

                                        </div>
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-md mb-4`}>

                                            <Icon className="w-6 h-6 text-white" />

                                        </div>

                                        <p className="text-xs uppercase tracking-wider text-purple-500 font-semibold mb-2">
                                            {resource.type}
                                        </p>

                                        <h3 className="text-base font-bold text-violet-800 mb-3">
                                            {resource.title}
                                        </h3>

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


            {/* Resource Modal */}
            {selectedResource && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

                    <div
                        className={`relative w-full overflow-hidden rounded-3xl bg-[#fcfcfd] shadow-2xl transition-all duration-300 ${expandedView
                            ? "max-w-7xl h-[96vh]"
                            : "max-w-3xl max-h-[90vh]"
                            }`}
                    >

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-100 bg-gradient-to-r from-violet-500 to-pink-500">

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

                        {/* Content */}
                        <div
                            className={`overflow-y-auto px-12 py-10 ${expandedView ? "max-h-[85vh]" : "max-h-[70vh]"
                                }`}
                        >
                            <div className="prose prose-purple max-w-none">

                                <div className="
prose prose-lg max-w-none

prose-headings:text-violet-700
prose-headings:font-bold
prose-headings:mb-6
prose-headings:mt-12

prose-p:text-gray-700
prose-p:leading-9
prose-p:mb-6

prose-strong:text-violet-800

prose-li:text-gray-700
prose-li:mb-3

prose-ul:my-6
prose-ol:my-6

prose-hr:my-10

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
                                                <p className="mb-6 leading-9 text-gray-700">
                                                    {children}
                                                </p>
                                            ),

                                            ol: ({ children }) => (
                                                <ol className="space-y-6 my-8 list-decimal pl-6 text-gray-800">
                                                    {children}
                                                </ol>
                                            ),

                                            li: ({ children }) => (
                                                <li className="leading-8 text-lg">
                                                    {children}
                                                </li>
                                            ),

                                        }}
                                    >
                                        {selectedResource.content}
                                    </ReactMarkdown>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            )}
            {deleteModal.open && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-pink-500 to-red-500 p-6 text-white">

                            <h2 className="text-2xl font-bold">
                                Delete Resource
                            </h2>

                            <p className="text-white/80 mt-1">
                                This action cannot be undone.
                            </p>

                        </div>

                        {/* Body */}
                        <div className="p-6">

                            <div className="flex items-center justify-center mb-6">

                                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-4xl">
                                    🗑️
                                </div>

                            </div>

                            <p className="text-center text-gray-600 text-lg leading-relaxed">
                                Are you sure you want to permanently delete this study resource?
                            </p>

                            {/* Buttons */}
                            <div className="flex gap-4 mt-8">

                                <button
                                    onClick={() =>
                                        setDeleteModal({
                                            open: false,
                                            resourceId: null,
                                        })
                                    }
                                    className="flex-1 h-12 rounded-2xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-all duration-200"
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