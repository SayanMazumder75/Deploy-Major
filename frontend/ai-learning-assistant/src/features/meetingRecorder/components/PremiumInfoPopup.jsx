import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Mic, Crown, ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — Premium info popup
// A purely informational modal shown the first time a user clicks the
// "AI Meeting Recorder" sidebar entry. It never blocks access. The
// `onContinue` callback closes the modal, sets the localStorage seen-flag
// (handled by the parent hook) and navigates to `/meeting-recorder`. The
// `onMaybeLater` callback simply closes the popup without setting any flag.
//
// Visual design intentionally matches the existing MeetMind palette (violet /
// pink gradients, glass surfaces, Sora + DM Sans typography) so it feels
// native to the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
    "Live AI Transcription",
    "AI Meeting Summary",
    "Key Points",
    "Action Items",
    "English, Hindi & Bengali Summary Generation",
];

const spring = { type: "spring", stiffness: 360, damping: 32 };

const PremiumInfoPopup = ({ isOpen, onContinue, onMaybeLater }) => {
    // Close on Escape — but Escape acts like "Maybe Later" (does NOT set the
    // seen-flag) so the popup will re-appear next time.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key === "Escape") onMaybeLater?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onMaybeLater]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onMaybeLater}
                    role="dialog"
                    aria-modal="true"
                    aria-label="AI Meeting Recorder — Premium Feature Preview"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        background: "rgba(5,0,20,0.7)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                        fontFamily: "'DM Sans', sans-serif",
                    }}
                >
                    <motion.div
                        key="card"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={spring}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 480,
                            background: "rgba(14,4,42,0.98)",
                            border: "1px solid rgba(168,85,247,0.28)",
                            borderRadius: 24,
                            padding: "32px 28px 28px",
                            boxShadow:
                                "0 0 0 1px rgba(168,85,247,0.1), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(168,85,247,0.12)",
                            overflow: "hidden",
                            color: "#f3e8ff",
                        }}
                    >
                        {/* prismatic top hairline */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 1,
                                background:
                                    "linear-gradient(90deg, transparent, rgba(168,85,247,0.9), rgba(236,72,153,0.7), rgba(99,102,241,0.55), transparent)",
                                pointerEvents: "none",
                            }}
                        />

                        {/* soft corner glow */}
                        <div
                            style={{
                                position: "absolute",
                                top: -60,
                                right: -60,
                                width: 200,
                                height: 200,
                                borderRadius: "50%",
                                background:
                                    "radial-gradient(circle, rgba(236,72,153,0.22) 0%, transparent 70%)",
                                pointerEvents: "none",
                            }}
                        />

                        {/* close (X) — equivalent to Maybe Later */}
                        <button
                            onClick={onMaybeLater}
                            aria-label="Close"
                            style={{
                                position: "absolute",
                                top: 16,
                                right: 16,
                                width: 30,
                                height: 30,
                                borderRadius: 9,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "rgba(255,255,255,0.55)",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                zIndex: 2,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                    "rgba(255,255,255,0.12)";
                                e.currentTarget.style.color =
                                    "rgba(255,255,255,0.85)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                    "rgba(255,255,255,0.06)";
                                e.currentTarget.style.color =
                                    "rgba(255,255,255,0.55)";
                            }}
                        >
                            <X size={14} />
                        </button>

                        {/* premium badge */}
                        <div
                            style={{
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 7,
                                background:
                                    "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(236,72,153,0.16))",
                                border: "1px solid rgba(245,158,11,0.35)",
                                padding: "5px 12px",
                                borderRadius: 999,
                                marginBottom: 16,
                                zIndex: 1,
                            }}
                        >
                            <Crown size={12} color="#fbbf24" />
                            <span
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color: "#fcd34d",
                                }}
                            >
                                Premium · Free Preview
                            </span>
                        </div>

                        {/* icon + title */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                marginBottom: 14,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <div
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 14,
                                    flexShrink: 0,
                                    background:
                                        "linear-gradient(135deg,#a855f7,#ec4899)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow:
                                        "0 8px 24px rgba(168,85,247,0.45)",
                                }}
                            >
                                <Mic size={24} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontFamily: "'Sora', sans-serif",
                                        fontSize: 20,
                                        fontWeight: 800,
                                        color: "#fff",
                                        lineHeight: 1.25,
                                        letterSpacing: "-0.005em",
                                    }}
                                >
                                    🎉 Premium Feature Preview
                                </h2>
                                <p
                                    style={{
                                        margin: "4px 0 0",
                                        fontSize: 12.5,
                                        color: "rgba(216,180,254,0.7)",
                                        fontWeight: 500,
                                    }}
                                >
                                    AI Meeting Recorder
                                </p>
                            </div>
                        </div>

                        {/* body copy */}
                        <p
                            style={{
                                margin: "0 0 14px",
                                fontSize: 13.5,
                                lineHeight: 1.65,
                                color: "rgba(243,232,255,0.85)",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            AI Meeting Recorder is one of our upcoming{" "}
                            <strong style={{ color: "#fcd34d" }}>
                                Premium features
                            </strong>
                            .
                        </p>
                        <p
                            style={{
                                margin: "0 0 18px",
                                fontSize: 13.5,
                                lineHeight: 1.65,
                                color: "rgba(243,232,255,0.75)",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            For a limited time, we're giving everyone free
                            access so you can explore all of its capabilities
                            before it becomes part of our Premium plan.
                        </p>

                        {/* features list */}
                        <div
                            style={{
                                background: "rgba(168,85,247,0.07)",
                                border: "1px solid rgba(168,85,247,0.18)",
                                borderRadius: 14,
                                padding: "14px 16px",
                                marginBottom: 22,
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <p
                                style={{
                                    margin: "0 0 10px",
                                    fontSize: 10.5,
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    color: "rgba(216,180,254,0.7)",
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <Sparkles size={11} color="#c084fc" />
                                You can currently enjoy
                            </p>
                            <ul
                                style={{
                                    listStyle: "none",
                                    padding: 0,
                                    margin: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 7,
                                }}
                            >
                                {FEATURES.map((feat) => (
                                    <li
                                        key={feat}
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 9,
                                            fontSize: 13,
                                            color: "rgba(243,232,255,0.9)",
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 5,
                                                height: 5,
                                                marginTop: 8,
                                                flexShrink: 0,
                                                borderRadius: "50%",
                                                background:
                                                    "linear-gradient(135deg,#c084fc,#f472b6)",
                                                boxShadow:
                                                    "0 0 6px rgba(192,132,252,0.7)",
                                            }}
                                        />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p
                            style={{
                                margin: "0 0 22px",
                                fontSize: 12.5,
                                lineHeight: 1.6,
                                color: "rgba(216,180,254,0.65)",
                                fontStyle: "italic",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            We hope you enjoy using this feature. Thank you for
                            trying it!
                        </p>

                        {/* actions */}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                position: "relative",
                                zIndex: 1,
                            }}
                        >
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onContinue}
                                style={{
                                    flex: 1,
                                    minWidth: 140,
                                    background:
                                        "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)",
                                    border: "none",
                                    borderRadius: 12,
                                    padding: "12px 18px",
                                    color: "#fff",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    boxShadow:
                                        "0 10px 28px rgba(168,85,247,0.45)",
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                Continue <ArrowRight size={15} />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onMaybeLater}
                                style={{
                                    flex: 1,
                                    minWidth: 140,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    borderRadius: 12,
                                    padding: "12px 18px",
                                    color: "rgba(243,232,255,0.85)",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                Maybe Later
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PremiumInfoPopup;
