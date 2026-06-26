import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { usePremiumPopup } from "../../features/meetingRecorder/hooks/usePremiumPopup.js";
import PremiumInfoPopup from "../../features/meetingRecorder/components/PremiumInfoPopup.jsx";

import {
    LayoutDashboard,
    FileText,
    User,
    LogOut,
    BookOpen,
    Brain,
    BrainCircuit,
    Mic,
    Radio,
    X,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
} from "lucide-react";

// ─── nav config ───────────────────────────────────────────────────────────────
// Items can opt-in to a "Premium" badge and a click-intercept so they show an
// informational popup before navigating. The popup itself is owned by this
// Sidebar (see usePremiumPopup) and is purely informational — it never blocks
// access. Auth / subscription gating can be wired into the same intercept
// point later without touching the link list.
const MEETING_RECORDER_ROUTE = "/meeting-recorder";

const NAV_LINKS = [
    { to: "/dashboard",         icon: LayoutDashboard, text: "Dashboard"            },
    { to: "/documents",         icon: FileText,        text: "Documents"            },
    { to: "/flashcards",        icon: BookOpen,        text: "Flashcards"           },
    { to: "/study-vault",       icon: Brain,           text: "Study Vault"          },
    { to: "/meeting-assistant", icon: Mic,             text: "AI Meeting Assistant" },
    {
        to: MEETING_RECORDER_ROUTE,
        icon: Radio,
        text: "AI Meeting Recorder",
        premium: true,
        interceptClick: true,
    },
    { to: "/profile",           icon: User,            text: "Profile"            },
    { to: "/calendar",          icon: CalendarDays,    text: "Study Calendar"     },
];

// ─── widths ───────────────────────────────────────────────────────────────────
const EXPANDED_W = 240;
const COLLAPSED_W = 68;

// ─── tooltip (collapsed mode) ─────────────────────────────────────────────────
const Tooltip = ({ label, children }) => {
    const [show, setShow] = useState(false);
    return (
        <div
            style={{ position: "relative" }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: "absolute",
                            left: "calc(100% + 12px)",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "rgba(30,10,60,0.92)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 500,
                            padding: "6px 12px",
                            borderRadius: 10,
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            zIndex: 999,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        }}
                    >
                        {label}
                        {/* arrow */}
                        <div style={{
                            position: "absolute",
                            left: -5,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 0,
                            height: 0,
                            borderTop: "5px solid transparent",
                            borderBottom: "5px solid transparent",
                            borderRight: "5px solid rgba(30,10,60,0.92)",
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── small "Premium" badge shown next to upgrade-gated nav items ───────────────
const PremiumBadge = ({ collapsed }) => {
    if (collapsed) {
        // In collapsed mode, just show a tiny gold dot on the icon's corner.
        return (
            <span
                aria-label="Premium"
                style={{
                    position: "absolute",
                    top: 6,
                    right: 10,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#f59e0b,#ec4899)",
                    boxShadow: "0 0 6px rgba(245,158,11,0.7)",
                    zIndex: 3,
                    pointerEvents: "none",
                }}
            />
        );
    }
    return (
        <span
            style={{
                position: "relative",
                zIndex: 1,
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#fff",
                background: "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
                padding: "2px 7px",
                borderRadius: 999,
                boxShadow: "0 2px 8px rgba(236,72,153,0.4)",
                whiteSpace: "nowrap",
            }}
        >
            Premium
        </span>
    );
};

// ─── single nav item ──────────────────────────────────────────────────────────
const NavItem = ({ link, collapsed, onClose, onIntercept }) => {
    const Icon = link.icon;

    const inner = (isActive) => (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "12px 0" : "11px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 14,
                cursor: "pointer",
                transition: "background 0.2s",
                background: isActive ? "rgba(255,255,255,0.18)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                overflow: "hidden",
            }}
            onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.09)";
            }}
            onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
            }}
        >
            {/* active glow */}
            {isActive && (
                <motion.div
                    layoutId="active-glow"
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 14,
                        background:
                            "linear-gradient(135deg,rgba(232,121,249,0.25),rgba(168,85,247,0.2))",
                        border: "1px solid rgba(232,121,249,0.3)",
                        zIndex: 0,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
            )}

            {/* icon */}
            <motion.div
                style={{ position: "relative", zIndex: 1, flexShrink: 0 }}
                animate={{ color: isActive ? "#f0abfc" : "rgba(255,255,255,0.65)" }}
            >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
            </motion.div>

            {/* label */}
            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        style={{
                            position: "relative",
                            zIndex: 1,
                            fontSize: 13.5,
                            fontWeight: isActive ? 600 : 450,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            letterSpacing: "0.01em",
                            fontFamily: "'DM Sans', sans-serif",
                        }}
                    >
                        {link.text}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Premium badge (full label or corner dot) */}
            {link.premium && <PremiumBadge collapsed={collapsed} />}

            {/* active left bar */}
            {isActive && !collapsed && (
                <motion.div
                    layoutId="active-bar"
                    style={{
                        position: "absolute",
                        left: 0,
                        top: "20%",
                        height: "60%",
                        width: 3,
                        borderRadius: 4,
                        background: "linear-gradient(180deg,#f0abfc,#c084fc)",
                        zIndex: 2,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
            )}
        </motion.div>
    );

    // Intercept click on opt-in items (e.g. AI Meeting Recorder) so the
    // informational popup can show before navigation. If `onIntercept` returns
    // truthy, the default NavLink navigation is prevented.
    const handleClick = (e) => {
        if (link.interceptClick && typeof onIntercept === "function") {
            const handled = onIntercept(link, e);
            if (handled) {
                e.preventDefault();
                return;
            }
        }
        if (onClose) onClose();
    };

    const navEl = (
        <NavLink
            to={link.to}
            onClick={handleClick}
            style={{ textDecoration: "none", display: "block" }}
        >
            {({ isActive }) => inner(isActive)}
        </NavLink>
    );

    return collapsed ? (
        <Tooltip label={link.premium ? `${link.text} · Premium` : link.text}>
            {navEl}
        </Tooltip>
    ) : navEl;
};

