import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, BookOpen, Lightbulb } from "lucide-react";
import toast from "react-hot-toast";
import aiService from "../../services/aiService";
import MarkdownRenderer from "../common/MarkdownRenderer";
import Modal from "../common/Modal";

const AIActions = () => {

  const { id: documentId } = useParams();

  const [loadingAction, setLoadingAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [concept, setConcept] = useState("");
  // hehhehehe
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerateSummary = async () => {

    setLoadingAction("summary");

    try {

      const { summary } = await aiService.generateSummary(documentId);

      setModalTitle("Generated Summary");
      setModalContent(summary);
      setIsModalOpen(true);

    } catch (error) {

      toast.error("Failed to generate summary.");

    } finally {

      setLoadingAction(null);

    }
  };

  //AI ACTION VIVA
  const handleGenerateViva = async () => {

    setLoadingAction("viva");

    try {

      const response = await aiService.generateVivaQuestions(documentId);

      setModalTitle("Generated Viva Questions");
      setModalContent(response.data);
      setIsModalOpen(true);

    } catch (error) {

      toast.error("Failed to generate viva questions.");

    } finally {

      setLoadingAction(null);

    }
  };

  //For Revison Notes
  const handleGenerateRevisionNotes = async () => {

    setLoadingAction("revision");

    try {

      const response = await aiService.generateRevisionNotes(documentId);

      setModalTitle("Generated Revision Notes");
      setModalContent(response.data);
      setIsModalOpen(true);

    } catch (error) {

      toast.error("Failed to generate revision notes.");

    } finally {

      setLoadingAction(null);

    }
  };

  //Memory Tricks
  const handleGenerateMemoryTricks = async () => {

    setLoadingAction("memory");

    try {

      const response = await aiService.generateMemoryTricks(documentId);

      setModalTitle("Generated Memory Tricks");
      setModalContent(response.data);
      setIsModalOpen(true);

    } catch (error) {

      toast.error("Failed to generate memory tricks.");

    } finally {

      setLoadingAction(null);

    }
  };

  const handleExplainConcept = async (e) => {

    e.preventDefault();

    if (!concept.trim()) {
      toast.error("Please enter a concept to explain.");
      return;
    }

    setLoadingAction("explain");

    try {

      const { explanation } = await aiService.explainConcept(
        documentId,
        concept
      );

      setModalTitle(`Explanation of "${concept}"`);
      setModalContent(explanation);
      setIsModalOpen(true);
      setConcept("");

    } catch (error) {

      toast.error("Failed to explain concept.");

    } finally {

      setLoadingAction(null);

    }
  };

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl border border-purple-200/60 rounded-2xl shadow-xl shadow-purple-200/30 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 flex items-center justify-center">

              <Sparkles
                className="w-5 h-5 text-white"
                strokeWidth={2}
              />

            </div>

            <div>

              <h3 className="text-lg font-semibold text-violet-700">
                AI Assistant
              </h3>

              <p className="text-xs text-purple-500">
                Powered by advanced AI
              </p>

            </div>

          </div>

        </div>

        <div className="p-6 space-y-6">

          {/* Generate Summary */}
          <div className="group p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/50 hover:border-purple-300/60 hover:shadow-md transition-all duration-200">

            <div className="flex items-start justify-between gap-4">

              <div className="flex-1">

                <div className="flex items-center gap-2 mb-2">

                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">

                    <BookOpen
                      className="w-4 h-4 text-purple-600"
                      strokeWidth={2}
                    />

                  </div>

                  <h4 className="font-semibold text-violet-700">
                    Generate Summary
                  </h4>

                </div>

                <p className="text-sm text-purple-600 leading-relaxed">
                  Get a concise summary of the entire document.
                </p>

              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={loadingAction === "summary"}
                className="shrink-0 h-10 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >

                {loadingAction === "summary" ? (

                  <span className="flex items-center gap-2">

                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Loading...

                  </span>

                ) : (
                  "Summarize"
                )}

              </button>

            </div>

          </div>

          {/* Explain Concept */}
          <div className="group p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/50 hover:border-purple-300/60 hover:shadow-md transition-all duration-200">

            <form onSubmit={handleExplainConcept}>

              <div className="flex items-center gap-2 mb-3">

                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">

                  <Lightbulb
                    className="w-4 h-4 text-pink-600"
                    strokeWidth={2}
                  />

                </div>

                <h4 className="font-semibold text-violet-700">
                  Explain a Concept
                </h4>

              </div>

              <p className="text-sm text-purple-600 leading-relaxed mb-4">
                Enter a topic or concept from the document to get a detailed explanation.
              </p>

              <div className="flex items-center gap-3">

                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="e.g., 'what is the meaning of this'"
                  className="flex-1 h-11 px-4 border-2 border-purple-200 rounded-xl bg-purple-50/40 text-slate-900 placeholder-purple-400 text-sm font-medium transition-all duration-200 focus:outline-none focus:border-purple-500 focus:bg-white focus:shadow-lg focus:shadow-purple-500/10"
                  disabled={loadingAction === "explain"}
                />

                <button
                  type="submit"
                  disabled={loadingAction === "explain" || !concept.trim()}
                  className="shrink-0 h-11 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >

                  {loadingAction === "explain" ? (

                    <span className="flex items-center gap-2">

                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                      Loading...

                    </span>

                  ) : (
                    "Explain"
                  )}

                </button>

              </div>

            </form>

          </div>

          {/* //NEW VIVA BUTTOOONNN */}
          <div className="group p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/50 hover:border-purple-300/60 hover:shadow-md transition-all duration-200">

            <div className="flex items-start justify-between gap-4">

              <div className="flex-1">

                <div className="flex items-center gap-2 mb-2">

                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">

                    <Sparkles
                      className="w-4 h-4 text-violet-600"
                      strokeWidth={2}
                    />

                  </div>

                  <h4 className="font-semibold text-violet-700">
                    Generate Viva Questions
                  </h4>

                </div>

                <p className="text-sm text-purple-600 leading-relaxed">
                  Create realistic oral exam and viva questions from your document.
                </p>

              </div>

              <button
                onClick={handleGenerateViva}
                disabled={loadingAction === "viva"}
                className="shrink-0 h-10 px-5 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >

                {loadingAction === "viva" ? (

                  <span className="flex items-center gap-2">

                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Loading...

                  </span>

                ) : (
                  "Generate"
                )}

              </button>

            </div>

          </div>

          {/* Revision Notes */}
          <div className="group p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/50 hover:border-purple-300/60 hover:shadow-md transition-all duration-200">

            <div className="flex items-start justify-between gap-4">

              <div className="flex-1">

                <div className="flex items-center gap-2 mb-2">

                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center">

                    <BookOpen
                      className="w-4 h-4 text-pink-600"
                      strokeWidth={2}
                    />

                  </div>

                  <h4 className="font-semibold text-violet-700">
                    Generate Revision Notes
                  </h4>

                </div>

                <p className="text-sm text-purple-600 leading-relaxed">
                  Create concise exam-focused revision notes from your document.
                </p>

              </div>

              <button
                onClick={handleGenerateRevisionNotes}
                disabled={loadingAction === "revision"}
                className="shrink-0 h-10 px-5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >

                {loadingAction === "revision" ? (

                  <span className="flex items-center gap-2">

                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Loading...

                  </span>

                ) : (
                  "Generate"
                )}

              </button>

            </div>

          </div>

          {/* Memory Tricks */}
          <div className="group p-5 bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl border border-purple-200/50 hover:border-purple-300/60 hover:shadow-md transition-all duration-200">

            <div className="flex items-start justify-between gap-4">

              <div className="flex-1">

                <div className="flex items-center gap-2 mb-2">

                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-100 to-pink-100 flex items-center justify-center">

                    <Sparkles
                      className="w-4 h-4 text-yellow-600"
                      strokeWidth={2}
                    />

                  </div>

                  <h4 className="font-semibold text-violet-700">
                    Generate Memory Tricks
                  </h4>

                </div>

                <p className="text-sm text-purple-600 leading-relaxed">
                  Create mnemonics and creative tricks for easier memorization.
                </p>

              </div>

              <button
                onClick={handleGenerateMemoryTricks}
                disabled={loadingAction === "memory"}
                className="shrink-0 h-10 px-5 bg-gradient-to-r from-yellow-500 to-pink-500 hover:from-yellow-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-yellow-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >

                {loadingAction === "memory" ? (

                  <span className="flex items-center gap-2">

                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Loading...

                  </span>

                ) : (
                  "Generate"
                )}

              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Result Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
      >
        <div className="max-h-[60vh] overflow-y-auto prose prose-sm max-w-none prose-slate">
          <MarkdownRenderer content={modalContent} />
        </div>
      </Modal>
    </>
  );
};

export default AIActions;