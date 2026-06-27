import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// AISummary
//
// A rich, user-curated AI-generated summary of a PDF document. Unlike
// `AIResource` (which is a thin generic store keyed by an enum `type`), an
// AISummary captures the *whole generation pipeline state* — the original
// source, the user-chosen settings, structured sections, computed insights
// (chapter / formula / definition counts, difficulty, reading time), and the
// "preview vs saved" lifecycle.
//
// Lifecycle:
//   1. POST /api/ai-intelligence/generate
//        → AISummary is created with status='processing', then transitions to
//          'completed' once generation finishes. Even when completed, it does
//          NOT automatically appear in the Documents page — that is intentional
//          and the whole point of this model existing separately.
//   2. POST /api/ai-intelligence/:id/save-to-documents
//        → ONLY on explicit user click do we:
//            (a) render `sections` + `rawMarkdown` into a PDF (via pdfkit),
//            (b) upload the PDF to Cloudinary (`resource_type:'raw'`),
//            (c) create a Document record with `aiGenerated:true` + back-ref,
//            (d) set `savedToDocuments=true` and `savedDocumentId` here.
//   3. Cached PDF — when the user only clicks "Download PDF" (no save), we
//      still upload the PDF to Cloudinary so subsequent downloads are fast
//      and we don't have to regenerate. `pdfUrl` + `pdfPublicId` track that.
// ─────────────────────────────────────────────────────────────────────────────

const sectionSchema = new mongoose.Schema(
    {
        // The Summary Viewer renders one rail entry per `kind`. Keeping this
        // as a free-form enum (rather than fixed fields) lets the AI emit a
        // varying number of chapters while we still group sidebar/rail items
        // by category in the UI.
        kind: {
            type: String,
            enum: [
                'chapter',     // a chapter-wise summary block
                'definitions', // important definitions list
                'concepts',    // key concepts list
                'formulas',    // formulas list (only present when preserveFormulas)
                'examples',    // important examples (only when keepExamples)
                'tips',        // exam tips
                'mindmap',     // textual mind-map outline
                'toc',         // table of contents
            ],
            required: true,
        },
        title: { type: String, required: true },
        // Markdown content. The viewer uses `MarkdownRenderer` to display it,
        // and the PDF builder walks the markdown into pdfkit primitives.
        content: { type: String, default: '' },
    },
    { _id: false }
);

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
        // `'auto'` = "AI Decide" → the summarizer chooses based on the source
        // length. The other values are *target* page counts; the summarizer
        // will scale `maxWords` accordingly but the final count depends on
        // model output and is not strictly enforced.
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

const insightsSchema = new mongoose.Schema(
    {
        chapterCount: { type: Number, default: 0 },
        formulaCount: { type: Number, default: 0 },
        definitionCount: { type: Number, default: 0 },
        diagramCount: { type: Number, default: 0 },
        // Minutes; used for the "Estimated Reading Time" stat on both the
        // processing-screen insights rail and the results dashboard.
        estimatedReadingTime: { type: Number, default: 0 },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
    },
    { _id: false }
);

const aiSummarySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // Source the summary was built from. `sourceDocumentId` is the link
        // back to the original Document (if any — generation can also work
        // directly from a freshly uploaded PDF that the user didn't add to
        // their Documents library). The denormalised `sourceTitle`/`fileName`
        // / `fileSize` fields are kept so history rows render correctly even
        // if the source document is later deleted.
        sourceDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
        },
        sourceTitle: { type: String, required: true, trim: true },
        sourceFileName: { type: String, default: '' },
        sourceFileSize: { type: Number, default: 0 },

        // Approximate page counts used for the "500 → 6 Pages" compression
        // stat on the results dashboard.
        originalPageCount: { type: Number, default: 0 },
        summaryPageCount: { type: Number, default: 0 },
        // Cached for cheap rendering in the history list ("98%").
        compressionPercent: { type: Number, default: 0 },

        settings: { type: settingsSchema, default: () => ({}) },
        insights: { type: insightsSchema, default: () => ({}) },
        // Ordered array; the order is the order the Summary Viewer renders
        // them in the centre panel.
        sections: { type: [sectionSchema], default: [] },
        // The concatenated markdown form of the summary. Used by the PDF
        // builder, by "Download PDF", and by RAG-style follow-up Q&A on top
        // of the generated summary (the "Ask AI" sidebar action).
        rawMarkdown: { type: String, default: '' },

        // Generation lifecycle.
        status: {
            type: String,
            enum: ['processing', 'completed', 'failed'],
            default: 'processing',
            index: true,
        },
        failureReason: { type: String, default: '' },

        // Documents-page integration. Both default to "not saved".
        savedToDocuments: { type: Boolean, default: false },
        savedDocumentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
        },

        // Cached rendered PDF (set on first Save-to-Documents OR first
        // Download-PDF call so subsequent calls don't re-render).
        pdfUrl: { type: String, default: '' },
        pdfPublicId: { type: String, default: '' },
    },
    { timestamps: true }
);

// Most common query: list current user's summaries, newest first.
aiSummarySchema.index({ userId: 1, createdAt: -1 });

const AISummary = mongoose.model('AISummary', aiSummarySchema);

export default AISummary;
