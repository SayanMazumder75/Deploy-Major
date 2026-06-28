// ─────────────────────────────────────────────────────────────────────────────
// aiIntelligenceController (V2)
//
// HTTP handlers for the AI Document Intelligence module. Refactored in V2
// to:
//   - Delegate the full generation pipeline to services/intelligencePipeline
//   - Route every AI call (incl. ask + translate) through the provider chain
//   - Expose a Server-Sent Events endpoint at GET /:id/progress that streams
//     live stage events from the in-process pipelineRegistry
//   - Keep every backwards-compatible response shape from V1
//
// Endpoint inventory (mounted under /api/ai-intelligence):
//   POST /generate                  — kick off generation, returns the
//                                     completed AISummary doc once the
//                                     pipeline finishes (kept synchronous
//                                     for backwards compat with the
//                                     existing frontend service contract)
//   GET  /:id                       — fetch a single summary
//   GET  /:id/progress              — SSE live progress (or replay log if
//                                     pipeline already finished)
//   GET  /history                   — list user's summaries
//   DELETE /:id                     — delete + clean up
//   POST /:id/regenerate            — re-run the pipeline on the same source
//   GET  /:id/download              — render + cache PDF
//   POST /:id/save-to-documents     — create a Document record for the PDF
//   POST /:id/ask                   — Q&A grounded in the summary
//   POST /:id/translate             — translate the summary
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs/promises';
import mongoose from 'mongoose';

import AISummary from '../models/AISummary.js';
import Document from '../models/Document.js';
import cloudinary from '../config/cloudinary.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

import {
    renderSummaryPdf,
    estimateSummaryPageCount,
} from '../utils/summaryPdfBuilder.js';

import {
    runIntelligencePipeline,
    PIPELINE_STAGE_PLAN,
} from '../services/intelligencePipeline.js';
import {
    subscribe as subscribeProgress,
    getSnapshot as getProgressSnapshot,
    dropPipeline,
} from '../services/pipelineRegistry.js';
import { generateText } from '../providers/index.js';
import {
    askAiPrompt,
    translatePrompt,
} from '../services/shared/promptTemplates.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

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
    const allowedGoals = [
        'exam_tomorrow',
        'quick_revision',
        'detailed_notes',
        'research_mode',
        'interview_prep',
    ];
    const allowedLengths = ['auto', '2', '5', '10'];
    const allowedLanguages = ['english', 'hindi', 'bengali'];
    const adv = s.advancedOptions || {};
    return {
        studyGoal: allowedGoals.includes(s.studyGoal)
            ? s.studyGoal
            : 'quick_revision',
        summaryLength: allowedLengths.includes(s.summaryLength)
            ? s.summaryLength
            : 'auto',
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

/**
 * Resolve `req` into either an existing Document's text+metadata or a
 * freshly uploaded PDF's extracted text. Returns a normalised source
 * object that the orchestrator + AISummary skeleton can both consume.
 */
const resolveSource = async (req) => {
    const { documentId } = req.body;

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
            originalPageCount:
                numPages || estimatePageCountFromText(text),
        };
    }

    const err = new Error(
        'Please provide either a documentId or upload a PDF file.'
    );
    err.statusCode = 400;
    throw err;
};

/**
 * Merge the pipeline's rich output into an AISummary instance + persist.
 * Centralised here so generate + regenerate use identical persistence
 * logic (avoids drift between the two paths).
 */
const persistPipelineResult = async (summaryDoc, pipelineResult, settings) => {
    summaryDoc.chapters = pipelineResult.chapters;
    summaryDoc.tableOfContents = pipelineResult.tableOfContents;
    summaryDoc.sections = pipelineResult.sections;
    summaryDoc.rawMarkdown = pipelineResult.rawMarkdown;
    summaryDoc.richDefinitions = pipelineResult.richDefinitions;
    summaryDoc.richFormulas = pipelineResult.richFormulas;
    summaryDoc.richExamples = pipelineResult.richExamples;
    summaryDoc.keyConcepts = pipelineResult.keyConcepts;
    summaryDoc.examTips = pipelineResult.examTips;
    summaryDoc.flashcards = pipelineResult.flashcards;
    summaryDoc.quiz = pipelineResult.quiz;
    summaryDoc.vivaQuestions = pipelineResult.vivaQuestions;
    summaryDoc.mindmap = pipelineResult.mindmap;
    summaryDoc.insights = pipelineResult.insights;
    summaryDoc.settings = settings;
    summaryDoc.status = 'completed';
    summaryDoc.failureReason = '';
    summaryDoc.summaryPageCount = estimateSummaryPageCount(summaryDoc);
    summaryDoc.compressionPercent = compressionPercentFor(
        summaryDoc.originalPageCount,
        summaryDoc.summaryPageCount
    );
    // Stash a compact snapshot of pipeline stages so re-opens after server
    // restart still get a coherent processing-screen replay.
    const snapshot = getProgressSnapshot(summaryDoc._id.toString());
    if (snapshot) {
        summaryDoc.pipeline = {
            stages: snapshot.stages.map((s) => ({
                id: s.id,
                label: s.label,
                status: s.status,
                progress: s.progress,
                startedAt: s.startedAt,
                completedAt: s.completedAt,
                durationMs: s.durationMs,
                providerId: s.providerId || '',
                error: s.error || '',
            })),
            totalDurationMs: snapshot.stages.reduce(
                (acc, s) => acc + (s.durationMs || 0),
                0
            ),
            providerUsage: new Map(),
        };
    }
    await summaryDoc.save();
};

