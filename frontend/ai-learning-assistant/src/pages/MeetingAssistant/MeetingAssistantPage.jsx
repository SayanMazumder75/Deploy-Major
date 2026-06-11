import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Spinner from "../../components/common/Spinner";
import { Mic, Sparkles, Languages, BrainCircuit, FileText, ChevronDown, ChevronUp } from "lucide-react";

// ─── unchanged data ────────────────────────────────────────────────────────────
const featureItems = [
  "Live Translation",
  "Meeting Notes",
  "Transcript Export",
  "AI Learning Support",
];

const STEPS = [
  { step: "01", icon: "📺", title: "Open Lecture",      desc: "Open YouTube, Google Meet, Microsoft Teams, Zoom, or any online learning session.",  color: "#7c3aed", glow: "rgba(124,58,237,0.25)" },
  { step: "02", icon: "🎙️", title: "Start Assistant",   desc: "Click the Start button and allow microphone or system audio permissions.",           color: "#9333ea", glow: "rgba(147,51,234,0.25)" },
  { step: "03", icon: "🌍", title: "Live Translation",  desc: "Watch real-time transcription and translation appear automatically.",                 color: "#a855f7", glow: "rgba(168,85,247,0.25)" },
  { step: "04", icon: "📄", title: "Export Notes",      desc: "Download complete transcripts as PDF or Word documents.",                             color: "#c026d3", glow: "rgba(192,38,211,0.25)" },
];

const PLATFORMS = [
  { icon: "📺", title: "YouTube Classes", desc: "Capture lecture audio and generate study-ready notes automatically." },
  { icon: "🎥", title: "Google Meet",     desc: "Record discussions, meetings, and classroom conversations." },
  { icon: "📚", title: "Smart Learning",  desc: "Convert sessions into transcripts, summaries, and revision material." },
];

// ─── constants ────────────────────────────────────────────────────────────────
const LS_KEY = "meetmind_guide_closed";

// ⚠️ SET THIS to your exact Speech App domain (no trailing slash)
// Must match VITE_MEETMIND_ORIGIN in Speech App's .env
const SPEECH_APP_ORIGIN = import.meta.env.VITE_SPEECH_APP_ORIGIN || "https://speechtotext-sepia-nine.vercel.app";
const SPEECH_APP_URL = "https://speechtotext-sepia-nine.vercel.app/";

