import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please provide a document title'],
        trim: true
    },
    fileName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    // ── ADDED ──────────────────────────────────────────────────────────
    // Cloudinary's public_id for this asset, needed to delete the file
    // later via cloudinary.uploader.destroy(cloudinaryPublicId, ...).
    // Not required: legacy documents uploaded before this migration
    // have a localhost filePath and no cloudinaryPublicId — they are
    // left as-is per the "no auto-migration" requirement.
    cloudinaryPublicId: {
        type: String
    },
    fileSize: {
        type: Number,
        required: true
    },
    extractedText: {
        type: String,
        default: ''
    },
    chunks: [{
        content: {
            type: String,
            required: true
        },
        pageNumber: {
            type: Number,
            default: 0,
        },
        chunkIndex: {
            type: Number,
            required: true
        }
    }],
    uploadDate: {
        type: Date,
        default: Date.now
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'processing'
    },
    // ── AI-generated documents (AI Document Intelligence "Save to Documents")
    // When a user generates a summary in the AI Intelligence module and then
    // clicks "Save to Documents", we render a PDF, upload it to Cloudinary,
    // and create a Document record with `aiGenerated: true` plus a back-ref
    // to the originating AISummary. Both fields are optional / default-false
    // so regular uploads are completely unaffected. The Documents page uses
    // these to show an "AI Generated" badge on the card.
    aiGenerated: {
        type: Boolean,
        default: false
    },
    aiSummaryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AISummary',
        default: null
    }
}, {
    timestamps: true
});

// Index for faster queries
documentSchema.index({ userId: 1, uploadDate: -1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;