// ─── controllers ─────────────────────────────────────────────────────────────

// @desc    Generate a new AI summary
// @route   POST /api/ai-intelligence/generate
// @access  Private
//
// V2 contract: this endpoint is now ASYNCHRONOUS by default. It validates
// the request, resolves the source, creates an AISummary skeleton with
// status:'processing', and returns 202 IMMEDIATELY with the summaryId.
// The pipeline then runs in the background, emitting progress events to
// the in-process pipelineRegistry which the SSE endpoint streams to
// connected clients.
//
// Clients that prefer the old synchronous behaviour can send `wait: true`
// in the request body — we keep that around for scripts / tests that
// don't want to mess with SSE.
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

        const summary = await AISummary.create({
            userId: req.user._id,
            sourceDocumentId: source.sourceDocumentId,
            sourceTitle: source.title,
            sourceFileName: source.fileName,
            sourceFileSize: source.fileSize,
            originalPageCount: source.originalPageCount,
            settings,
            status: 'processing',
        });

        // `wait=true` opt-in for callers that want the old synchronous
        // shape (e.g. scripts, integration tests). The default — and what
        // the V2 frontend uses — is async + SSE.
        const wantSync = req.body?.wait === true || req.body?.wait === 'true';

        const runPipeline = async () => {
            try {
                const pipelineResult = await runIntelligencePipeline({
                    summaryId: summary._id.toString(),
                    text: source.text,
                    settings,
                    // Pass through metadata that downstream OCR/diagram
                    // services need (filePath for image extraction,
                    // numPages for the scanned-doc heuristic).
                    sourceMeta: {
                        filePath: source.cleanupPath || null,
                        numPages: source.originalPageCount || 0,
                    },
                });
                await persistPipelineResult(summary, pipelineResult, settings);
            } catch (genErr) {
                console.error('AI summary generation failed:', genErr);
                summary.status = 'failed';
                summary.failureReason = genErr.message || 'Unknown error';
                await summary.save();
            } finally {
                // Always release the uploaded temp file once the pipeline is
                // done with it. We tolerate the file possibly being gone.
                await cleanupTempFile(cleanupPath);
            }
        };

        if (wantSync) {
            await runPipeline();
            return res.status(201).json({
                success: true,
                data: summary,
                message: 'AI summary generated successfully',
            });
        }

        // Async path: kick off the pipeline WITHOUT awaiting and respond
        // immediately. We tag the unhandled-rejection with a clear context
        // so any future bug is easy to spot in the logs.
        runPipeline().catch((err) => {
            console.error(
                `[AI Intelligence] background pipeline rejected for ${summary._id}:`,
                err
            );
        });

        res.status(202).json({
            success: true,
            data: {
                summaryId: summary._id,
                status: 'processing',
                stagePlan: PIPELINE_STAGE_PLAN,
            },
            message: 'Generation started',
        });
    } catch (error) {
        await cleanupTempFile(cleanupPath);
        if (error.statusCode) {
            return res
                .status(error.statusCode)
                .json({
                    success: false,
                    error: error.message,
                    statusCode: error.statusCode,
                });
        }
        next(error);
    }
};

