import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const generateFlashcards = async (documentId, options) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.GENERATE_FLASHCARDS, { documentId, ...options });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to generate flashcards' };
    }
};

// const generateQuiz = async (documentId, options) => {
//     try {
//         const response = await axiosInstance.post(API_PATHS.AI.GENERATE_QUIZ, { documentId, ...options });
//         return response.data;
//     } catch (error) {
//         throw error.response?.data || { message: 'Failed to generate quiz' };
//     }
// };
const generateQuiz = async (documentId, data) => {

    try {

        console.log("DOCUMENT ID:", documentId);

        console.log("DATA:", data);

        const response = await axiosInstance.post(
            API_PATHS.AI.GENERATE_QUIZ,
            {
                documentId,
                ...data,
            }
        );

        console.log("QUIZ GENERATED:", response.data);

        return response.data;

    } catch (error) {

        console.log("FULL ERROR:", error);

        console.log("ERROR RESPONSE:", error.response);

        console.log("ERROR DATA:", error.response?.data);

        throw error.response?.data || {
            message: "Failed to generate quiz"
        };
    }
};

const generateSummary = async (documentId) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.GENERATE_SUMMARY, { documentId });
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to generate summary' };
    }
};

const chat = async (documentId, message) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.CHAT, { documentId, question: message }); // Removed history from payload
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Chat request failed' };
    }
};

const explainConcept = async (documentId, concept) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.EXPLAIN_CONCEPT, { documentId, concept });
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to explain concept' };
    }
};

const getChatHistory = async (documentId) => {
    try {
        const response = await axiosInstance.get(API_PATHS.AI.GET_CHAT_HISTORY(documentId));
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch chat history' };
    }
};

//for AI ACTION VIVA
const generateVivaQuestions = async (documentId) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AI.GENERATE_VIVA,
            { documentId }
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || {
            message: 'Failed to generate viva questions'
        };
    }
};

//for Revision Notes
const generateRevisionNotes = async (documentId) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AI.GENERATE_REVISION_NOTES,
            { documentId }
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || {
            message: 'Failed to generate revision notes'
        };
    }
};

//Memory Tricks
const generateMemoryTricks = async (documentId) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AI.GENERATE_MEMORY_TRICKS,
            { documentId }
        );

        return response.data;

    } catch (error) {
        throw error.response?.data || {
            message: 'Failed to generate memory tricks'
        };
    }
};

//For permanent Storage
const getAIResources = async () => {
    try {

        const response = await axiosInstance.get(
            API_PATHS.AI.GET_RESOURCES
        );

        return response.data;

    } catch (error) {

        throw error.response?.data || {
            message: 'Failed to fetch AI resources'
        };
    }
};

//DELETING STUDY VAULT
export const deleteAIResource = async (resourceId) => {

    const response = await axiosInstance.delete(
        `/api/ai/resource/${resourceId}`
    );

    return response.data;
};


// ─── ADD THESE TO YOUR frontend/src/services/aiService.js ────────────────────

const generateVivaQuestion = async (documentId, topic, personality, previousQuestions) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.VIVA_QUESTION, {
            documentId, topic, personality, previousQuestions
        });
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to generate viva question' };
    }
};

const evaluateVivaAnswer = async (documentId, question, answer, personality) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.VIVA_EVALUATE, {
            documentId, question, answer, personality
        });
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to evaluate answer' };
    }
};

const saveVivaSession = async (documentId, sessionData) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI.VIVA_SAVE, {
            documentId, ...sessionData
        });
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to save viva session' };
    }
};

const getVivaSessions = async () => {
    try {
        const response = await axiosInstance.get(API_PATHS.AI.VIVA_SESSIONS);
        return response.data?.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch viva sessions' };
    }
};


const aiService = {
    generateFlashcards,
    generateQuiz,
    generateSummary,
    generateVivaQuestions,
    chat,
    explainConcept,
    getChatHistory,
    generateRevisionNotes,
    generateMemoryTricks,
    getAIResources,
    deleteAIResource,
    generateVivaQuestion,
    evaluateVivaAnswer,
    saveVivaSession,
    getVivaSessions,
};

export default aiService;