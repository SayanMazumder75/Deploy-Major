// ─────────────────────────────────────────────────────────────────────────────
// aiIntelligenceService
//
// Thin wrapper around the /api/ai-intelligence endpoints. Mirrors the shape
// used by the other service files in this folder (each function unwraps
// `response.data` so callers always get either a plain payload or a thrown
// error object).
// ─────────────────────────────────────────────────────────────────────────────

import axiosInstance from '../utils/axiosInstance';
import { API_PATHS, BASE_URL } from '../utils/apiPaths';

// ── generation ───────────────────────────────────────────────────────────────

/**
 * Generate a new AI summary. Supports two flavours of `source`:
 *   { documentId }         → use an existing Document the user already uploaded.
 *   { file: File, title }  → upload a new PDF as part of this request.
 *
 * V2 contract: this returns IMMEDIATELY with `{ summaryId, status:
 * 'processing', stagePlan }`. The pipeline runs in the background; subscribe
 * to `streamProgress(summaryId, onEvent)` to receive live stage events.
 * When the pipeline finishes, call `getById(summaryId)` for the full doc.
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
                // Async path returns ~immediately, but multipart uploads of
                // 100 MB PDFs over slow links can still take a while —
                // generous timeout for the upload phase.
                timeout: 600000,
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
                    timeout: 30000,
                    ...axiosOptions,
                }
            );
        }
        return response.data;
    } catch (error) {
        throw error.response?.data || { message: 'Failed to generate summary' };
    }
};

/**
 * Subscribe to a generation's progress events via Server-Sent Events.
 *
 * Implementation note: the native `EventSource` API can't send custom
 * headers, but our API uses Bearer-token auth. We use `fetch` + a
 * `ReadableStream` reader instead, which gives us full header control
 * and otherwise behaves identically to EventSource (we even parse the
 * `data:` line prefix manually).
 *
 * @param {string} summaryId
 * @param {(event: object) => void} onEvent
 *        Called for every parsed event. Event shapes mirror the backend's
 *        pipelineRegistry payloads: pipeline:start / stage:start /
 *        stage:progress / stage:complete / stage:failed / stage:skipped /
 *        insights / pipeline:complete / pipeline:failed / plan.
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} unsubscribe / close function
 */
const streamProgress = (summaryId, onEvent, onError) => {
    const url = `${BASE_URL}${API_PATHS.AI_INTELLIGENCE.PROGRESS(summaryId)}`;
    const token =
        typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

    const controller = new AbortController();
    let closed = false;

    const run = async () => {
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'text/event-stream',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controller.signal,
            });
            if (!res.ok || !res.body) {
                throw new Error(`SSE handshake failed: ${res.status}`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            // The SSE wire format is: `data: <json>\n\n` per event, with
            // `: heartbeat` comment lines we ignore. We accumulate the
            // raw stream into `buffer`, then split on double newlines
            // (end-of-event markers) to extract each event.
            while (!closed) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let idx;
                while ((idx = buffer.indexOf('\n\n')) !== -1) {
                    const rawEvent = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);

                    // Strip any non-data lines (`:` heartbeats, event:, id:, retry:).
                    const dataLines = rawEvent
                        .split('\n')
                        .filter((l) => l.startsWith('data:'))
                        .map((l) => l.slice(5).trimStart());
                    if (!dataLines.length) continue;
                    const payloadStr = dataLines.join('\n');
                    try {
                        const event = JSON.parse(payloadStr);
                        onEvent(event);
                    } catch (parseErr) {
                        // Bad JSON in a single event — log and keep reading.
                        // SSE doesn't bring the stream down on a single
                        // bad event, so neither do we.
                        console.warn('SSE parse error:', parseErr, payloadStr);
                    }
                }
            }
        } catch (err) {
            if (closed) return; // user-initiated close, not an error
            if (err.name === 'AbortError') return;
            if (typeof onError === 'function') onError(err);
            else console.error('SSE error:', err);
        }
    };

    run();

    return () => {
        if (closed) return;
        closed = true;
        try {
            controller.abort();
        } catch {
            /* already closed */
        }
    };
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
    streamProgress,
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
