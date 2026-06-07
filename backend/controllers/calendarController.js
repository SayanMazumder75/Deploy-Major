// backend/controllers/calendarController.js
import axios from 'axios';
import StudySession from '../models/StudySession.js';
import ExamSchedule from '../models/ExamSchedule.js';
import Document from '../models/Document.js';
import Quiz from '../models/Quiz.js';
import VivaSession from '../models/VivaSession.js';
// import VivaSession from '../models/VivaSession.js';
import * as geminiService from '../utils/geminiService.js';
// import axios from 'axios';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// ─── STUDY SESSIONS ───────────────────────────────────────────────────────────

export const getSessions = async (req, res, next) => {
    try {
        const { month, year } = req.query;
        let filter = { userId: req.user._id };

        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0, 23, 59, 59);
            filter.date = { $gte: start, $lte: end };
        }

        const sessions = await StudySession.find(filter).sort({ date: 1, startTime: 1 });
        res.status(200).json({ success: true, data: sessions });
    } catch (error) { next(error); }
};

export const createSession = async (req, res, next) => {
    try {
        const { title, subject, documentId, date, startTime, endTime, duration, priority, color, notes } = req.body;

        const session = await StudySession.create({
            userId: req.user._id,
            title, subject, documentId: documentId || null,
            date, startTime, endTime,
            duration: duration || 60, priority, color, notes
        });

        res.status(201).json({ success: true, data: session });
    } catch (error) { next(error); }
};

export const updateSession = async (req, res, next) => {
    try {
        const session = await StudySession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body,
            { new: true }
        );
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
        res.status(200).json({ success: true, data: session });
    } catch (error) { next(error); }
};

export const deleteSession = async (req, res, next) => {
    try {
        await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.status(200).json({ success: true, message: 'Session deleted' });
    } catch (error) { next(error); }
};

export const markSessionComplete = async (req, res, next) => {
    try {
        const session = await StudySession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { status: 'completed', completedAt: new Date() },
            { new: true }
        );
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        // Update exam hours studied
        if (session.subject) {
            await ExamSchedule.findOneAndUpdate(
                { userId: req.user._id, subject: session.subject },
                { $inc: { hoursStudied: session.duration / 60 } }
            );
        }

        res.status(200).json({ success: true, data: session });
    } catch (error) { next(error); }
};

export const rescheduleSession = async (req, res, next) => {
    try {
        const { newDate, newStartTime, newEndTime } = req.body;
        const session = await StudySession.findOne({ _id: req.params.id, userId: req.user._id });
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        session.originalDate = session.originalDate || session.date;
        session.date = newDate;
        session.startTime = newStartTime;
        session.endTime = newEndTime;
        session.status = 'rescheduled';
        await session.save();

        res.status(200).json({ success: true, data: session });
    } catch (error) { next(error); }
};

// ─── EXAM SCHEDULES ───────────────────────────────────────────────────────────

export const getExams = async (req, res, next) => {
    try {
        const exams = await ExamSchedule.find({ userId: req.user._id }).sort({ examDate: 1 });
        res.status(200).json({ success: true, data: exams });
    } catch (error) { next(error); }
};

export const createExam = async (req, res, next) => {
    try {
        const exam = await ExamSchedule.create({ userId: req.user._id, ...req.body });
        res.status(201).json({ success: true, data: exam });
    } catch (error) { next(error); }
};

export const updateExam = async (req, res, next) => {
    try {
        const exam = await ExamSchedule.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            req.body, { new: true }
        );
        if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
        res.status(200).json({ success: true, data: exam });
    } catch (error) { next(error); }
};

export const deleteExam = async (req, res, next) => {
    try {
        await ExamSchedule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.status(200).json({ success: true, message: 'Exam deleted' });
    } catch (error) { next(error); }
};

// ─── AUTO-DETECT EXAMS FROM DOCUMENT ─────────────────────────────────────────

