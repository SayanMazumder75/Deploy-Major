// ─────────────────────────────────────────────────────────────────────────────
// aiIntelligenceController
//
// HTTP handlers for the AI Document Intelligence module. Endpoints fall into
// three groups:
//
//   GENERATION
//     POST   /api/ai-intelligence/generate         — generate a new summary
//                                                    (either from an existing
//                                                    Document via `documentId`,
//                                                    or from a freshly uploaded
//                                                    PDF in the same request).
//     POST   /api/ai-intelligence/:id/regenerate   — regenerate with same or
//                                                    overridden settings; keeps
//                                                    the same AISummary id so
//                                                    the viewer URL stays valid.
//
//   PREVIEW / VIEWER
//     GET    /api/ai-intelligence/:id              — fetch one summary.
//     GET    /api/ai-intelligence/history          — list user's summaries.
//     DELETE /api/ai-intelligence/:id              — remove a history entry.
//     GET    /api/ai-intelligence/:id/download     — render + return the PDF
//                                                    (cached after first call).
//     POST   /api/ai-intelligence/:id/ask          — ask AI on top of the
//                                                    generated summary content.
//     POST   /api/ai-intelligence/:id/translate    — translate the summary
//                                                    into a target language.
//
//   DOCUMENTS INTEGRATION
//     POST   /api/ai-intelligence/:id/save-to-documents
//                                                  — explicit save: build the
//                                                    PDF, upload to Cloudinary,
//                                                    create a Document with
//                                                    aiGenerated:true. Only
//                                                    this endpoint causes the
//                                                    summary to appear in the
//                                                    user's Documents page.
//
// Auth: all routes are mounted behind `protect` in the router.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs/promises';
import mongoose from 'mongoose';

import AISummary from '../models/AISummary.js';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinary.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import { generateAISummary } from '../utils/aiSummaryGenerator.js';
import {
    renderSummaryPdf,
    estimateSummaryPageCount,
} from '../utils/summaryPdfBuilder.js';
import { rawGenerate } from '../utils/geminiService.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse the multipart-form-encoded "settings" field (or accept already-parsed
 * JSON body for the documentId path) into a normalised settings object.
 *
 * Defensive: returns sensible defaults for anything missing so the AI pipeline
 * can never crash on partial input.
 */
const normaliseSettings = (input) => {
    let s = input;
    if (typeof s === 'string') {
        try {
            s = JSON.parse(s);
        } catch {
            s = {};
        }
    }
    s = s || {};

    const allowedGoals = ['exam_tomorrow', 'quick_revision', 'detailed_notes', 'research_mode', 'interview_prep'];
    const allowedLengths = ['auto', '2', '5', '10'];
    const allowedLanguages = ['english', 'hindi', 'bengali'];

    const adv = s.advancedOptions || {};
    return {
        studyGoal: allowedGoals.includes(s.studyGoal) ? s.studyGoal : 'quick_revision',
        summaryLength: allowedLengths.includes(s.summaryLength) ? s.summaryLength : 'auto',
        language: allowedLanguages.includes(s.language) ? s.language : 'english',
        advancedOptions: {
            preserveFormulas: adv.preserveFormulas !== false,
            preserveDefinitions: adv.preserveDefinitions !== false,
            explainDiagrams: !!adv.explainDiagrams,
            includeToc: adv.includeToc !== false,
            keepExamples: adv.keepExamples !== false,
        },
    };
};

/**
 * Resolve the source text + metadata for a generation request. Handles BOTH
 * the "use an existing Document" path and the "upload a new PDF as part of
 * this request" path. The caller is responsible for cleaning up `req.file`
 * if it returns a `cleanupPath`.
 */
const resolveSource = async (req) => {
    const { documentId } = req.body;

    // Path A: existing document.
    if (documentId && !req.file) {
        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready',
        });
        if (!document) {
            const err = new Error('Document not found or not ready');
            err.statusCode = 404;
            throw err;
        }
        return {
            text: document.extractedText || '',
            title: req.body.title || document.title,
            fileName: document.fileName,
            fileSize: document.fileSize,
            sourceDocumentId: document._id,
            cleanupPath: null,
            originalPageCount: estimatePageCountFromText(document.extractedText),
        };
    }

    // Path B: file uploaded in this request.
    if (req.file) {
        const tempPath = req.file.path;
        const { text, numPages } = await extractTextFromPDF(tempPath);
        return {
            text: text || '',
            title:
                req.body.title ||
                req.file.originalname.replace(/\.pdf$/i, '') ||
                'Untitled',
            fileName: req.file.originalname,
            fileSize: req.file.size,
            sourceDocumentId: null,
            cleanupPath: tempPath,
            originalPageCount: numPages || estimatePageCountFromText(text),
        };
    }

    const err = new Error('Please provide either a documentId or upload a PDF file.');
    err.statusCode = 400;
    throw err;
};

