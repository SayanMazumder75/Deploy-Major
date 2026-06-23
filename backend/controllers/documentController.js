import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';

// @desc    Upload PDF document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
    // Track the temp local path so the finally-style cleanup below can
    // always reach it, whether we succeed, fail at parsing, or fail at
    // the Cloudinary upload step.
    let tempFilePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Please upload a PDF file',
                statusCode: 400
            });
        }

        tempFilePath = req.file.path;

        const { title } = req.body;

        if (!title) {
            await fs.unlink(tempFilePath).catch(() => { });
            return res.status(400).json({
                success: false,
                error: 'Please provide a document title',
                statusCode: 400
            });
        }

        // ── Step 2: Extract text locally ────────────────────────────────
        // extractTextFromPDF needs a real filesystem path, so this still
        // runs against multer's temp file BEFORE anything touches
        // Cloudinary — unchanged from the original flow.
        const { text } = await extractTextFromPDF(tempFilePath);

        // ── Step 3: Generate chunks ──────────────────────────────────────
        const chunks = chunkText(text, 500, 50);

        // ── Step 4: Upload PDF to Cloudinary ────────────────────────────
        // resource_type "raw" is required for non-image files (PDFs);
        // Cloudinary's default "image" pipeline will silently fail or
        // mis-handle them otherwise.
        let cloudinaryResult;
        try {
            cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
                resource_type: 'raw',
                folder: 'meetmind-documents',
                // Keep the original filename (minus extension) visible in
                // the Cloudinary dashboard for easier debugging; Cloudinary
                // still appends its own unique suffix internally.
                use_filename: true,
                unique_filename: true,
            });
        } catch (uploadErr) {
            await fs.unlink(tempFilePath).catch(() => { });
            console.error('Cloudinary upload error:', uploadErr);
            return res.status(502).json({
                success: false,
                error: 'Failed to upload document to cloud storage',
                statusCode: 502
            });
        }

        // ── Step 5: Save document with Cloudinary URL ───────────────────
        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.originalname,
            filePath: cloudinaryResult.secure_url,
            cloudinaryPublicId: cloudinaryResult.public_id,
            fileSize: req.file.size,
            extractedText: text,
            chunks: chunks,
            status: 'ready'
        });

        // ── Step 6: Delete temp local file ───────────────────────────────
        await fs.unlink(tempFilePath).catch(() => { });
        tempFilePath = null;

        res.status(201).json({
            success: true,
            data: document,
            message: 'Document uploaded successfully.'
        });

    } catch (error) {
        // Clean up the temp file on any unexpected failure (e.g. PDF
        // parsing throws) so multer's temp dir doesn't accumulate orphans.
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => { });
        }
        next(error);
    }
};

// @desc    Get all user documents
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(req.user._id) }
            },
            {
                $lookup: {
                    from: 'flashcards',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'flashcardSets'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'quizzes'
                }
            },
            {

                $addFields: {
                    flashcardCount: { $size: '$flashcardSets' },
                    quizCount: { $size: '$quizzes' }
                }
            },
            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashcardSets: 0,
                    quizzes: 0
                }
            },
            {
                $sort: { uploadDate: -1 }
            }
        ]);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single document with chunks
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        // Get counts of associated flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user._id });
        const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user._id });

        // Update last accessed
        document.lastAccessed = Date.now();
        await document.save();

        // Combine document data with counts
        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;

        res.status(200).json({
            success: true,
            data: documentData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        // ── Delete from Cloudinary (new uploads) ─────────────────────────
        // cloudinaryPublicId only exists on documents uploaded after this
        // migration. Legacy documents (localhost filePath, no
        // cloudinaryPublicId) are left untouched — there's no Cloudinary
        // asset to remove for them, and we deliberately do NOT attempt
        // fs.unlink(document.filePath) anymore since filePath is now
        // either a Cloudinary URL (new docs) or an unreachable localhost
        // URL (old docs); neither is a valid local filesystem path.
        if (document.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(document.cloudinaryPublicId, {
                resource_type: 'raw'
            }).catch((err) => {
                // Don't block the MongoDB delete on a Cloudinary hiccup —
                // log it so an orphaned asset can be cleaned up manually,
                // but the user's intent (remove this document) still
                // succeeds.
                console.error('Cloudinary destroy error:', err);
            });
        }

        // Delete document
        await document.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};