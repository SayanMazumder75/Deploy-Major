import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js'
import errorHandler from './middleware/errorHandler.js';
import cron from 'node-cron';

import authRoutes from './routes/authRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';

import StudySession from './models/StudySession.js';
import User from './models/User.js';
import { sendReminderEmail } from './utils/sendEmail.js';

// ES6 module __dirname alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware to handle CORS
app.use(
    cors({
        origin: "*",
        method: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/calendar', calendarRoutes);

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        statusCode: 404
    });
});

// ─── CRON JOB — runs every minute, sends 3 reminders ─────────────────────────
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // REPLACE WITH THIS:
const sessions = await StudySession.find({
    status: 'planned',
    $or: [
        { reminder1DaySent: false },
        { reminder30Sent: false },
        { reminder2Sent: false },
        { reminderStartSent: false },
    ]
});

        console.log(`⏰ Cron running at ${now.toLocaleTimeString()} — checking ${sessions.length} sessions`);

        for (const session of sessions) {
            // Build full datetime from date + startTime "09:00"
            const [hours, minutes] = session.startTime.split(':').map(Number);
            const sessionDateTime = new Date(session.date);
            sessionDateTime.setHours(hours, minutes, 0, 0);

            const diffMin = (sessionDateTime - now) / 60000;

            const user = await User.findById(session.userId);
            if (!user?.email) continue;

            // ✅ 30 minutes before
            if (diffMin >= 29 && diffMin <= 31 && !session.reminder30Sent) {
                await sendReminderEmail(
                    user.email,
                    `⏰ 30 Min Reminder: ${session.title}`,
                    session.date,
                    session.startTime
                );
                session.reminder30Sent = true;
                await session.save();
                console.log(`✅ 30min reminder sent: ${session.title} to ${user.email}`);
            }
            // ✅ 1 day before (between 23hrs 55min and 24hrs 5min away)
if (diffMin >= 1435 && diffMin <= 1445 && !session.reminder1DaySent) {
    await sendReminderEmail(
        user.email,
        `📅 Tomorrow: ${session.title}`,
        session.date,
        session.startTime
    );
    session.reminder1DaySent = true;
    await session.save();
    console.log(`✅ 1 day reminder sent: ${session.title} to ${user.email}`);
}

            // ✅ 2 minutes before
            if (diffMin >= 1 && diffMin <= 3 && !session.reminder2Sent) {
                await sendReminderEmail(
                    user.email,
                    `🚨 Starting in 2 Min: ${session.title}`,
                    session.date,
                    session.startTime
                );
                session.reminder2Sent = true;
                await session.save();
                console.log(`✅ 2min reminder sent: ${session.title} to ${user.email}`);
            }

            // ✅ Exact start time
            if (diffMin >= -1 && diffMin <= 1 && !session.reminderStartSent) {
                await sendReminderEmail(
                    user.email,
                    `🎯 Starting NOW: ${session.title}`,
                    session.date,
                    session.startTime
                );
                session.reminderStartSent = true;
                await session.save();
                console.log(`✅ Start time reminder sent: ${session.title} to ${user.email}`);
            }
        }
    } catch (err) {
        console.error('❌ Cron error:', err.message);
    }
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`⏰ Reminder cron job is active — sending reminders at 30min, 2min, and start time`);
});

process.on('unhandledRejection', (err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});