export const detectExamsFromDocument = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        const document = await Document.findOne({ _id: documentId, userId: req.user._id, status: 'ready' });
        if (!document) return res.status(404).json({ success: false, error: 'Document not found' });

        const prompt = `
Analyze this study document and extract any exam, assignment, quiz, or deadline information.

Return ONLY a JSON array like this (no markdown, no explanation):
[
  {
    "subject": "subject name",
    "examDate": "YYYY-MM-DD",
    "examType": "final|midterm|quiz|assignment|viva|other",
    "notes": "any extra info"
  }
]

If no dates found, return empty array: []

Document text:
${document.extractedText.substring(0, 3000)}
`;
        const response = await geminiService.rawGenerate(prompt);
        let detected = [];
        try {
            const clean = response.replace(/```json|```/g, '').trim();
            detected = JSON.parse(clean);
        } catch (e) {
            detected = [];
        }

        const created = [];
        for (const item of detected) {
            if (item.subject && item.examDate) {
                const exam = await ExamSchedule.create({
                    userId: req.user._id,
                    subject: item.subject,
                    examDate: new Date(item.examDate),
                    examType: item.examType || 'other',
                    notes: item.notes || '',
                    documentId,
                    autoDetected: true,
                    color: '#EF4444',
                });
                created.push(exam);
            }
        }

        res.status(200).json({ success: true, data: created, message: `${created.length} exams detected` });
    } catch (error) { next(error); }
};

// ─── AI SCHEDULE GENERATION ───────────────────────────────────────────────────

export const generateAISchedule = async (req, res, next) => {
    try {
        const { availableHoursPerDay = 4, studyDaysPerWeek = 5, preferredStartTime = '09:00' } = req.body;

        // Get user's exams and existing performance data
        const exams = await ExamSchedule.find({ userId: req.user._id, examDate: { $gte: new Date() } }).sort({ examDate: 1 });
        const vivaSessions = await VivaSession.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
        const quizzes = await Quiz.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);

        if (exams.length === 0) {
            return res.status(400).json({ success: false, error: 'Please add at least one exam first' });
        }

        // Try Python ML API first, fallback to Gemini
        let schedule = [];
        try {
            const mlResponse = await axios.post(`${ML_API_URL}/predict-schedule`, {
                exams: exams.map(e => ({
                    subject: e.subject,
                    examDate: e.examDate,
                    hoursNeeded: e.totalStudyHoursNeeded,
                    hoursStudied: e.hoursStudied,
                    priority: e.priority,
                })),
                availableHoursPerDay,
                studyDaysPerWeek,
                preferredStartTime,
                weakTopics: vivaSessions.flatMap(v => v.weakTopics || []),
            }, { timeout: 5000 });
            schedule = mlResponse.data.schedule;
        } catch (mlError) {
            // Fallback to Gemini
            console.log('ML API not available, using Gemini fallback');
            schedule = await generateScheduleWithGemini(exams, availableHoursPerDay, studyDaysPerWeek, preferredStartTime);
        }

        // Save generated sessions to DB
        const savedSessions = [];
        for (const item of schedule) {
            const session = await StudySession.create({
                userId: req.user._id,
                title: `Study ${item.subject}`,
                subject: item.subject,
                date: new Date(item.date),
                startTime: item.startTime,
                endTime: item.endTime,
                duration: item.duration,
                priority: item.priority || 'medium',
                color: item.color || '#8B5CF6',
                aiGenerated: true,
            });
            savedSessions.push(session);
        }

        res.status(200).json({ success: true, data: savedSessions, message: `${savedSessions.length} study sessions generated` });
    } catch (error) { next(error); }
};

