// In production, set VITE_API_BASE_URL in the Vercel dashboard (e.g. https://your-backend.onrender.com).
// For local dev, copy `.env.example` to `.env` (defaults to http://localhost:8000).
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const API_PATHS = {
    AUTH: {
        REGISTER: "/api/auth/register",
        LOGIN: "/api/auth/login",
        GET_PROFILE: "/api/auth/profile",
        UPDATE_PROFILE: "/api/auth/profile",
        CHANGE_PASSWORD: "/api/auth/change-password",
        UPDATE_EMAIL: "/api/auth/profile",
        UPLOAD_AVATAR: "/api/auth/profile",
        SEND_EMAIL_OTP: "/api/auth/send-email-otp",
        VERIFY_EMAIL_OTP: "/api/auth/verify-email-otp",
        SEND_PASSWORD_OTP: '/api/auth/send-password-otp',
        VERIFY_PASSWORD_OTP: '/api/auth/verify-password-otp',
         FORGOT_PASSWORD: "/api/auth/forgot-password",
         RESET_PASSWORD: "/api/auth/reset-password",
    },

    DOCUMENTS: {
        UPLOAD: "/api/documents/upload",
        GET_DOCUMENTS: "/api/documents",
        GET_DOCUMENT_BY_ID: (id) => `/api/documents/${id}`,
        UPDATE_DOCUMENT: (id) => `/api/documents/${id}`,
        DELETE_DOCUMENT: (id) => `/api/documents/${id}`,
    },

    AI: {
        GENERATE_FLASHCARDS: "/api/ai/generate-flashcards",
        GENERATE_QUIZ: "/api/ai/generate-quiz",
        GENERATE_SUMMARY: "/api/ai/generate-summary",
        GENERATE_VIVA: "/api/ai/generate-viva", //heheheh
        GENERATE_REVISION_NOTES: '/api/ai/generate-revision-notes',
        GENERATE_MEMORY_TRICKS: '/api/ai/generate-memory-tricks',
        GET_RESOURCES: '/api/ai/resources',
        CHAT: "/api/ai/chat",
        EXPLAIN_CONCEPT: "/api/ai/explain-concept",

        VIVA_QUESTION: '/api/ai/viva-question',
        VIVA_EVALUATE: '/api/ai/viva-evaluate',
        VIVA_SAVE: '/api/ai/viva-save',
        VIVA_SESSIONS: '/api/ai/viva-sessions',
        GET_CHAT_HISTORY: (documentId) => `/api/ai/chat-history/${documentId}`,
    },

    FLASHCARDS: {
        GET_ALL_FLASHCARD_SETS: "/api/flashcards",
        GET_FLASHCARDS_FOR_DOC: (documentId) => `/api/flashcards/${documentId}`,
        REVIEW_FLASHCARD: (cardId) => `/api/flashcards/${cardId}/review`,
        TOGGLE_STAR: (cardId) => `/api/flashcards/${cardId}/star`,
        DELETE_FLASHCARD_SET: (id) => `/api/flashcards/${id}`,
    },

    QUIZZES: {
        GET_QUIZZES_FOR_DOC: (documentId) => `/api/quizzes/${documentId}`,
        GET_QUIZ_BY_ID: (id) => `/api/quizzes/quiz/${id}`,
        SUBMIT_QUIZ: (id) => `/api/quizzes/${id}/submit`,
        GET_QUIZ_RESULTS: (id) => `/api/quizzes/${id}/results`,
        DELETE_QUIZ: (id) => `/api/quizzes/${id}`,
    },

    PROGRESS: {
        GET_DASHBOARD: "/api/progress/dashboard",
    },

    CALENDAR: {
    GET_SESSIONS: '/api/calendar/sessions',
    CREATE_SESSION: '/api/calendar/sessions',
    UPDATE_SESSION: (id) => `/api/calendar/sessions/${id}`,
    DELETE_SESSION: (id) => `/api/calendar/sessions/${id}`,
    COMPLETE_SESSION: (id) => `/api/calendar/sessions/${id}/complete`,
    RESCHEDULE_SESSION: (id) => `/api/calendar/sessions/${id}/reschedule`,

    GET_EXAMS: '/api/calendar/exams',
    CREATE_EXAM: '/api/calendar/exams',
    UPDATE_EXAM: (id) => `/api/calendar/exams/${id}`,
    DELETE_EXAM: (id) => `/api/calendar/exams/${id}`,

    DETECT_EXAMS: '/api/calendar/detect-exams',
    GENERATE_SCHEDULE: '/api/calendar/generate-schedule',
    AUTO_RESCHEDULE: '/api/calendar/auto-reschedule',
    GET_ANALYTICS: '/api/calendar/analytics',
},

    // AI Document Intelligence — preview-before-save summary pipeline. All
    // endpoints are mounted on the backend under /api/ai-intelligence and
    // require JWT auth (handled transparently by axiosInstance).
    AI_INTELLIGENCE: {
        GENERATE: '/api/ai-intelligence/generate',
        HISTORY: '/api/ai-intelligence/history',
        GET_BY_ID: (id) => `/api/ai-intelligence/${id}`,
        DELETE: (id) => `/api/ai-intelligence/${id}`,
        REGENERATE: (id) => `/api/ai-intelligence/${id}/regenerate`,
        DOWNLOAD: (id) => `/api/ai-intelligence/${id}/download`,
        SAVE_TO_DOCUMENTS: (id) => `/api/ai-intelligence/${id}/save-to-documents`,
        ASK: (id) => `/api/ai-intelligence/${id}/ask`,
        TRANSLATE: (id) => `/api/ai-intelligence/${id}/translate`,
    },

};