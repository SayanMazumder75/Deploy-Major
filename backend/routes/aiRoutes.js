import express from 'express';
import {
    generateFlashcards,
    generateQuiz,
    generateSummary,
    chat,
    explainConcept,
    getChatHistory,
    generateVivaQuestions,
    generateRevisionNotes,
    generateMemoryTricks,
    getAIResources,
    deleteAIResource
} from '../controllers/aiController.js';
import protect from '../middleware/auth.js';

import { generateVivaQuestion, evaluateVivaAnswer, saveVivaSession, getVivaSessions } from '../controllers/aiController.js';

const router = express.Router();

router.use(protect);

router.post('/generate-flashcards', generateFlashcards);
router.post('/generate-quiz', generateQuiz);
router.post('/generate-summary', generateSummary);
router.post('/chat', chat);
router.post('/explain-concept', explainConcept);
router.get('/chat-history/:documentId', getChatHistory);
router.post('/generate-viva', generateVivaQuestions);
router.post('/generate-revision-notes', generateRevisionNotes);
router.post('/generate-memory-tricks', generateMemoryTricks);
router.get('/resources', getAIResources);
router.delete("/resource/:resourceId",protect,deleteAIResource);

router.post('/viva-question', generateVivaQuestion);
router.post('/viva-evaluate', evaluateVivaAnswer);
router.post('/viva-save', saveVivaSession);
router.get('/viva-sessions', getVivaSessions);

export default router;