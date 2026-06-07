// backend/routes/calendarRoutes.js
import express from 'express';
import protect from '../middleware/auth.js';
import {
    getSessions, createSession, updateSession, deleteSession,
    markSessionComplete, rescheduleSession,
    getExams, createExam, updateExam, deleteExam,
    detectExamsFromDocument, generateAISchedule,
    getAnalytics, autoRescheduleMissed,
} from '../controllers/calendarController.js';

const router = express.Router();
router.use(protect);

// Study Sessions
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);
router.patch('/sessions/:id/complete', markSessionComplete);
router.patch('/sessions/:id/reschedule', rescheduleSession);

// Exams
router.get('/exams', getExams);
router.post('/exams', createExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);

// AI Features
router.post('/detect-exams', detectExamsFromDocument);
router.post('/generate-schedule', generateAISchedule);
router.post('/auto-reschedule', autoRescheduleMissed);

// Analytics
router.get('/analytics', getAnalytics);

export default router;