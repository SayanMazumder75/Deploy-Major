import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import ChatHistory from '../models/ChatHistory.js';
import * as geminiService from '../utils/geminiService.js';
import { findRelevantChunks } from '../utils/textChunker.js';
import AIResource from '../models/AIResource.js';
import VivaSession from '../models/VivaSession.js';

// @desc    Generate flashcards from document
// @route   POST /api/ai/generate-flashcards
// @access  Private
export const generateFlashcards = async (req, res, next) => {
    try {
        const { documentId, count = 10 } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Generate flashcards using Gemini
        const cards = await geminiService.generateFlashcards(
            document.extractedText,
            parseInt(count)
        );

        // Save to database
        const flashcardSet = await Flashcard.create({
            userId: req.user._id,
            documentId: document._id,
            cards: cards.map(card => ({
                question: card.question,
                answer: card.answer,
                difficulty: card.difficulty,
                reviewCount: 0,
                isStarred: false
            }))
        });

        res.status(201).json({
            success: true,
            data: flashcardSet,
            message: 'Flashcards generated successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Generate quiz from document
// @route   POST /api/ai/generate-quiz
// @access  Private
export const generateQuiz = async (req, res, next) => {
    try {
        const { documentId, numQuestions = 5, title } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Generate quiz using Gemini
        const questions = await geminiService.generateQuiz(
            document.extractedText,
            parseInt(numQuestions)
        );

        // Save to database
        const quiz = await Quiz.create({
            userId: req.user._id,
            documentId: document._id,
            title: title || `${document.title} - Quiz`,
            questions: questions,
            totalQuestions: questions.length,
            userAnswers: [],
            score: 0
        });

        res.status(201).json({
            success: true,
            data: quiz,
            message: 'Quiz generated successfully'
        });
    } catch (error) {
        next(error)
    }
};

// @desc    Generate document summary
// @route   POST /api/ai/generate-summary
// @access  Private
export const generateSummary = async (req, res, next) => {
    try {
        const { documentId } = req.body;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Generate summary using Gemini
        const summary = await geminiService.generateSummary(document.extractedText);

        //Storing the summary permanent
        await AIResource.create({
            userId: req.user._id,
            documentId: document._id,
            type: 'summary',
            title: `${document.title} Summary`,
            content: summary,
        });

        res.status(200).json({
            success: true,
            data: {
                documentId: document._id,
                title: document.title,
                summary
            },
            message: 'Summary generated successfully'
        });
    } catch (error) {
        next(error)
    }
};

// @desc    Chat with document
// @route   POST /api/ai/chat
// @access  Private
export const chat = async (req, res, next) => {
    try {
        const { documentId, question } = req.body;

        if (!documentId || !question) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and question',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Find relevant chunks
        const relevantChunks = findRelevantChunks(document.chunks, question, 3);
        const chunkIndices = relevantChunks.map(c => c.chunkIndex);

        // Get or create chat history
        let chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: document._id
        });

        if (!chatHistory) {
            chatHistory = await ChatHistory.create({
                userId: req.user._id,
                documentId: document._id,
                messages: []
            });
        }

        // Generate response using Gemini
        const recentMessages = chatHistory.messages //added this PHASE 2
            .slice(-6)
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));
        const answer = await geminiService.chatWithContext(
            question,
            relevantChunks,
            recentMessages
        );//Till this 

        // Save conversation
        chatHistory.messages.push(
            {
                role: 'user',
                content: question,
                timestamp: new Date(),
                relevantChunks: []
            },
            {
                role: 'assistant',
                content: answer,
                timestamp: new Date(),
                relevantChunks: chunkIndices
            }
        );

        await chatHistory.save();

        res.status(200).json({
            success: true,
            data: {
                question,
                answer,
                relevantChunks: chunkIndices,
                chatHistoryId: chatHistory._id
            },
            message: 'Response generated successfully'
        });
    } catch (error) {
        next(error)
    }
};

// @desc    Explain concept from document
// @route   POST /api/ai/explain-concept
// @access  Private
export const explainConcept = async (req, res, next) => {
    try {
        const { documentId, concept } = req.body;

        if (!documentId || !concept) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId and concept',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        // Find relevant chunks for the concept
        const relevantChunks = findRelevantChunks(document.chunks, concept, 3);
        const context = relevantChunks.map(c => c.content).join('\n\n');

        // Generate explanation using Gemini
        const explanation = await geminiService.explainConcept(concept, context);

        res.status(200).json({
            success: true,
            data: {
                concept,
                explanation,
                relevantChunks: relevantChunks.map(c => c.chunkIndex)
            },
            message: 'Explanation generated successfully'
        });
    } catch (error) {
        next(error)
    }
};

// @desc    Get chat history for a document
// @route   GET /api/ai/chat-history/:documentId
// @access  Private
export const getChatHistory = async (req, res, next) => {
    try {
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const chatHistory = await ChatHistory.findOne({
            userId: req.user._id,
            documentId: documentId
        }).select('messages'); // Only retrieve the messages array

        if (!chatHistory) {
            return res.status(200).json({
                success: true,
                data: [], // Return an empty array if no chat history found
                message: 'No chat history found for this document'
            });
        }

        res.status(200).json({
            success: true,
            data: chatHistory.messages,
            message: 'Chat history retrieved successfully'
        });
    } catch (error) {
        next(error)
    }
};

