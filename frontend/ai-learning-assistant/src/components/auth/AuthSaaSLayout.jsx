import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import studentStudy from "@/assets/student_study.mp4";

// ─── animation variants ───────────────────────────────────────────────────────
const cardVariants = {
  hidden: (direction) => ({
    opacity: 0,
    x: direction * 60,
    scale: 0.97,
  }),
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction * -60,
    scale: 0.97,
    transition: { duration: 0.35, ease: "easeIn" },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: "easeOut" },
  }),
};

// ─── progress ring ─────────────────────────────────────────────────────────────
const ProgressRing = ({ pct = 75, size = 36, stroke = 3 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#e879f9"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
};

// ─── badge chip ───────────────────────────────────────────────────────────────
const Chip = ({ children }) => (
  <span
    style={{
      background: "rgba(255,255,255,0.13)",
      border: "1px solid rgba(255,255,255,0.2)",
      backdropFilter: "blur(8px)",
      color: "#fff",
      fontSize: 11,
      fontWeight: 500,
      padding: "4px 11px",
      borderRadius: 100,
      letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// ─── main layout ──────────────────────────────────────────────────────────────
const AuthSaaSLayout = ({
  mode = "login",
  formEyebrow = "Welcome back",
  formTitle = "Sign in to\nyour account",
  formSubtitle = "Continue your learning journey right where you left off.",
  footer,
  children,
}) => {
  const isRegister = mode === "register";
  const direction = isRegister ? -1 : 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background:
          "linear-gradient(135deg,#4C1D95 0%,#6D28D9 30%,#9333EA 60%,#EC4899 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── ambient glows ── */}
      <div
        style={{
          position: "absolute",
          top: -80,
          left: -80,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(255,255,255,0.13) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          right: -100,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(236,72,153,0.28) 0%,transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={mode}
          custom={direction}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 980,
            display: "grid",
            gridTemplateColumns: "3fr 2fr",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.45)",
          }}
          // responsive: single column on mobile
          className="auth-card"
        >
          {/* ══ LEFT — illustration panel ══════════════════════════════════ */}
          <div
            style={{
              position: "relative",
              minHeight: 520,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            {/* hero video */}
            <video
              src={studentStudy}
              autoPlay
              muted
              loop
              playsInline
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
              }}
            />

            {/* gradient overlay — makes bottom text legible */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to top,rgba(76,29,149,0.92) 0%,rgba(76,29,149,0.35) 55%,transparent 100%)",
              }}
            />

            {/* top-right progress chip */}
            <div
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(12px)",
                borderRadius: 14,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                zIndex: 2,
              }}
            >
              <ProgressRing pct={75} />
              <div>
                <div
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#fff",
                    lineHeight: 1.2,
                  }}
                >
                  75%
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
                  Progress
                </div>
              </div>
            </div>

            {/* bottom content */}
            <div style={{ position: "relative", zIndex: 2, padding: "28px 28px 32px" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <Chip>Machine Learning</Chip>
                <Chip>AI Tutor</Chip>
                <Chip>Python</Chip>
              </div>
              <div
                style={{
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#fff",
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}
              >
                Your AI-powered<br />learning companion
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
                Smart adaptive courses tailored to your pace and goals.
              </div>
            </div>
          </div>

          {/* ══ RIGHT — form panel ═════════════════════════════════════════ */}
          <div
            style={{
              background: "linear-gradient(160deg,#7C3AED 0%,#A855F7 50%,#EC4899 100%)",
              borderLeft: "1px solid rgba(255,255,255,0.12)",
              padding: "48px 36px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {/* eyebrow */}
            <motion.p
              custom={0}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color: "#e879f9",
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              {formEyebrow}
            </motion.p>

            {/* title */}
            <motion.h2
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.2,
                marginBottom: 8,
                whiteSpace: "pre-line",
              }}
            >
              {formTitle}
            </motion.h2>

            {/* subtitle */}
            <motion.p
              custom={2}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              {formSubtitle}
            </motion.p>

            {/* injected form children */}
            <motion.div
              custom={3}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
            >
              {children}
            </motion.div>

            {/* footer */}
            {footer && (
              <motion.div
                custom={4}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                style={{ marginTop: 24 }}
              >
                {footer}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── responsive style ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');

        @media (max-width: 640px) {
          .auth-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthSaaSLayout;


// ─── USAGE EXAMPLE ────────────────────────────────────────────────────────────
// Drop-in form fields styled to match the glass theme.
// Copy these helpers into your login/register page components.

export const GlassInput = ({ label, icon, ...props }) => (
  <div style={{ marginBottom: 18 }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "rgba(255,255,255,0.9)",
          marginBottom: 8,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </label>
    )}
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.45)",
            fontSize: 16,
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {icon}
        </span>
      )}
      <input
        {...props}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 14,
          padding: icon ? "13px 14px 13px 42px" : "13px 14px",
          color: "#fff",
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          outline: "none",
          transition: "border-color 0.2s, background 0.2s",
          boxSizing: "border-box",
          ...props.style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgba(255,255,255,0.5)";
          e.target.style.background = "rgba(255,255,255,0.2)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(255,255,255,0.2)";
          e.target.style.background = "rgba(255,255,255,0.15)";
          props.onBlur?.(e);
        }}
      />
    </div>
  </div>
);

export const GlassButton = ({ children, variant = "primary", ...props }) => {
  const isPrimary = variant === "primary";
  return (
    <button
      {...props}
      style={{
        width: "100%",
        background: isPrimary
          ? "linear-gradient(135deg,#A855F7,#EC4899)"
          : "rgba(255,255,255,0.1)",
        border: isPrimary ? "none" : "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12,
        padding: "13px 20px",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "'Sora', sans-serif",
        cursor: "pointer",
        letterSpacing: "0.02em",
        transition: "opacity 0.2s, transform 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...props.style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.88";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
    >
      {children}
    </button>
  );
};

export const GlassDivider = ({ label = "or continue with" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      margin: "20px 0",
    }}
  >
    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
  </div>
);

export const GlassFooterText = ({ children }) => (
  <p
    style={{
      marginTop: 20,
      textAlign: "center",
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
      fontFamily: "'DM Sans', sans-serif",
    }}
  >
    {children}
  </p>
);

// ─── EXAMPLE LOGIN PAGE ───────────────────────────────────────────────────────
// pages/LoginPage.jsx
//
// import AuthSaaSLayout, {
//   GlassInput, GlassButton, GlassDivider, GlassFooterText
// } from "@/components/AuthSaaSLayout";
//
// export default function LoginPage() {
//   return (
//     <AuthSaaSLayout
//       mode="login"
//       formEyebrow="Welcome back"
//       formTitle={"Sign in to\nyour account"}
//       formSubtitle="Continue your learning journey right where you left off."
//       footer={
//         <GlassFooterText>
//           Don't have an account?{" "}
//           <a href="/register" style={{ color: "#e879f9", fontWeight: 600 }}>
//             Create one free
//           </a>
//         </GlassFooterText>
//       }
//     >
//       <GlassInput label="Email address" type="email" placeholder="you@example.com" />
//       <GlassInput label="Password" type="password" placeholder="••••••••" />
//       <GlassButton>Sign In →</GlassButton>
//       <GlassDivider />
//       <GlassButton variant="secondary">
//         {/* Google SVG icon */}
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
//           <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
//           <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
//           <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
//           <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
//         </svg>
//         Continue with Google
//       </GlassButton>
//     </AuthSaaSLayout>
//   );
// }