// Rough page-count heuristic for an arbitrary extracted-text blob (used as a
// fallback when pdf-parse's `numpages` is not available — e.g. when summarizing
// an already-stored Document where we discarded that field on upload).
const estimatePageCountFromText = (text) => {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 280));
};

const compressionPercentFor = (originalPages, summaryPages) => {
    if (!originalPages || originalPages <= 0) return 0;
    const safeSummary = Math.max(1, summaryPages || 1);
    const pct = 1 - safeSummary / originalPages;
    return Math.max(0, Math.min(99, Math.round(pct * 100)));
};

const cleanupTempFile = async (path) => {
    if (!path) return;
    await fs.unlink(path).catch(() => {});
};

// ─── controllers ─────────────────────────────────────────────────────────────

// @desc    Generate a new AI summary from a Document or uploaded PDF
// @route   POST /api/ai-intelligence/generate
// @access  Private
export const generateIntelligenceSummary = async (req, res, next) => {
    let cleanupPath = null;
    try {
        const settings = normaliseSettings(req.body.settings);
        const source = await resolveSource(req);
        cleanupPath = source.cleanupPath;

        if (!source.text || source.text.trim().length < 50) {
            await cleanupTempFile(cleanupPath);
            return res.status(400).json({
                success: false,
                error: 'The source document does not contain enough extractable text to summarize.',
                statusCode: 400,
            });
        }

        // Persist a 'processing' row up-front so the frontend (if it polls)
        // can show progress immediately; we update it to 'completed' below.
        const summaryDoc = await AISummary.create({
            userId: req.user._id,
            sourceDocumentId: source.sourceDocumentId,
            sourceTitle: source.title,
            sourceFileName: source.fileName,
            sourceFileSize: source.fileSize,
            originalPageCount: source.originalPageCount,
            settings,
            status: 'processing',
        });

        try {
            const { sections, rawMarkdown, insights } = await generateAISummary({
                text: source.text,
                settings,
            });

            summaryDoc.sections = sections;
            summaryDoc.rawMarkdown = rawMarkdown;
            summaryDoc.insights = insights;
            summaryDoc.status = 'completed';
            summaryDoc.summaryPageCount = estimateSummaryPageCount(summaryDoc);
            summaryDoc.compressionPercent = compressionPercentFor(
                summaryDoc.originalPageCount,
                summaryDoc.summaryPageCount
            );
            await summaryDoc.save();
        } catch (genErr) {
            console.error('AI summary generation failed:', genErr);
            summaryDoc.status = 'failed';
            summaryDoc.failureReason = genErr.message || 'Unknown error';
            await summaryDoc.save();
            await cleanupTempFile(cleanupPath);
            return res.status(502).json({
                success: false,
                error: 'AI summary generation failed. Please try again.',
                statusCode: 502,
                summaryId: summaryDoc._id,
            });
        }

        await cleanupTempFile(cleanupPath);
        cleanupPath = null;

        res.status(201).json({
            success: true,
            data: summaryDoc,
            message: 'AI summary generated successfully',
        });
    } catch (error) {
        await cleanupTempFile(cleanupPath);
        if (error.statusCode) {
            return res
                .status(error.statusCode)
                .json({ success: false, error: error.message, statusCode: error.statusCode });
        }
        next(error);
    }
};

// @desc    Get a single AI summary
// @route   GET /api/ai-intelligence/:id
// @access  Private
export const getIntelligenceSummary = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res
                .status(400)
                .json({ success: false, error: 'Invalid summary id', statusCode: 400 });
        }
        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

