// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — runtime configuration
// ─────────────────────────────────────────────────────────────────────────────
// The recorder talks to a Node/Express + Socket.io backend that proxies audio
// chunks to a Whisper ASR service and uses Groq to generate summaries. The
// backend lives in the standalone "Deploy-Whisper" project and is reused here
// untouched — only the URL is configurable.
//
// Set VITE_MEETING_RECORDER_API_URL in your `.env` (or Vercel project env) to
// point at the deployed API. Trailing slashes are stripped so callers can
// safely template `${API_URL}/api/...`.
// ─────────────────────────────────────────────────────────────────────────────

const RAW_API_URL =
    import.meta.env.VITE_MEETING_RECORDER_API_URL || "http://localhost:5000";

export const API_URL = RAW_API_URL.replace(/\/+$/, "");

// Socket.io connects to the same origin as the REST API.
export const SOCKET_URL = API_URL;

// Base path the Meeting Recorder is mounted at inside the main app.
// Used when linking from list items to individual recordings.
export const MEETING_RECORDER_BASE = "/meeting-recorder";
