import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Send, BrainCircuit, Minimize2, RotateCcw,
    ChevronDown, Sparkles, Loader2,
} from "lucide-react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Your Express backend proxies /api/ai/support-chat → Anthropic server-side.
// This avoids CORS. See backend snippet at bottom of this file.
const SUPPORT_CHAT_URL =
    (process.env.REACT_APP_API_URL || "http://localhost:8000") +
    "/api/ai/support-chat";

// ─── SYSTEM PROMPT — full MEETMIND workflow ───────────────────────────────────
const SYSTEM_PROMPT = `You are MeetMind AI Assistant — a friendly, concise support bot embedded in the MEETMIND AI Learning Platform. You have deep knowledge of every feature and workflow in the app.

ABOUT MEETMIND
MEETMIND is an AI-powered learning platform that helps students study smarter using document AI, flashcards, quizzes, viva prep, and smart scheduling.
- Frontend: React
- Backend: Node.js (Express) with AI endpoints powered by Gemini
- Auth: JWT token stored in localStorage

PAGES & ROUTES
Public pages (no login needed):
- / — Landing page
- /login — Login
- /register — Register

Protected pages (login required):
- /dashboard — Progress overview
- /documents — Upload & manage PDFs
- /documents/:id — Document detail hub (Chat, AI Actions, Flashcards, Quizzes, Voice Tutor)
- /documents/:id/flashcards — Per-document flashcards
- /flashcards — All flashcards across documents
- /quizzes/:quizId — Take a quiz
- /quizzes/:quizId/results — View quiz results
- /meeting-assistant — AI Meeting Assistant (live transcription via iframe: https://speechtotext-sepia-nine.vercel.app/)
- /profile — User profile & password change
- /study-vault — Library of all AI-generated resources
- /calendar — Study Calendar & planner

FEATURE 1 — DASHBOARD (/dashboard)
Shows a progress overview:
- Total documents, flashcards, quizzes uploaded/created
- Reviewed and starred counts
- Average quiz score
- Study streak
- Recent activity (recent documents and quizzes)
Backend: GET /api/progress/dashboard

FEATURE 2 — DOCUMENTS (/documents)
How to upload a document:
1. Go to /documents
2. Click "Upload Document"
3. Enter a title and select a PDF file
4. The app uploads it via multipart/form-data and stores it on the backend
5. The document list refreshes automatically
Backend: POST /api/documents/upload

How to delete a document:
1. Open the delete confirmation modal on any document
2. Confirm deletion — the document is removed and a success toast appears
Backend: DELETE /api/documents/:id

FEATURE 3 — DOCUMENT DETAIL HUB (/documents/:id)
Opening any document opens a hub with 6 tabs:
1. Content — embedded PDF viewer
2. Chat — ask questions about the document (AI answers using document chunks)
3. AI Actions — generate summaries, explanations, viva questions, revision notes, memory tricks
4. Flashcards — view and study flashcards for this document
5. Quizzes — generate and take quizzes on this document
6. Voice Tutor — voice-based tutoring interface

FEATURE 4 — AI ACTIONS (Document Detail → "AI Actions" tab)
A) Generate Summary — Click "Summarize" → POST /api/ai/generate-summary → saved to Study Vault as type "summary"
B) Explain a Concept — Type concept → Click "Explain" → POST /api/ai/explain-concept (uses chunk relevance)
C) Generate Viva Questions — Click "Generate Viva Questions" → POST /api/ai/generate-viva → saved as type "viva"
D) Generate Revision Notes — Click "Generate" under Revision Notes → POST /api/ai/generate-revision-notes → saved as type "revision"
E) Generate Memory Tricks — Click "Generate" under Memory Tricks → POST /api/ai/generate-memory-tricks → saved as type "memory"

FEATURE 5 — DOCUMENT CHAT (Document Detail → "Chat" tab)
How it works:
1. User types a question about the document
2. Backend finds the most relevant chunks (findRelevantChunks)
3. Gemini generates a grounded answer using those chunks
4. Conversation is saved to chat history for that document
Backend: POST /api/ai/chat | GET /api/ai/chat-history/:documentId
Each document has its own separate chat history with context maintained across turns.

FEATURE 6 — FLASHCARDS (/flashcards and inside Document Detail)
How to generate flashcards:
1. Open a document → go to "Flashcards" tab
2. Click generate — AI creates a deck of question/answer cards from the document
3. Each card has: question, answer, difficulty level, review count, starred status
Backend: POST /api/ai/generate-flashcards
Global flashcard view: Go to /flashcards to see all cards across every document.

FEATURE 7 — QUIZZES (Document Detail → "Quizzes" tab)
How to take a quiz:
1. Open a document → go to "Quizzes" tab
2. Click to generate/start a quiz (POST /api/ai/generate-quiz)
3. Answer questions one by one
4. Submit to see your score
5. Results are visible at /quizzes/:quizId/results
Quiz data includes: questions, user answers, score.

FEATURE 8 — VIVA / ORAL EXAM SESSIONS
A simulated oral exam. The AI asks questions, evaluates your spoken/typed answers, and gives feedback.
How it works:
1. AI generates a viva question (POST /api/ai/viva-question)
2. User answers (typed or spoken)
3. AI evaluates the answer — good, partial, or poor (POST /api/ai/viva-evaluate)
4. Session is saved with: score, duration, exchange history, weak topics (POST /api/ai/viva-save)
5. Past viva sessions can be reviewed (GET /api/ai/viva-sessions)
Weak topics: automatically identified from poor or partial answers.

FEATURE 9 — STUDY VAULT (/study-vault)
A personal library of everything the AI has generated across all documents.
Stores: Summaries (type: summary), Revision Notes (type: revision), Viva Questions (type: viva), Memory Tricks (type: memory)
How to use:
1. Go to /study-vault
2. Browse all AI-generated resources
3. Delete any resource you no longer need
Backend: GET /api/ai/resources | DELETE /api/ai/resource/:resourceId
Resources are created automatically when you use AI Actions inside any document.

FEATURE 10 — MEETING ASSISTANT (/meeting-assistant)
Provides live speech-to-text transcription and translation via embedded iframe (https://speechtotext-sepia-nine.vercel.app/).
How to use:
1. Go to /meeting-assistant
2. Wait for the app to load (loading overlay shown while iframe loads)
3. Use live transcription and translation directly in the interface

FEATURE 11 — PROFILE (/profile)
What you can do:
- View your profile information
- Change your password
How to change password:
1. Go to /profile
2. Fill in current password and new password
3. Submit — changes are saved to your account
Backend: authService.getProfile() and authService.changePassword()

FEATURE 12 — STUDY CALENDAR (/calendar)
What you can do:
- View your study plan in month view, week view, or analytics view
- Add study sessions (topic + duration)
- Mark sessions as complete
- Delete sessions
- Add upcoming exams
- Use AI to auto-generate a recommended study schedule
How to add a session:
1. Go to /calendar
2. Click on any date
3. Enter topic and duration → Save
Analytics view: Shows study patterns, session completion rate, and trends over time.
Backend: calendarRoutes.js via API_PATHS.CALENDAR.*

AUTH & ACCOUNT
- Login at /login, Register at /register
- Sessions are maintained via JWT token in localStorage
- Logout clears the token and redirects to /
- All protected pages redirect to /login if not authenticated

CROSS-FEATURE FLOW: Documents → AI Actions → Study Vault
Open /documents/:id → AI Actions tab → Generate Summary/Viva/Revision/Memory → auto-saved to Study Vault → browse at /study-vault

DOCUMENT CHAT FLOW
User question → POST /api/ai/chat → findRelevantChunks() builds context → Gemini answer → persisted in ChatHistory (userId, documentId) → shown in ChatInterface

ALL IMPLEMENTED BACKEND AI ENDPOINTS (all protected by JWT):
POST /api/ai/generate-flashcards
POST /api/ai/generate-quiz
POST /api/ai/generate-summary
POST /api/ai/chat
GET /api/ai/chat-history/:documentId
POST /api/ai/explain-concept
POST /api/ai/generate-viva
POST /api/ai/generate-revision-notes
POST /api/ai/generate-memory-tricks
GET /api/ai/resources
DELETE /api/ai/resource/:resourceId
POST /api/ai/viva-question
POST /api/ai/viva-evaluate
POST /api/ai/viva-save
GET /api/ai/viva-sessions

CONTACT & SUPPORT
- General support: support@meetmind.ai
- Billing: billing@meetmind.ai
- Response time: within 24 hours on weekdays

TONE & RESPONSE RULES
- Be warm, helpful, and concise
- Use numbered steps for how-tos, bullet points for lists
- 2-5 sentences for simple questions; step-by-step for workflows
- Never invent features that don't exist in this document
- If unsure, say: "I'm not sure about that — please email support@meetmind.ai"
- Always end with a follow-up like "Anything else I can help with?"
`;

