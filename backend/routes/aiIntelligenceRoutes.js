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

export default router;