// @desc    Live SSE progress stream for an in-flight generation
// @route   GET /api/ai-intelligence/:id/progress
// @access  Private
export const streamGenerationProgress = async (req, res) => {
    const summaryId = req.params.id;

    if (!mongoose.isValidObjectId(summaryId)) {
        return res
            .status(400)
            .json({ success: false, error: 'Invalid summary id', statusCode: 400 });
    }
    // Ownership check — we don't want a user observing someone else's
    // pipeline progress just by knowing the id.
    const summary = await AISummary.findOne({
        _id: summaryId,
        userId: req.user._id,
    }).select('_id status');
    if (!summary) {
        return res
            .status(404)
            .json({ success: false, error: 'Summary not found', statusCode: 404 });
    }

    // ── SSE handshake ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering
    res.flushHeaders?.();

    const send = (event) => {
        // SSE wire format: `data: <json>\n\n`
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Send the plan up-front so the UI can render every stage row before
    // events start arriving (avoids the "stages appear one-by-one" flicker).
    send({
        type: 'plan',
        stagePlan: PIPELINE_STAGE_PLAN,
        at: new Date().toISOString(),
    });

    // Subscribe to the in-process bus. The registry replays its log on
    // subscribe, so the client immediately gets every event that's already
    // happened — perfect for late connections / reconnects.
    const unsubscribe = subscribeProgress(summaryId, (event) => send(event));

    // If the summary is already done at subscribe-time, the snapshot log
    // covers it. Otherwise the orchestrator will eventually emit
    // pipeline:complete / pipeline:failed and we should close.
    const closeOnTerminal = (event) => {
        if (
            event.type === 'pipeline:complete' ||
            event.type === 'pipeline:failed' ||
            event.type === 'bus:closed'
        ) {
            try {
                res.end();
            } catch {
                /* connection already gone */
            }
        }
    };
    const unsubscribeTerminal = subscribeProgress(summaryId, closeOnTerminal);

    // If the pipeline finished BEFORE this subscribe and the registry has
    // already been GC'd, getSnapshot returns null. In that case the only
    // signal is the persisted `pipeline.stages` field on the AISummary
    // doc itself — emit it then close.
    if (!getProgressSnapshot(summaryId)) {
        const persisted = await AISummary.findById(summaryId)
            .select('pipeline status')
            .lean();
        if (persisted?.pipeline?.stages?.length) {
            for (const s of persisted.pipeline.stages) {
                send({
                    type: 'stage:complete',
                    stageId: s.id,
                    label: s.label,
                    progress: s.progress,
                    durationMs: s.durationMs,
                    at: (s.completedAt || new Date()).toISOString?.() ||
                        new Date().toISOString(),
                });
            }
            send({
                type: persisted.status === 'failed' ? 'pipeline:failed' : 'pipeline:complete',
                at: new Date().toISOString(),
            });
            res.end();
            return;
        }
    }

    // Heartbeat every 25s to keep the connection through proxies.
    const heartbeat = setInterval(() => {
        try {
            res.write(`: heartbeat ${Date.now()}\n\n`);
        } catch {
            /* connection torn down */
        }
    }, 25_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
        unsubscribeTerminal();
    });
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

// @desc    List user's AI summaries (compact projection)
// @route   GET /api/ai-intelligence/history
// @access  Private
export const listIntelligenceSummaries = async (req, res, next) => {
    try {
        const summaries = await AISummary.find({ userId: req.user._id })
            .select(
                '_id sourceTitle sourceFileName sourceFileSize originalPageCount summaryPageCount compressionPercent settings.studyGoal settings.summaryLength settings.language insights status savedToDocuments savedDocumentId pdfUrl createdAt updatedAt'
            )
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            data: summaries,
            count: summaries.length,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a saved AI summary
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
        if (summary.pdfPublicId) {
            await cloudinary.uploader
                .destroy(summary.pdfPublicId, { resource_type: 'raw' })
                .catch((err) =>
                    console.error('Cloudinary destroy (summary PDF) error:', err)
                );
        }
        await summary.deleteOne();
        // Drop any in-process pipeline bus for this id so SSE clients
        // attached to it are properly closed.
        dropPipeline(summary._id.toString());
        res.status(200).json({ success: true, message: 'Summary deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Regenerate an existing summary (same source, possibly new settings)
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

        let text = '';
        if (summary.sourceDocumentId) {
            const document = await Document.findOne({
                _id: summary.sourceDocumentId,
                userId: req.user._id,
            });
            if (document && document.extractedText) text = document.extractedText;
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
            const pipelineResult = await runIntelligencePipeline({
                summaryId: summary._id.toString(),
                text,
                settings,
            });

            // Drop any cached PDF since the content just changed.
            if (summary.pdfPublicId) {
                await cloudinary.uploader
                    .destroy(summary.pdfPublicId, { resource_type: 'raw' })
                    .catch((err) =>
                        console.error('Cloudinary destroy (stale PDF) error:', err)
                    );
            }
            summary.pdfUrl = '';
            summary.pdfPublicId = '';

            await persistPipelineResult(summary, pipelineResult, settings);

            res.status(200).json({
                success: true,
                data: summary,
                message: 'Summary regenerated',
            });
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

// ── shared PDF render+upload helper ─────────────────────────────────────────

const ensurePdfRendered = async (summary) => {
    if (summary.pdfUrl && summary.pdfPublicId) return summary;

    const buffer = await renderSummaryPdf(summary);

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
            data: {
                url: summary.pdfUrl,
                fileName: `${summary.sourceTitle || 'summary'}.pdf`,
            },
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

        // Idempotency
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

        await ensurePdfRendered(summary);

        const fakeBytes = Math.max(1024, (summary.rawMarkdown || '').length);
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

        const answer = await generateText(
            askAiPrompt({
                summaryMarkdown: summary.rawMarkdown,
                question,
            }),
            { label: 'ask-ai', maxTokens: 1500 }
        );
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

        const translated = await generateText(
            translatePrompt({
                summaryMarkdown: summary.rawMarkdown,
                targetLanguage,
            }),
            { label: 'translate', maxTokens: 6000 }
        );
        res.status(200).json({
            success: true,
            data: { targetLanguage, translatedMarkdown: translated },
        });
    } catch (error) {
        next(error);
    }
};