const generateScheduleWithGemini = async (exams, hoursPerDay, daysPerWeek, startTime) => {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
You are a study schedule planner. Generate a study timetable.

Today: ${today}
Available hours per day: ${hoursPerDay}
Study days per week: ${daysPerWeek}
Preferred start time: ${startTime}

Exams:
${exams.map(e => `- ${e.subject}: exam on ${e.examDate.toISOString().split('T')[0]}, priority: ${e.priority}`).join('\n')}

Return ONLY a JSON array (no markdown):
[
  {
    "subject": "subject name",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "duration": 60,
    "priority": "high|medium|low",
    "color": "#hex"
  }
]

Rules:
- Generate sessions from tomorrow until the last exam
- Don't schedule on the same day as an exam
- Prioritize closer exams
- Max 2 subjects per day
- Session duration: 60-120 minutes
- Assign colors: high=#EF4444, medium=#8B5CF6, low=#10B981
`;
    const response = await geminiService.rawGenerate(prompt);
    const clean = response.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
};

// ─── PERFORMANCE ANALYTICS ────────────────────────────────────────────────────

export const getAnalytics = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const [sessions, exams, quizzes, vivaSessions] = await Promise.all([
            StudySession.find({ userId }),
            ExamSchedule.find({ userId }),
            Quiz.find({ userId }),
            VivaSession.find({ userId }),
        ]);

        const totalSessions = sessions.length;
        const completed = sessions.filter(s => s.status === 'completed').length;
        const missed = sessions.filter(s => s.status === 'missed').length;
        const completionRate = totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0;
        const totalStudyHours = sessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.duration / 60), 0);

        // Subject breakdown
        const subjectMap = {};
        sessions.filter(s => s.status === 'completed').forEach(s => {
            subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.duration / 60;
        });

        // Quiz performance
        const avgQuizScore = quizzes.length > 0
            ? Math.round(quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length)
            : 0;

        // Viva performance
        const avgVivaScore = vivaSessions.length > 0
            ? Math.round(vivaSessions.reduce((acc, v) => acc + (v.score || 0), 0) / vivaSessions.length)
            : 0;

        // Weak topics from viva
        const weakTopics = [...new Set(vivaSessions.flatMap(v => v.weakTopics || []))].slice(0, 5);

        // Try ML performance prediction
        let performancePrediction = null;
        try {
            const mlRes = await axios.post(`${ML_API_URL}/predict-performance`, {
                completionRate,
                totalStudyHours,
                avgQuizScore,
                avgVivaScore,
                missedSessions: missed,
            }, { timeout: 5000 });
            performancePrediction = mlRes.data;
        } catch (e) {
            // ML not available
        }

        res.status(200).json({
            success: true,
            data: {
                totalSessions, completed, missed, completionRate,
                totalStudyHours: Math.round(totalStudyHours * 10) / 10,
                subjectBreakdown: subjectMap,
                avgQuizScore, avgVivaScore,
                weakTopics,
                upcomingExams: exams.filter(e => e.examDate >= new Date()).length,
                performancePrediction,
            }
        });
    } catch (error) { next(error); }
};

// ─── AUTO RESCHEDULE MISSED SESSIONS ─────────────────────────────────────────

export const autoRescheduleMissed = async (req, res, next) => {
    try {
        const now = new Date();
        const missed = await StudySession.find({
            userId: req.user._id,
            status: 'planned',
            date: { $lt: now }
        });

        // Mark as missed
        for (const s of missed) {
            s.status = 'missed';
            await s.save();
        }

        // Reschedule each missed session to next available day
        const rescheduled = [];
        for (const session of missed) {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + (rescheduled.length + 1));
            const newSession = await StudySession.create({
                userId: req.user._id,
                title: `[Rescheduled] ${session.title}`,
                subject: session.subject,
                documentId: session.documentId,
                date: newDate,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                priority: session.priority,
                color: session.color,
                notes: session.notes,
                originalDate: session.date,
                status: 'rescheduled',
                aiGenerated: true,
            });
            rescheduled.push(newSession);
        }

        res.status(200).json({
            success: true,
            data: { missed: missed.length, rescheduled: rescheduled.length, sessions: rescheduled },
            message: `${missed.length} sessions marked missed, ${rescheduled.length} rescheduled`
        });
    } catch (error) { next(error); }
};
