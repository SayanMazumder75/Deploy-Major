// backend/models/ExamSchedule.js
import mongoose from 'mongoose';

const examScheduleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    examDate: { type: Date, required: true },
    examType: { type: String, enum: ['midterm', 'final', 'quiz', 'assignment', 'viva', 'other'], default: 'final' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    totalStudyHoursNeeded: { type: Number, default: 10 },
    hoursStudied: { type: Number, default: 0 },
    color: { type: String, default: '#EF4444' },
    notes: { type: String, default: '' },
    autoDetected: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('ExamSchedule', examScheduleSchema);