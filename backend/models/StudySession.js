// backend/models/StudySession.js
import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true },   // "11:00"
    duration: { type: Number, required: true },  // minutes
    status: { type: String, enum: ['planned', 'completed', 'missed', 'rescheduled'], default: 'planned' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    color: { type: String, default: '#8B5CF6' },
    notes: { type: String, default: '' },
    completedAt: { type: Date, default: null },
    originalDate: { type: Date, default: null },
    aiGenerated: { type: Boolean, default: false },

    // ✅ Three separate reminder flags
    reminder30Sent:    { type: Boolean, default: false }, // 30 min before
    reminder2Sent:     { type: Boolean, default: false }, // 2 min before
    reminderStartSent: { type: Boolean, default: false }, // exact start time
    reminder1DaySent:  { type: Boolean, default: false }, // ✅ 1 day before 

}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);