// @desc    List user's AI summaries
// @route   GET /api/ai-intelligence/history
// @access  Private
export const listIntelligenceSummaries = async (req, res, next) => {
    try {
        // Lightweight projection — the history list doesn't need the full
        // `sections` array or `rawMarkdown`, just enough to render the row.
        const summaries = await AISummary.find({ userId: req.user._id })
            .select(
                '_id sourceTitle sourceFileName sourceFileSize originalPageCount summaryPageCount compressionPercent settings.studyGoal settings.summaryLength settings.language insights status savedToDocuments savedDocumentId pdfUrl createdAt updatedAt'
            )
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({ success: true, data: summaries, count: summaries.length });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a saved AI summary (history entry)
// @route   DELETE /api/ai-intelligence/:id
// @access  Private
export const deleteIntelligenceSummary = async (req, res, next) => {
    try {
        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }

        // If we stashed a Cloudinary-cached PDF for this summary, drop it.
        // Note: we do NOT delete the saved Document (if `savedToDocuments`) —
        // that becomes the user's own asset once "Save to Documents" runs,
        // and it gets its own lifecycle via the regular Documents UI.
        if (summary.pdfPublicId) {
            await cloudinary.uploader
                .destroy(summary.pdfPublicId, { resource_type: 'raw' })
                .catch((err) => console.error('Cloudinary destroy (summary PDF) error:', err));
        }

        await summary.deleteOne();

        res.status(200).json({ success: true, message: 'Summary deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Regenerate an existing summary (optionally with new settings)
// @route   POST /api/ai-intelligence/:id/regenerate
// @access  Private
export const regenerateIntelligenceSummary = async (req, res, next) => {
    try {
        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }

        // We need the source text. Prefer the linked Document; otherwise we
        // can't regenerate — the PDF was never persisted (Path B uploads are
        // discarded after extraction).
        let text = '';
        if (summary.sourceDocumentId) {
            const document = await Document.findOne({
                _id: summary.sourceDocumentId,
                userId: req.user._id,
            });
            if (document && document.extractedText) {
                text = document.extractedText;
            }
        }
        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'The original source for this summary is no longer available. Please generate a new summary from your Documents.',
                statusCode: 400,
            });
        }

        const settings = req.body.settings
            ? normaliseSettings(req.body.settings)
            : summary.settings;

        summary.status = 'processing';
        summary.failureReason = '';
        await summary.save();

        try {
            const { sections, rawMarkdown, insights } = await generateAISummary({
                text,
                settings,
            });

            summary.settings = settings;
            summary.sections = sections;
            summary.rawMarkdown = rawMarkdown;
            summary.insights = insights;
            summary.status = 'completed';
            summary.summaryPageCount = estimateSummaryPageCount(summary);
            summary.compressionPercent = compressionPercentFor(
                summary.originalPageCount,
                summary.summaryPageCount
            );
            // Invalidate any cached PDF — the content changed.
            if (summary.pdfPublicId) {
                await cloudinary.uploader
                    .destroy(summary.pdfPublicId, { resource_type: 'raw' })
                    .catch((err) => console.error('Cloudinary destroy (stale PDF) error:', err));
            }
            summary.pdfUrl = '';
            summary.pdfPublicId = '';
            await summary.save();

            res.status(200).json({ success: true, data: summary, message: 'Summary regenerated' });
        } catch (genErr) {
            console.error('AI summary regeneration failed:', genErr);
            summary.status = 'failed';
            summary.failureReason = genErr.message || 'Unknown error';
            await summary.save();
            res.status(502).json({
                success: false,
                error: 'Regeneration failed. Please try again.',
                statusCode: 502,
            });
        }
    } catch (error) {
        next(error);
    }
};

// Render + upload + cache the PDF for an AISummary. Returns the (now-cached)
// summary instance. Shared by `downloadPdf` and `saveToDocuments` so the work
// only happens once per generation.
const ensurePdfRendered = async (summary) => {
    if (summary.pdfUrl && summary.pdfPublicId) return summary;

    const buffer = await renderSummaryPdf(summary);

    // Upload the buffer directly via the upload_stream API. This avoids any
    // /tmp writes which Render may not persist between requests.
    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                folder: 'meetmind-ai-summaries',
                public_id: `ai-summary-${summary._id}`,
                format: 'pdf',
                overwrite: true,
                use_filename: false,
            },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });

    summary.pdfUrl = uploadResult.secure_url;
    summary.pdfPublicId = uploadResult.public_id;
    // Re-estimate page count using a slightly more accurate post-render heuristic.
    summary.summaryPageCount = estimateSummaryPageCount(summary);
    summary.compressionPercent = compressionPercentFor(
        summary.originalPageCount,
        summary.summaryPageCount
    );
    await summary.save();

    return summary;
};

