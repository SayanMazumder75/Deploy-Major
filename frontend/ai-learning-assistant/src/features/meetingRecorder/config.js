// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — runtime configuration
// ─────────────────────────────────────────────────────────────────────────────
// The Meeting Recorder is integrated by embedding the existing standalone
// deployment in an iframe — the same approach used by the AI Meeting
// Assistant page. The full recorder app (recording controls, live
// transcript, AI summary, key points, action items, EN/HI/BN summary
// generation) is hosted at the URL below and runs unchanged.
//
// Override in `.env` / Vercel project settings with VITE_MEETING_RECORDER_URL.
// ─────────────────────────────────────────────────────────────────────────────

export const MEETING_RECORDER_URL =
    import.meta.env.VITE_MEETING_RECORDER_URL ||
    "https://deploy-whisper.vercel.app/";

// Base path the Meeting Recorder is mounted at inside the main app.
export const MEETING_RECORDER_ROUTE = "/meeting-recorder";
