// ─── NEW FILE: backend/models/VivaSession.js ─────────────────────────────────
import mongoose from 'mongoose';

const exchangeSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, default: '' },
    feedback: { type: String, default: '' },
    quality: {
        type: String,
        enum: ['good', 'partial', 'poor', 'unanswered'],
        default: 'unanswered'
    },
    timestamp: { type: Date, default: Date.now }
});

const vivaSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    documentTitle: { type: String, default: '' },
    personality: {
        type: String,
        enum: ['teacher', 'friendly', 'strict', 'motivational'],
        default: 'teacher'
    },
    topic: { type: String, default: 'General' },
    exchanges: [exchangeSchema],
    score: { type: Number, default: 0 },        // 0-100
    duration: { type: Number, default: 0 },     // seconds
    weakTopics: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('VivaSession', vivaSessionSchema);