// @desc    Render (or fetch cached) PDF URL for the summary
// @route   GET /api/ai-intelligence/:id/download
// @access  Private
export const downloadIntelligencePdf = async (req, res, next) => {
    try {
        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }
        if (summary.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Summary is not ready yet.',
                statusCode: 400,
            });
        }

        await ensurePdfRendered(summary);
        res.status(200).json({
            success: true,
            data: { url: summary.pdfUrl, fileName: `${summary.sourceTitle || 'summary'}.pdf` },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Save summary as a Document (renders PDF + creates Document record)
// @route   POST /api/ai-intelligence/:id/save-to-documents
// @access  Private
export const saveSummaryToDocuments = async (req, res, next) => {
    try {
        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }
        if (summary.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Summary is not ready to save yet.',
                statusCode: 400,
            });
        }

        // Idempotency: if the summary has already been saved to Documents and
        // that Document still exists, just return it. (Avoids accidentally
        // creating duplicates on double-clicks.)
        if (summary.savedToDocuments && summary.savedDocumentId) {
            const existing = await Document.findById(summary.savedDocumentId);
            if (existing) {
                return res.status(200).json({
                    success: true,
                    data: { summary, document: existing },
                    message: 'Summary is already saved to your Documents.',
                });
            }
        }

        // 1. Make sure we have a rendered PDF on Cloudinary.
        await ensurePdfRendered(summary);

        // 2. Create a Document record pointing at the rendered PDF. We re-use
        //    the existing Document model so the summary lands seamlessly in
        //    the user's library and behaves like any other document (chat,
        //    flashcards, quizzes, etc. can all be run on it). The full
        //    summary markdown becomes the extractedText, chunked the same
        //    way regular uploads are.
        const fakeBytes = Math.max(1024, (summary.rawMarkdown || '').length); // best-effort size
        const docTitle = `${summary.sourceTitle || 'AI Summary'} — AI Summary`;

        const document = await Document.create({
            userId: req.user._id,
            title: docTitle,
            fileName: `${summary.sourceTitle || 'ai-summary'}.pdf`,
            filePath: summary.pdfUrl,
            cloudinaryPublicId: summary.pdfPublicId,
            fileSize: fakeBytes,
            extractedText: summary.rawMarkdown || '',
            chunks: chunkText(summary.rawMarkdown || '', 500, 50),
            status: 'ready',
            aiGenerated: true,
            aiSummaryId: summary._id,
        });

        summary.savedToDocuments = true;
        summary.savedDocumentId = document._id;
        await summary.save();

        res.status(201).json({
            success: true,
            data: { summary, document },
            message: 'Summary saved to your Documents.',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Ask AI a follow-up question grounded in the summary
// @route   POST /api/ai-intelligence/:id/ask
// @access  Private
export const askIntelligenceSummary = async (req, res, next) => {
    try {
        const { question } = req.body;
        if (!question || !question.trim()) {
            return res
                .status(400)
                .json({ success: false, error: 'Please provide a question', statusCode: 400 });
        }

        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }

        // Cap the context so we stay well inside Groq's window.
        const context = (summary.rawMarkdown || '').substring(0, 12000);
        const prompt = `
You are a study tutor answering a student's follow-up question about the AI-generated summary below.
Be precise, cite the relevant section of the summary, and keep the answer focused.

SUMMARY:
${context}

STUDENT QUESTION:
${question}

YOUR ANSWER (markdown formatted):
`.trim();

        const answer = await rawGenerate(prompt);
        res.status(200).json({ success: true, data: { question, answer } });
    } catch (error) {
        next(error);
    }
};

// @desc    Translate the summary into another language
// @route   POST /api/ai-intelligence/:id/translate
// @access  Private
export const translateIntelligenceSummary = async (req, res, next) => {
    try {
        const { targetLanguage } = req.body;
        const allowed = ['english', 'hindi', 'bengali'];
        if (!allowed.includes(targetLanguage)) {
            return res.status(400).json({
                success: false,
                error: 'Please pick a supported target language (english / hindi / bengali).',
                statusCode: 400,
            });
        }

        const summary = await AISummary.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!summary) {
            return res
                .status(404)
                .json({ success: false, error: 'Summary not found', statusCode: 404 });
        }

        const labelMap = {
            english: 'clear, professional English',
            hindi: 'Hindi (Devanagari script)',
            bengali: 'Bengali script',
        };

        const prompt = `
Translate the markdown study summary below into ${labelMap[targetLanguage]}.
Preserve markdown formatting (headings, bullets, bold) exactly. Do NOT add or remove sections.
Where a technical term has no good local equivalent, keep the English term and add the translation in parentheses.

SUMMARY:
${(summary.rawMarkdown || '').substring(0, 12000)}

TRANSLATED SUMMARY:
`.trim();

        const translated = await rawGenerate(prompt);
        res.status(200).json({
            success: true,
            data: { targetLanguage, translatedMarkdown: translated },
        });
    } catch (error) {
        next(error);
    }
};
