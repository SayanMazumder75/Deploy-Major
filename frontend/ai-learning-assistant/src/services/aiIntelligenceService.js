// ─────────────────────────────────────────────────────────────────────────────
// aiIntelligenceService
//
// Thin wrapper around the /api/ai-intelligence endpoints. Mirrors the shape
// used by the other service files in this folder (each function unwraps
// `response.data` so callers always get either a plain payload or a thrown
// error object).
// ─────────────────────────────────────────────────────────────────────────────

import axiosInstance from '../utils/axiosInstance';
import { API_PATHS } from '../utils/apiPaths';

// ── generation ───────────────────────────────────────────────────────────────

/**
 * Generate a new AI summary. Supports two flavours of `source`:
 *   { documentId }         → use an existing Document the user already uploaded.
 *   { file: File, title }  → upload a new PDF as part of this request.
 *
 * Settings is the structured settings object the SummarySettings panel emits.
 */
const generate = async ({ source, settings }, axiosOptions = {}) => {
    try {
        let response;
        if (source.file) {
            // multipart path — we package `settings` as a JSON string because
            // multipart fields are strings; the backend re-parses it.
            const formData = new FormData();
            formData.append('file', source.file);
            formData.append('settings', JSON.stringify(settings || {}));
            if (source.title) formData.append('title', source.title);

            response = await axiosInstance.post(API_PATHS.AI_INTELLIGENCE.GENERATE, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                // Generation can be slow (multiple Groq calls). Keep the
                // timeout permissive but not unbounded — the frontend
                // processing screen masks the latency.
                timeout: 180000,
                ...axiosOptions,
            });
        } else {
            response = await axiosInstance.post(
                API_PATHS.AI_INTELLIGENCE.GENERATE,
                {
                    documentId: source.documentId,
                    settings,
                    title: source.title,
                },
                {
                    timeout: 180000,
                    ...axiosOptions,
                }
            );
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to generate summary' };
    }
};

// ── viewer / history ─────────────────────────────────────────────────────────

const getById = async (id) => {
    try {
        const response = await axiosInstance.get(API_PATHS.AI_INTELLIGENCE.GET_BY_ID(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch summary' };
    }
};

const listHistory = async () => {
    try {
        const response = await axiosInstance.get(API_PATHS.AI_INTELLIGENCE.HISTORY);
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to fetch history' };
    }
};

const remove = async (id) => {
    try {
        const response = await axiosInstance.delete(API_PATHS.AI_INTELLIGENCE.DELETE(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to delete summary' };
    }
};

// ── viewer-side actions ──────────────────────────────────────────────────────

const regenerate = async (id, settings) => {
    try {
        const response = await axiosInstance.post(
            API_PATHS.AI_INTELLIGENCE.REGENERATE(id),
            settings ? { settings } : {},
            { timeout: 180000 }
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to regenerate summary' };
    }
};

const downloadPdf = async (id) => {
    try {
        const response = await axiosInstance.get(API_PATHS.AI_INTELLIGENCE.DOWNLOAD(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to prepare PDF' };
    }
};

const saveToDocuments = async (id) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI_INTELLIGENCE.SAVE_TO_DOCUMENTS(id));
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to save to Documents' };
    }
};

const askAI = async (id, question) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI_INTELLIGENCE.ASK(id), { question });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to get AI answer' };
    }
};

const translate = async (id, targetLanguage) => {
    try {
        const response = await axiosInstance.post(API_PATHS.AI_INTELLIGENCE.TRANSLATE(id), {
            targetLanguage,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to translate summary' };
    }
};

const aiIntelligenceService = {
    generate,
    getById,
    listHistory,
    remove,
    regenerate,
    downloadPdf,
    saveToDocuments,
    askAI,
    translate,
};

export default aiIntelligenceService;
