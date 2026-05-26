import mongoose from 'mongoose';

const aiResourceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
        },

        type: {
            type: String,
            enum: [
                'summary',
                'viva',
                'revision',
                'memory'
            ],
            required: true,
        },

        title: {
            type: String,
            required: true,
        },

        content: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const AIResource = mongoose.model(
    'AIResource',
    aiResourceSchema
);

export default AIResource;