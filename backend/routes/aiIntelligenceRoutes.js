import express from 'express';
import protect from '../middleware/auth.js';
import upload from '../config/multer.js';
import {
    generateIntelligenceSummary,
    getIntelligenceSummary,
    listIntelligenceSummaries,
    deleteIntelligenceSummary,
    regenerateIntelligenceSummary,
    downloadIntelligencePdf,
    saveSummaryToDocuments,
    askIntelligenceSummary,
    translateIntelligenceSummary,
    streamGenerationProgress,
} from '../controllers/aiIntelligenceController.js';

const router = express.Router();

// ── auth gate ────────────────────────────────────────────────────────────────
router.use(protect);

// ── generation ───────────────────────────────────────────────────────────────
// Multer is wired in `single('file')` mode so the same endpoint can serve
// both flows:
//   - JSON body with `documentId`        → req.file is undefined; the
//                                           controller reads the existing
//                                           Document's `extractedText`.
//   - multipart/form-data with `file`    → req.file is set and we parse the
//                                           PDF in-line. `settings` arrives
//                                           as a JSON string in this case
//                                           and is parsed by the controller.
router.post('/generate', upload.single('file'), generateIntelligenceSummary);

// ── viewer / history ─────────────────────────────────────────────────────────
// History MUST be declared before the `:id` route, otherwise express matches
// "/history" as `id === 'history'` and the lookup fails.
router.get('/history', listIntelligenceSummaries);
router.get('/:id', getIntelligenceSummary);
router.delete('/:id', deleteIntelligenceSummary);

// ── viewer-side actions ──────────────────────────────────────────────────────
router.post('/:id/regenerate', regenerateIntelligenceSummary);
router.get('/:id/download', downloadIntelligencePdf);
router.post('/:id/save-to-documents', saveSummaryToDocuments);
router.post('/:id/ask', askIntelligenceSummary);
router.post('/:id/translate', translateIntelligenceSummary);

// ── progress (SSE) ───────────────────────────────────────────────────────────
// Live progress stream for an in-flight (or recently completed) generation.
// SSE is preferable to polling here because the V2 processing screen wants
// per-stage events the moment they happen, and SSE is supported by every
// browser without any extra client-side library beyond `EventSource`.
router.get('/:id/progress', streamGenerationProgress);

export default router;