// ─── quick suggestion chips ────────────────────────────────────────────────────
const SUGGESTIONS = [
    "How do I upload a PDF?",
    "How do I generate flashcards?",
    "What is the Study Vault?",
    "How does document chat work?",
    "How do I take a quiz?",
    "What is a Viva session?",
    "How do I add a study session?",
    "How does Meeting Assistant work?",
    "How do I generate revision notes?",
    "How do I change my password?",
];

const spring = { type: "spring", stiffness: 360, damping: 32 };

// ─── API call — goes through YOUR backend (no CORS) ───────────────────────────
const callSupportChat = async (messages, token) => {
    const res = await fetch(SUPPORT_CHAT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // backend returns { reply: "..." }
    return data.reply || data.content || "Sorry, no response received.";
};

// ─── message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
    const isUser = msg.role === "user";
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 10,
            }}
        >
            {!isUser && (
                <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))",
                    border: "1px solid rgba(168,85,247,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginRight: 8, marginTop: 2, alignSelf: "flex-start",
                }}>
                    <BrainCircuit size={13} color="#e879f9" />
                </div>
            )}
            <div style={{
                maxWidth: "78%",
                padding: "10px 13px",
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: isUser
                    ? "linear-gradient(135deg,rgba(168,85,247,0.55),rgba(236,72,153,0.4))"
                    : "rgba(255,255,255,0.06)",
                border: isUser
                    ? "1px solid rgba(168,85,247,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                boxShadow: isUser ? "0 4px 16px rgba(168,85,247,0.2)" : "none",
            }}>
                <p style={{
                    margin: 0, fontSize: 13, lineHeight: 1.6,
                    color: isUser ? "#fff" : "rgba(255,255,255,0.85)",
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>{msg.content}</p>
            </div>
        </motion.div>
    );
};