//For AI ACTION PAGE
export const generateVivaQuestions = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        const userId = req.user.id;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        const vivaQuestions = await geminiService.generateVivaQuestions(
            document.extractedText
        );

        await AIResource.create({
            userId,
            documentId,
            type: "viva",
            title: `${document.title} Viva Questions`,
            content: vivaQuestions,
        });

        res.status(200).json({
            success: true,
            data: vivaQuestions,
            message: 'Viva questions generated successfully'
        });

    } catch (error) {
        next(error);
    }
};

//For Revision Notes Generator
export const generateRevisionNotes = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        const userId = req.user.id;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        const revisionNotes = await geminiService.generateRevisionNotes(
            document.extractedText
        );
        await AIResource.create({
            userId,
            documentId,
            type: "revision",
            title: `${document.title} Revision Notes`,
            content: revisionNotes,
        });

        res.status(200).json({
            success: true,
            data: revisionNotes,
            message: 'Revision notes generated successfully'
        });

    } catch (error) {
        next(error);
    }
};

//Memory tricks
export const generateMemoryTricks = async (req, res, next) => {
    try {
        const { documentId } = req.body;
        const userId = req.user.id;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: 'Please provide documentId',
                statusCode: 400
            });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found or not ready',
                statusCode: 404
            });
        }

        const memoryTricks = await geminiService.generateMemoryTricks(
            document.extractedText
        );
        await AIResource.create({
            userId,
            documentId,
            type: "memory",
            title: `${document.title} Memory Tricks`,
            content: memoryTricks,
        });

        res.status(200).json({
            success: true,
            data: memoryTricks,
            message: 'Memory tricks generated successfully'
        });

    } catch (error) {
        next(error);
    }
};


//For permanent Storing
export const getAIResources = async (req, res, next) => {
    try {

        const resources = await AIResource.find({
            userId: req.user._id
        })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: resources,
        });

    } catch (error) {
        next(error);
    }
};

//For DELETING
export const deleteAIResource = async (req, res) => {
    try {

        const { resourceId } = req.params;
        const userId = req.user.id;

        const resource = await AIResource.findOne({
            _id: resourceId,
            userId,
        });

        if (!resource) {
            return res.status(404).json({
                success: false,
                message: "Resource not found",
            });
        }

        await AIResource.findByIdAndDelete(resourceId);

        res.json({
            success: true,
            message: "Resource deleted successfully",
        });

    } catch (error) {

        console.error("Delete AI Resource Error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete resource",
        });
    }
};


// @desc    Generate a single viva question
// @route   POST /api/ai/viva-question
// @access  Private
export const generateVivaQuestion = async (req, res, next) => {
    try {
        const { documentId, topic, personality = 'teacher', previousQuestions = [] } = req.body;

        if (!documentId) {
            return res.status(400).json({ success: false, error: 'Please provide documentId' });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found or not ready' });
        }

        const question = await geminiService.generateVivaQuestion(
            document.extractedText,
            topic,
            personality,
            previousQuestions
        );

        res.status(200).json({
            success: true,
            data: { question },
            message: 'Viva question generated'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Evaluate student's viva answer
// @route   POST /api/ai/viva-evaluate
// @access  Private
export const evaluateVivaAnswer = async (req, res, next) => {
    try {
        const { documentId, question, answer, personality = 'teacher' } = req.body;

        if (!documentId || !question || !answer) {
            return res.status(400).json({ success: false, error: 'Please provide documentId, question and answer' });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id,
            status: 'ready'
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const feedback = await geminiService.evaluateVivaAnswer(
            question,
            answer,
            personality,
            document.extractedText
        );

        res.status(200).json({
            success: true,
            data: { feedback },
            message: 'Answer evaluated'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Save completed viva session
// @route   POST /api/ai/viva-save
// @access  Private
export const saveVivaSession = async (req, res, next) => {
    try {
        const { documentId, personality, topic, exchanges, score, duration } = req.body;

        if (!documentId || !exchanges) {
            return res.status(400).json({ success: false, error: 'Please provide documentId and exchanges' });
        }

        const document = await Document.findOne({
            _id: documentId,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        const session = await VivaSession.create({
            userId: req.user._id,
            documentId,
            documentTitle: document.title,
            personality,
            topic: topic || 'General',
            exchanges,
            score: score || 0,
            duration: duration || 0,
            weakTopics: extractWeakTopics(exchanges),
        });

        res.status(201).json({
            success: true,
            data: session,
            message: 'Viva session saved successfully'
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Get all viva sessions for user
// @route   GET /api/ai/viva-sessions
// @access  Private
export const getVivaSessions = async (req, res, next) => {
    try {
        const sessions = await VivaSession.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            data: sessions,
        });
    } catch (error) {
        next(error);
    }
};

// Helper: extract weak topics from exchanges where student struggled
const extractWeakTopics = (exchanges) => {
    return exchanges
        .filter(e => e.quality === 'poor' || e.quality === 'partial')
        .map(e => e.question.split(' ').slice(0, 6).join(' ') + '...')
        .slice(0, 5);
};
