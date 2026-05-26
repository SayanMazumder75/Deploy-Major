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
    generateMemoryTricks
} from '../controllers/aiController.js';
import protect from '../middleware/auth.js';

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

export default router;