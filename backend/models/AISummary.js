import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// AISummary  (V2 schema)
//
// Stores the complete output of an AI Document Intelligence generation:
//   - Input (source PDF metadata + user-chosen settings)
//   - Pipeline state (status + per-stage summary)
//   - Rich structured outputs (chapters, definitions, formulas, examples,
//     concepts, tips, flashcards, quiz, viva, mindmap)
//   - A flattened `sections[]` + `rawMarkdown` view (kept for the existing
//     markdown-based summary viewer + PDF renderer that don't need to know
//     about each rich shape)
//   - Lifecycle flags (savedToDocuments, savedDocumentId, pdfUrl)
//
// V1 → V2 migration policy: every new field is optional with a sensible
// default, so AISummary documents written before V2 continue to load
// without any migration step. The V1 `sections[]` + `rawMarkdown` pair
// remains the canonical "render this summary" representation; the new
// rich fields are additive and let the viewer / PDF builder show fancier
// cards when they're available.
// ─────────────────────────────────────────────────────────────────────────────

// ── settings ────────────────────────────────────────────────────────────────

const advancedOptionsSchema = new mongoose.Schema(
    {
        preserveFormulas: { type: Boolean, default: true },
        preserveDefinitions: { type: Boolean, default: true },
        explainDiagrams: { type: Boolean, default: false },
        includeToc: { type: Boolean, default: true },
        keepExamples: { type: Boolean, default: true },
    },
    { _id: false }
);

const settingsSchema = new mongoose.Schema(
    {
        studyGoal: {
            type: String,
            enum: [
                'exam_tomorrow',
                'quick_revision',
                'detailed_notes',
                'research_mode',
                'interview_prep',
            ],
            default: 'quick_revision',
        },
        summaryLength: {
            type: String,
            enum: ['auto', '2', '5', '10'],
            default: 'auto',
        },
        language: {
            type: String,
            enum: ['english', 'hindi', 'bengali'],
            default: 'english',
        },
        advancedOptions: { type: advancedOptionsSchema, default: () => ({}) },
    },
    { _id: false }
);

// ── insights ────────────────────────────────────────────────────────────────

const insightsSchema = new mongoose.Schema(
    {
        chapterCount: { type: Number, default: 0 },
        formulaCount: { type: Number, default: 0 },
        definitionCount: { type: Number, default: 0 },
        diagramCount: { type: Number, default: 0 },
        keyConceptCount: { type: Number, default: 0 },
        flashcardCount: { type: Number, default: 0 },
        quizCount: { type: Number, default: 0 },
        vivaCount: { type: Number, default: 0 },
        estimatedReadingTime: { type: Number, default: 0 }, // minutes
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        targetWords: { type: Number, default: 0 },
        actualWords: { type: Number, default: 0 },
        sourceWordCount: { type: Number, default: 0 },
        cleanedWordCount: { type: Number, default: 0 },
        candidateChunkCount: { type: Number, default: 0 },
        selectedChunkCount: { type: Number, default: 0 },
        selectedWordCount: { type: Number, default: 0 },
        tokenReductionPercent: { type: Number, default: 0 },
    },
    { _id: false }
);

// ── V1 sections (kept for backwards compatibility + viewer/PDF rendering) ────

const sectionSchema = new mongoose.Schema(
    {
        kind: {
            type: String,
            enum: [
                'chapter',
                'definitions',
                'concepts',
                'formulas',
                'examples',
                'tips',
                'mindmap',
                'toc',
            ],
            required: true,
        },
        title: { type: String, required: true },
        content: { type: String, default: '' },
        // Stable anchor id (slugified title) used for in-page navigation
        // links and clickable TOC entries in the rendered PDF.
        anchor: { type: String, default: '' },
    },
    { _id: false }
);

// ── V2 rich shapes ──────────────────────────────────────────────────────────

const chapterSchema = new mongoose.Schema(
    {
        anchor: { type: String, default: '' },
        title: { type: String, required: true },
        content: { type: String, default: '' },
    },
    { _id: false }
);

const richDefinitionSchema = new mongoose.Schema(
    {
        term: { type: String, required: true },
        definition: { type: String, default: '' },
        simpleExplanation: { type: String, default: '' },
        analogy: { type: String, default: '' },
        importance: { type: String, default: '' },
        examQuestion: { type: String, default: '' },
        interviewQuestion: { type: String, default: '' },
    },
    { _id: false }
);

const richFormulaSchema = new mongoose.Schema(
    {
        name: { type: String, default: '' },
        expression: { type: String, default: '' },
        variables: { type: String, default: '' },
        explanation: { type: String, default: '' },
        example: { type: String, default: '' },
        examImportance: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        interviewImportance: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
    },
    { _id: false }
);

const richExampleSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        conceptExample: { type: String, default: '' },
        realWorldExample: { type: String, default: '' },
        examExample: { type: String, default: '' },
        interviewExample: { type: String, default: '' },
    },
    { _id: false }
);

const keyConceptSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        explanation: { type: String, default: '' },
    },
    { _id: false }
);

const flashcardSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
    },
    { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        options: { type: [String], default: [] },
        correctIndex: { type: Number, default: 0 },
        correctAnswer: { type: String, default: '' },
        explanation: { type: String, default: '' },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
    },
    { _id: false }
);