// ─── step card ─────────────────────────────────────────────────────────────────
const StepCard = ({ s }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: `0 20px 48px ${s.glow}` }}
    style={{
      position: "relative",
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(139,92,246,0.15)",
      borderRadius: 24, padding: "28px 24px 24px",
      display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "0 4px 24px rgba(139,92,246,0.08)",
      transition: "box-shadow 0.25s",
      overflow: "hidden",
    }}
  >
    <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />
    <div style={{ position: "absolute", top: 16, right: 18, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(139,92,246,0.35)", fontFamily: "'Sora', sans-serif" }}>{s.step}</div>
    <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${s.color}22, ${s.color}11)`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: `0 4px 14px ${s.glow}` }}>{s.icon}</div>
    <div>
      <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: "#3b0764", margin: "0 0 6px" }}>{s.title}</p>
      <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{s.desc}</p>
    </div>
  </motion.div>
);

// ─── platform card ─────────────────────────────────────────────────────────────
const PlatformCard = ({ p }) => (
  <motion.div
    whileHover={{ y: -3, background: "rgba(139,92,246,0.07)" }}
    style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(139,92,246,0.12)", borderRadius: 20,
      padding: "18px 20px", boxShadow: "0 2px 16px rgba(139,92,246,0.06)",
      transition: "background 0.2s, box-shadow 0.2s",
    }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,38,211,0.08))", border: "1px solid rgba(139,92,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{p.icon}</div>
    <div>
      <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13.5, color: "#4c1d95", margin: "0 0 4px" }}>{p.title}</p>
      <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{p.desc}</p>
    </div>
  </motion.div>
);

// ─── collapsible onboarding content ────────────────────────────────────────────
const OnboardingContent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 4 }}>
    {/* header */}
    <div style={{ textAlign: "center", padding: "0 8px" }}>
      <h2 style={{
        fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800,
        background: "linear-gradient(135deg,#4c1d95,#7c3aed,#c026d3)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        margin: "0 0 8px", lineHeight: 1.25,
      }}>How to Use MEETMIND AI Assistant</h2>
      <p style={{ fontSize: 14, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
        Follow these simple steps to start live transcription, translation, and smart note generation.
      </p>
    </div>

    {/* steps grid */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      {STEPS.map((s, i) => <StepCard key={i} s={s} />)}
    </div>

    {/* connector dots */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, opacity: 0.7, boxShadow: `0 0 8px ${s.glow}` }} />
          {i < STEPS.length - 1 && <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(90deg,rgba(124,58,237,0.3),rgba(192,38,211,0.3))" }} />}
        </React.Fragment>
      ))}
    </div>

    {/* platforms */}
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(124,58,237,0.6)", margin: "0 0 12px 2px", fontFamily: "'Sora', sans-serif" }}>Supported Platforms</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {PLATFORMS.map((p, i) => <PlatformCard key={i} p={p} />)}
      </div>
    </div>

    {/* pro tip */}
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(135deg,rgba(124,58,237,0.08),rgba(192,38,211,0.05))",
        border: "1px solid rgba(139,92,246,0.22)", borderRadius: 22, padding: "22px 24px",
        backdropFilter: "blur(12px)", boxShadow: "0 4px 28px rgba(124,58,237,0.08)",
      }}
    >
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(192,38,211,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, position: "relative", zIndex: 1 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(192,38,211,0.15))", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 14px rgba(124,58,237,0.2)" }}>💡</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14, color: "#4c1d95", margin: "0 0 10px" }}>Pro Tip — Best Workflow</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              "Open your YouTube lecture, Google Meet, Zoom meeting, or online class.",
              "Return to MEETMIND.",
              "Click Start in the assistant below.",
              "Watch live transcripts and translations appear automatically.",
              "Export PDF or Word notes after the session.",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: "linear-gradient(135deg,#7c3aed,#c026d3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "'Sora', sans-serif", marginTop: 1 }}>{i + 1}</div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </div>
);

// ─── page ──────────────────────────────────────────────────────────────────────
const MeetingAssistantPage = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef(null);

  // first visit → expanded; subsequent → collapsed (remembered via localStorage)
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return !localStorage.getItem(LS_KEY); }
    catch { return true; }
  });

  const toggleGuide = () => {
    const next = !guideOpen;
    setGuideOpen(next);
    try {
      if (!next) localStorage.setItem(LS_KEY, "1");
      else localStorage.removeItem(LS_KEY);
    } catch {}
  };

  /**
   * Send JWT to Speech App iframe via postMessage (SSO bridge).
   * Fires after iframe finishes loading.
   * Token is read from MeetMind's localStorage (set on login/register).
   * Targeted to exact SPEECH_APP_ORIGIN — never uses "*".
   */
  const handleIframeLoad = () => {
    setIframeLoaded(true);

    try {
      const token = localStorage.getItem("token"); // MeetMind JWT key
      if (token && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: "MEETMIND_AUTH", token },
          SPEECH_APP_ORIGIN // ← strict origin, NOT "*"
        );
        console.log("[MeetMind] JWT sent to Speech App iframe.");
      } else {
        console.warn("[MeetMind] No token found in localStorage — user may not be logged in.");
      }
    } catch (err) {
      console.error("[MeetMind] postMessage failed:", err);
    }
  };

  /**
   * Re-send token if iframe ref is available but iframe was already loaded
   * before ref was attached (edge case with hot reload / strict mode).
   */
  useEffect(() => {
    if (iframeLoaded && iframeRef.current?.contentWindow) {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          iframeRef.current.contentWindow.postMessage(
            { type: "MEETMIND_AUTH", token },
            SPEECH_APP_ORIGIN
          );
        }
      } catch {}
    }
  }, [iframeLoaded]);

  return (
    <div className="min-h-full w-full px-0 pb-2 md:pb-0">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-500 p-6 md:p-8 shadow-2xl shadow-purple-300/40">
        <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-pink-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur-xl">
                <Mic className="h-7 w-7" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                Native assistant
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              AI Meeting Assistant
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-purple-100 md:text-base">
              Real-time meeting transcription, translation and learning assistant
            </p>

            {/* ── TOGGLE BUTTON — inside hero ── */}
            <motion.button
              onClick={toggleGuide}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                marginTop: 20,
                display: "inline-flex", alignItems: "center", gap: 8,
                background: guideOpen
                  ? "rgba(255,255,255,0.22)"
                  : "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(12px)",
                borderRadius: 100,
                padding: "10px 20px",
                cursor: "pointer",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                transition: "background 0.2s",
              }}
            >
              <span>🚀</span>
              <span>Quick Start Guide</span>
              <motion.span
                animate={{ rotate: guideOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ display: "flex" }}
              >
                <ChevronDown size={16} />
              </motion.span>
            </motion.button>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl sm:grid-cols-2 xl:min-w-105">
            {featureItems.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Languages className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COLLAPSIBLE ONBOARDING ── */}
      <AnimatePresence initial={false}>
        {guideOpen && (
          <motion.div
            key="guide"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ paddingTop: 24, paddingBottom: 4 }}>
              <OnboardingContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── IFRAME ── */}
      <div className="mt-6 rounded-[28px] border border-purple-100 bg-white/70 p-3 shadow-2xl shadow-purple-100/60 backdrop-blur-xl md:p-4">
        <div className="relative overflow-hidden rounded-[20px] bg-slate-100">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/95 px-6 text-center backdrop-blur-sm">
              <Spinner />
              <p className="text-sm font-medium text-violet-700">
                Loading AI Meeting Assistant...
              </p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            title="AI Meeting Assistant"
            src={SPEECH_APP_URL}
            className="h-[calc(100vh-14rem)] min-h-160 w-full rounded-[20px] border-0 bg-white md:h-[calc(100vh-12rem)]"
            onLoad={handleIframeLoad}
            loading="eager"
            allow="microphone; clipboard-read; clipboard-write; display-capture"
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
      `}</style>
    </div>
  );
};

export default MeetingAssistantPage;