// ─── typing dots ───────────────────────────────────────────────────────────────
const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
    >
        <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))",
            border: "1px solid rgba(168,85,247,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <BrainCircuit size={13} color="#e879f9" />
        </div>
        <div style={{
            padding: "10px 14px",
            borderRadius: "16px 16px 16px 4px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", gap: 4,
        }}>
            {[0, 1, 2].map(i => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(192,132,252,0.7)" }}
                />
            ))}
        </div>
    </motion.div>
);

// ─── main widget ───────────────────────────────────────────────────────────────
const AISupportWidget = () => {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput]       = useState("");
    const [loading, setLoading]   = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [pulsing, setPulsing]   = useState(true);
    const [error, setError]       = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef       = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300);
    }, [open]);

    const handleOpen = () => { setOpen(true); setPulsing(false); };

    const sendMessage = useCallback(async (text) => {
        const userText = (text || input).trim();
        if (!userText || loading) return;

        setInput("");
        setShowSuggestions(false);
        setError(null);

        const userMsg = { role: "user", content: userText };
        const next = [...messages, userMsg];
        setMessages(next);
        setLoading(true);

        try {
            // get JWT from localStorage (same key your AuthContext uses)
            const token = localStorage.getItem("token");
            const apiMessages = next.map(m => ({ role: m.role, content: m.content }));
            const reply = await callSupportChat(apiMessages, token);
            setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        } catch (err) {
            console.error("Support chat error:", err);
            setError("Connection failed. Please try again.");
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I'm having trouble connecting right now. Please try again or email support@meetmind.ai 🙏",
            }]);
        } finally {
            setLoading(false);
        }
    }, [input, messages, loading]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const reset = () => {
        setMessages([]);
        setInput("");
        setShowSuggestions(true);
        setLoading(false);
        setError(null);
    };

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.94 }}
                        transition={spring}
                        style={{
                            position: "fixed",
                            bottom: 88, right: 24,
                            width: 360, height: 520,
                            zIndex: 999,
                            display: "flex", flexDirection: "column",
                            background: "rgba(10,3,30,0.97)",
                            backdropFilter: "blur(32px)",
                            WebkitBackdropFilter: "blur(32px)",
                            border: "1px solid rgba(168,85,247,0.25)",
                            borderRadius: 22,
                            boxShadow: "0 0 0 1px rgba(168,85,247,0.1), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(168,85,247,0.08)",
                            overflow: "hidden",
                        }}
                    >
                        {/* prismatic top line */}
                        <div style={{
                            height: 1, flexShrink: 0,
                            background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.9),rgba(236,72,153,0.6),rgba(99,102,241,0.5),transparent)",
                        }} />

                        {/* header */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "13px 16px 12px",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            flexShrink: 0,
                        }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))",
                                border: "1px solid rgba(168,85,247,0.45)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 0 18px rgba(168,85,247,0.3)",
                            }}>
                                <BrainCircuit size={17} color="#e879f9" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    margin: 0, fontSize: 13.5, fontWeight: 700, color: "#fff",
                                    fontFamily: "'DM Sans', sans-serif",
                                }}>MeetMind Assistant</p>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: "50%",
                                        background: "#34d399", boxShadow: "0 0 6px #34d399",
                                    }} />
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "'DM Sans', sans-serif" }}>
                                        Online · Typically replies instantly
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                                {messages.length > 0 && (
                                    <motion.button
                                        whileHover={{ background: "rgba(255,255,255,0.08)" }}
                                        whileTap={{ scale: 0.93 }}
                                        onClick={reset}
                                        title="New conversation"
                                        style={{
                                            width: 30, height: 30, borderRadius: 8,
                                            background: "rgba(255,255,255,0.05)",
                                            border: "1px solid rgba(255,255,255,0.08)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: "pointer", color: "rgba(255,255,255,0.4)",
                                        }}
                                    >
                                        <RotateCcw size={13} />
                                    </motion.button>
                                )}
                                <motion.button
                                    whileHover={{ background: "rgba(255,255,255,0.08)" }}
                                    whileTap={{ scale: 0.93 }}
                                    onClick={() => setOpen(false)}
                                    style={{
                                        width: 30, height: 30, borderRadius: 8,
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", color: "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    <ChevronDown size={15} />
                                </motion.button>
                            </div>
                        </div>

                        {/* messages */}
                        <div style={{
                            flex: 1, overflowY: "auto", padding: "14px 14px 4px",
                            scrollbarWidth: "thin",
                            scrollbarColor: "rgba(168,85,247,0.2) transparent",
                        }}>
                            {messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    style={{ textAlign: "center", padding: "16px 8px 20px" }}
                                >
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                                        background: "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.2))",
                                        border: "1px solid rgba(168,85,247,0.4)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        boxShadow: "0 0 28px rgba(168,85,247,0.25)",
                                    }}>
                                        <Sparkles size={22} color="#e879f9" />
                                    </div>
                                    <p style={{
                                        fontSize: 14, fontWeight: 700, color: "#fff",
                                        margin: "0 0 6px", fontFamily: "'DM Sans', sans-serif",
                                    }}>Hi there! 👋</p>
                                    <p style={{
                                        fontSize: 12.5, color: "rgba(255,255,255,0.45)",
                                        margin: 0, lineHeight: 1.6,
                                        fontFamily: "'DM Sans', sans-serif",
                                    }}>
                                        I'm your MEETMIND assistant. Ask me anything about features, how-tos, or get support.
                                    </p>
                                </motion.div>
                            )}

                            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

                            <AnimatePresence>
                                {loading && <TypingIndicator />}
                            </AnimatePresence>

                            <div ref={messagesEndRef} />
                        </div>

                        {/* suggestion chips */}
                        <AnimatePresence>
                            {showSuggestions && messages.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{ padding: "0 12px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}
                                >
                                    {SUGGESTIONS.map((s, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.04 }}
                                            whileHover={{ borderColor: "rgba(168,85,247,0.5)", background: "rgba(168,85,247,0.1)" }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => sendMessage(s)}
                                            style={{
                                                background: "rgba(255,255,255,0.04)",
                                                border: "1px solid rgba(255,255,255,0.09)",
                                                borderRadius: 20, padding: "5px 11px",
                                                color: "rgba(255,255,255,0.6)",
                                                fontSize: 11.5, cursor: "pointer",
                                                fontFamily: "'DM Sans', sans-serif",
                                                transition: "all 0.15s", textAlign: "left",
                                            }}
                                        >{s}</motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* input */}
                        <div style={{
                            padding: "10px 12px 14px",
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                            flexShrink: 0,
                        }}>
                            <div style={{
                                display: "flex", alignItems: "flex-end", gap: 8,
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.09)",
                                borderRadius: 14, padding: "8px 8px 8px 14px",
                            }}>
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask anything about MEETMIND…"
                                    rows={1}
                                    style={{
                                        flex: 1, background: "transparent", border: "none",
                                        outline: "none", resize: "none",
                                        color: "#f3e8ff", fontSize: 13,
                                        fontFamily: "'DM Sans', sans-serif",
                                        lineHeight: 1.5, maxHeight: 80,
                                        caretColor: "#c084fc",
                                        scrollbarWidth: "none",
                                        paddingTop: 1,
                                    }}
                                    onInput={e => {
                                        e.target.style.height = "auto";
                                        e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                                    }}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.06 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || loading}
                                    style={{
                                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                                        background: input.trim() && !loading
                                            ? "linear-gradient(135deg,#a855f7,#ec4899)"
                                            : "rgba(255,255,255,0.07)",
                                        border: "none",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: input.trim() && !loading ? "pointer" : "default",
                                        boxShadow: input.trim() && !loading ? "0 4px 14px rgba(168,85,247,0.4)" : "none",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    {loading
                                        ? <Loader2 size={14} color="rgba(255,255,255,0.4)" style={{ animation: "spin 1s linear infinite" }} />
                                        : <Send size={14} color={input.trim() ? "#fff" : "rgba(255,255,255,0.25)"} />
                                    }
                                </motion.button>
                            </div>
                            <p style={{
                                margin: "7px 2px 0", fontSize: 10.5,
                                color: "rgba(255,255,255,0.2)",
                                fontFamily: "'DM Sans', sans-serif",
                                textAlign: "center",
                            }}>
                                Powered by Claude AI · Press Enter to send
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                onClick={open ? () => setOpen(false) : handleOpen}
                style={{
                    position: "fixed", bottom: 24, right: 24,
                    width: 56, height: 56, borderRadius: 18,
                    background: open
                        ? "rgba(30,10,60,0.95)"
                        : "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)",
                    border: open ? "1px solid rgba(168,85,247,0.4)" : "none",
                    boxShadow: open
                        ? "0 8px 28px rgba(0,0,0,0.4)"
                        : "0 8px 28px rgba(168,85,247,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", zIndex: 1000,
                    transition: "background 0.25s, box-shadow 0.25s",
                }}
            >
                {pulsing && !open && (
                    <>
                        <motion.div
                            animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                            style={{ position: "absolute", inset: 0, borderRadius: 18, background: "rgba(168,85,247,0.5)", pointerEvents: "none" }}
                        />
                        <motion.div
                            animate={{ scale: [1, 1.35], opacity: [0.3, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
                            style={{ position: "absolute", inset: 0, borderRadius: 18, background: "rgba(236,72,153,0.4)", pointerEvents: "none" }}
                        />
                    </>
                )}
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                            <X size={22} color="rgba(255,255,255,0.7)" />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                            <BrainCircuit size={24} color="#fff" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
    );
};

export default AISupportWidget;

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADD THIS ROUTE TO YOUR EXPRESS BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: backend/routes/aiRoutes.js  (add alongside existing routes)

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai/support-chat
router.post('/support-chat', protect, async (req, res) => {
    try {
        const { messages, system } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages array required' });
        }

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: system || '',
            messages: messages,
        });

        const reply = response.content?.[0]?.text || 'Sorry, no response.';
        res.json({ reply });

    } catch (err) {
        console.error('Support chat error:', err);
        res.status(500).json({ error: 'AI service error', details: err.message });
    }
});

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Add to your .env:
ANTHROPIC_API_KEY=sk-ant-...

Install if not already:
npm install @anthropic-ai/sdk
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/