const vivaQuestionSchema = new mongoose.Schema(
    {
        question: { type: String, required: true },
        expectedAnswer: { type: String, default: '' },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
    },
    { _id: false }
);

const mindMapSchema = new mongoose.Schema(
    {
        // Valid Mermaid mindmap syntax. Rendered client-side by mermaid.js
        // in the Summary Viewer; falls back to outlineMarkdown when the
        // PDF builder can't run the Mermaid renderer.
        mermaid: { type: String, default: '' },
        outlineMarkdown: { type: String, default: '' },
    },
    { _id: false }
);

const tocEntrySchema = new mongoose.Schema(
    {
        anchor: { type: String, default: '' },
        title: { type: String, required: true },
        depth: { type: Number, default: 1 },
    },
    { _id: false }
);

// ── pipeline metadata ───────────────────────────────────────────────────────

const pipelineStageSchema = new mongoose.Schema(
    {
        id: { type: String, required: true }, // e.g. 'extract', 'enrich-definitions'
        label: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
            default: 'pending',
        },
        progress: { type: Number, default: 0 }, // 0-100
        startedAt: { type: Date },
        completedAt: { type: Date },
        durationMs: { type: Number, default: 0 },
        providerId: { type: String, default: '' },
        error: { type: String, default: '' },
    },
    { _id: false }
);

const pipelineSummarySchema = new mongoose.Schema(
    {
        stages: { type: [pipelineStageSchema], default: [] },
        totalDurationMs: { type: Number, default: 0 },
        // Per-provider call counts so we can see at a glance which AI
        // actually served this generation. Indexed by provider id.
        providerUsage: {
            type: Map,
            of: Number,
            default: () => new Map(),
        },
    },
    { _id: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Root schema
// ─────────────────────────────────────────────────────────────────────────────

const aiSummarySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // Source (where the summary came from)
        sourceDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
        },
        sourceTitle: { type: String, required: true, trim: true },
        sourceFileName: { type: String, default: '' },
        sourceFileSize: { type: Number, default: 0 },

        originalPageCount: { type: Number, default: 0 },
        summaryPageCount: { type: Number, default: 0 },
        compressionPercent: { type: Number, default: 0 },

        // Inputs + analytics
        settings: { type: settingsSchema, default: () => ({}) },
        insights: { type: insightsSchema, default: () => ({}) },

        // ── V2 rich outputs (additive) ─────────────────────────────────────
        tableOfContents: { type: [tocEntrySchema], default: [] },
        chapters: { type: [chapterSchema], default: [] },
        richDefinitions: { type: [richDefinitionSchema], default: [] },
        richFormulas: { type: [richFormulaSchema], default: [] },
        richExamples: { type: [richExampleSchema], default: [] },
        keyConcepts: { type: [keyConceptSchema], default: [] },
        examTips: { type: [String], default: [] },
        flashcards: { type: [flashcardSchema], default: [] },
        quiz: { type: [quizQuestionSchema], default: [] },
        vivaQuestions: { type: [vivaQuestionSchema], default: [] },
        mindmap: { type: mindMapSchema, default: () => ({}) },

        // ── V1 sections + rawMarkdown (canonical render representation) ────
        sections: { type: [sectionSchema], default: [] },
        rawMarkdown: { type: String, default: '' },

        // Pipeline state
        status: {
            type: String,
            enum: ['processing', 'completed', 'failed'],
            default: 'processing',
            index: true,
        },
        failureReason: { type: String, default: '' },
        // Compact log of stages — populated when the pipeline finishes so
        // the Processing Screen can replay progress on a fresh GET (e.g.
        // user refreshes mid-generation).
        pipeline: { type: pipelineSummarySchema, default: () => ({}) },

        // Documents-page integration
        savedToDocuments: { type: Boolean, default: false },
        savedDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
        },

        // Lazily-rendered PDF (cached on first download / save)
        pdfUrl: { type: String, default: '' },
        pdfPublicId: { type: String, default: '' },
    },
    { timestamps: true }
);

aiSummarySchema.index({ userId: 1, createdAt: -1 });

// ── instance helpers ────────────────────────────────────────────────────────

/**
 * Compact JSON projection used by the history endpoint where we don't want
 * to ship the full chapters/definitions/etc. on every list call.
 */
aiSummarySchema.methods.toListJSON = function () {
    return {
        _id: this._id,
        sourceTitle: this.sourceTitle,
        sourceFileName: this.sourceFileName,
        sourceFileSize: this.sourceFileSize,
        originalPageCount: this.originalPageCount,
        summaryPageCount: this.summaryPageCount,
        compressionPercent: this.compressionPercent,
        settings: {
            studyGoal: this.settings?.studyGoal,
            summaryLength: this.settings?.summaryLength,
            language: this.settings?.language,
        },
        insights: this.insights,
        status: this.status,
        savedToDocuments: this.savedToDocuments,
        savedDocumentId: this.savedDocumentId,
        pdfUrl: this.pdfUrl,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

const AISummary = mongoose.model('AISummary', aiSummarySchema);

export default AISummary;