// ─── sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // desktop collapse state (independent from mobile drawer)
    const [collapsed, setCollapsed] = useState(false);

    // Premium-info popup state for the AI Meeting Recorder entry.
    const meetingRecorderPopup = usePremiumPopup();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // close mobile drawer when item clicked
    const handleMobileClose = () => {
        if (window.innerWidth < 768) toggleSidebar();
    };

    // Hook into nav items flagged with `interceptClick`. Returning `true`
    // signals NavItem to call e.preventDefault(). For the Meeting Recorder
    // the popup is shown ONLY the first time; subsequent clicks navigate
    // directly (handled inside usePremiumPopup → requestOpen).
    const handleNavIntercept = (link) => {
        if (link.to === MEETING_RECORDER_ROUTE) {
            const opened = meetingRecorderPopup.requestOpen(() => {
                handleMobileClose();
                navigate(MEETING_RECORDER_ROUTE);
            });
            return opened; // true → we showed the popup, suppress default nav
        }
        return false;
    };

    // "Continue" → mark as seen and navigate to the recorder.
    const handleContinue = () => {
        meetingRecorderPopup.dismiss();
        handleMobileClose();
        navigate(MEETING_RECORDER_ROUTE);
    };

    // "Maybe Later" → just close; do NOT set the seen flag so the popup will
    // re-appear next time. This matches the spec exactly.
    const handleMaybeLater = () => {
        meetingRecorderPopup.close();
    };

    // ── shared inner sidebar content ──────────────────────────────────────────
    const SidebarContent = ({ isMobile = false }) => (
        <motion.div
            animate={{ width: isMobile ? EXPANDED_W : collapsed ? COLLAPSED_W : EXPANDED_W }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background:
                    "linear-gradient(170deg,#3b0764 0%,#5b21b6 40%,#6d28d9 70%,#7e22ce 100%)",
                borderRight: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "4px 0 32px rgba(0,0,0,0.25)",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* subtle noise texture overlay */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
                background: "radial-gradient(ellipse at 20% 0%,rgba(232,121,249,0.12) 0%,transparent 60%)",
            }} />

            {/* ── logo row ── */}
            <div style={{
                position: "relative", zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed && !isMobile ? "center" : "space-between",
                padding: collapsed && !isMobile ? "20px 0" : "16px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                minHeight: 68,
            }}>
                <AnimatePresence initial={false}>
                    {(!collapsed || isMobile) && (
                        <motion.div
                            key="brand"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: "flex", alignItems: "center", gap: 10 }}
                        >
                            <div style={{
                                width: 40, height: 40,
                                borderRadius: 12,
                                background: "rgba(232,121,249,0.2)",
                                border: "1px solid rgba(232,121,249,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                            }}>
                                <BrainCircuit size={20} color="#f0abfc" />
                            </div>
                            <div>
                                <p style={{
                                    fontFamily: "'Sora', sans-serif",
                                    fontWeight: 700, fontSize: 15, color: "#fff",
                                    margin: 0, letterSpacing: "0.03em",
                                }}>MEETMIND</p>
                                <p style={{ fontSize: 11, color: "rgba(240,171,252,0.75)", margin: 0 }}>
                                    AI Learning
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* collapsed: show only logo icon */}
                {collapsed && !isMobile && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "rgba(232,121,249,0.2)",
                            border: "1px solid rgba(232,121,249,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                    >
                        <BrainCircuit size={18} color="#f0abfc" />
                    </motion.div>
                )}

                {/* mobile close / desktop collapse toggle */}
                {isMobile ? (
                    <button
                        onClick={toggleSidebar}
                        style={{
                            background: "rgba(255,255,255,0.08)", border: "none",
                            borderRadius: 8, padding: 6, cursor: "pointer",
                            color: "#fff", display: "flex",
                        }}
                    >
                        <X size={18} />
                    </button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8, padding: 5, cursor: "pointer",
                            color: "rgba(255,255,255,0.8)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        {collapsed
                            ? <ChevronRight size={15} />
                            : <ChevronLeft size={15} />
                        }
                    </motion.button>
                )}
            </div>

            {/* ── nav ── */}
            <nav style={{
                flex: 1,
                padding: collapsed && !isMobile ? "12px 10px" : "12px 10px",
                display: "flex", flexDirection: "column", gap: 2,
                overflowY: "auto", overflowX: "hidden",
                position: "relative", zIndex: 1,
            }}>
                {NAV_LINKS.map((link) => (
                    <NavItem
                        key={link.to}
                        link={link}
                        collapsed={collapsed && !isMobile}
                        onClose={handleMobileClose}
                        onIntercept={handleNavIntercept}
                    />
                ))}
            </nav>

            {/* ── logout ── */}
            <div style={{
                position: "relative", zIndex: 1,
                padding: collapsed && !isMobile ? "12px 10px" : "12px 10px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
            }}>
                {collapsed && !isMobile ? (
                    <Tooltip label="Logout">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLogout}
                            style={{
                                width: "100%", background: "transparent",
                                border: "none", borderRadius: 14, padding: "12px 0",
                                color: "rgba(255,255,255,0.55)", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "color 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#fca5a5"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.55)"}
                        >
                            <LogOut size={19} strokeWidth={1.8} />
                        </motion.button>
                    </Tooltip>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleLogout}
                        style={{
                            width: "100%", background: "transparent",
                            border: "none", borderRadius: 14,
                            padding: "11px 14px",
                            color: "rgba(255,255,255,0.55)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 12,
                            fontSize: 13.5, fontWeight: 450,
                            fontFamily: "'DM Sans', sans-serif",
                            transition: "color 0.2s, background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(252,165,165,0.1)";
                            e.currentTarget.style.color = "#fca5a5";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                        }}
                    >
                        <LogOut size={19} strokeWidth={1.8} />
                        Logout
                    </motion.button>
                )}
            </div>
        </motion.div>
    );

    return (
        <>
            {/* ── MOBILE overlay + drawer ── */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            key="overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            onClick={toggleSidebar}
                            style={{
                                position: "fixed", inset: 0,
                                background: "rgba(0,0,0,0.55)",
                                backdropFilter: "blur(2px)",
                                zIndex: 40,
                            }}
                            className="md:hidden"
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: -EXPANDED_W }}
                            animate={{ x: 0 }}
                            exit={{ x: -EXPANDED_W }}
                            transition={{ type: "spring", stiffness: 320, damping: 34 }}
                            style={{
                                position: "fixed", top: 0, left: 0,
                                height: "100%", zIndex: 50,
                                width: EXPANDED_W,
                            }}
                            className="md:hidden"
                        >
                            <SidebarContent isMobile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ── DESKTOP persistent sidebar ── */}
            <aside
                className="hidden md:block"
                style={{ flexShrink: 0, height: "100%" }}
            >
                <SidebarContent />
            </aside>

            {/* ── AI Meeting Recorder — informational Premium popup ── */}
            <PremiumInfoPopup
                isOpen={meetingRecorderPopup.isOpen}
                onContinue={handleContinue}
                onMaybeLater={handleMaybeLater}
            />
        </>
    );
};

export default Sidebar;
