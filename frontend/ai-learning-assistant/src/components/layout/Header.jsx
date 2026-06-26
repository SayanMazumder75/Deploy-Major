import React, { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { usePremiumPopup } from "../../features/meetingRecorder/hooks/usePremiumPopup.js";
import PremiumInfoPopup from "../../features/meetingRecorder/components/PremiumInfoPopup.jsx";
import {
    Bell, Search, BrainCircuit, LayoutDashboard, FileText,
    BookOpen, Brain, User, LogOut, ChevronDown,
    Mic, Radio, CalendarDays, Sparkles, X, Menu,
    Zap, ArrowRight, Clock, Hash, Sun, Moon, Crown,
} from "lucide-react";

// ─── hooks ─────────────────────────────────────────────────────────────────────
const useBreakpoint = () => {
    const [w, setW] = useState(() => window.innerWidth);
    useEffect(() => {
        const h = () => setW(window.innerWidth);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return { isMobile: w < 768, isTablet: w < 1100 };
};

const useOutsideClick = (ref, cb) => {
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [ref, cb]);
};

// ─── constants ─────────────────────────────────────────────────────────────────
// Items can opt-in to a small "Premium" pill and a click-intercept so they
// show an informational popup before navigating. The popup itself is owned
// by the Header (see usePremiumPopup) and is purely informational — it
// never blocks access. Auth / subscription gating can later be wired into
// the same intercept point without touching the link list.
const MEETING_RECORDER_ROUTE = "/meeting-recorder";

const NAV_LINKS = [
    { to: "/dashboard",          icon: LayoutDashboard, label: "Dashboard"            },
    { to: "/documents",          icon: FileText,         label: "Documents"            },
    { to: "/flashcards",         icon: BookOpen,          label: "Flashcards"           },
    { to: "/study-vault",        icon: Brain,             label: "Study Vault"          },
    { to: "/meeting-assistant",  icon: Mic,               label: "AI Meeting Assistant" },
    {
        to: MEETING_RECORDER_ROUTE,
        icon: Radio,
        label: "AI Meeting Recorder",
        premium: true,
        interceptClick: true,
    },
];

const PROFILE_MENU = [
    { icon: User,        label: "Profile",        to: "/profile"   },
    { icon: CalendarDays,label: "Study Calendar", to: "/calendar"  },
];

const NOTIFICATIONS = [
    { id: 1, icon: "🧠", title: "Flashcard session due",   sub: "Resume your ML deck",       time: "5m",  color: "#c084fc", unread: true  },
    { id: 2, icon: "✨", title: "New AI summary ready",    sub: "Chapter 3 — Data Science",  time: "1h",  color: "#818cf8", unread: true  },
    { id: 3, icon: "📅", title: "Study Calendar reminder", sub: "2h session at 4 PM today",  time: "3h",  color: "#38bdf8", unread: false },
    { id: 4, icon: "🎯", title: "Goal milestone reached",  sub: "50 cards memorized!",       time: "5h",  color: "#34d399", unread: false },
];

const SEARCH_CATEGORIES = [
    { icon: FileText,  label: "Documents",  hint: "PDFs, notes & uploads", tag: "doc"  },
    { icon: BookOpen,  label: "Flashcards", hint: "Cards and decks",        tag: "card" },
    { icon: Brain,     label: "Study Vault",hint: "Resources & summaries",  tag: "vault"},
    { icon: Sparkles,  label: "Ask AI",     hint: "Instant smart answers",  tag: "ai"   },
];

const RECENT_SEARCHES = ["Machine Learning basics", "React hooks", "Python pandas"];

// ─── spring config ──────────────────────────────────────────────────────────────
const spring = { type: "spring", stiffness: 360, damping: 32 };

// ─── NavPill ─────────────────────────────────────────────────────────────────────
const NavPill = ({ link, onIntercept }) => {
    const Icon = link.icon;

    // Intercept click on opt-in items (e.g. AI Meeting Recorder) so the
    // informational popup can show before navigation. If `onIntercept`
    // returns truthy, the default NavLink navigation is prevented.
    const handleClick = (e) => {
        if (link.interceptClick && typeof onIntercept === "function") {
            const handled = onIntercept(link, e);
            if (handled) e.preventDefault();
        }
    };

    return (
        <NavLink to={link.to} onClick={handleClick} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
                <motion.div
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 13px",
                        borderRadius: 10,
                        color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 450,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: "pointer",
                        letterSpacing: isActive ? "0.01em" : "0",
                        transition: "color 0.18s",
                        whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                    {isActive && (
                        <motion.div
                            layoutId="nav-pill-bg"
                            transition={spring}
                            style={{
                                position: "absolute", inset: 0,
                                borderRadius: 10,
                                background: "linear-gradient(135deg, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.18) 100%)",
                                border: "1px solid rgba(192,132,252,0.3)",
                                boxShadow: "0 0 18px rgba(168,85,247,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                            }}
                        />
                    )}
                    <Icon size={14} strokeWidth={isActive ? 2.2 : 1.7} style={{ position: "relative", zIndex: 1, flexShrink: 0 }} />
                    <span style={{ position: "relative", zIndex: 1 }}>{link.label}</span>
                    {link.premium && (
                        <span
                            style={{
                                position: "relative",
                                zIndex: 1,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                fontSize: 8.5,
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color: "#fff",
                                background:
                                    "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
                                padding: "2px 6px",
                                borderRadius: 999,
                                boxShadow: "0 2px 8px rgba(236,72,153,0.4)",
                                whiteSpace: "nowrap",
                                marginLeft: 2,
                            }}
                        >
                            <Crown size={8} strokeWidth={2.4} />
                            Premium
                        </span>
                    )}
                    {isActive && (
                        <motion.div
                            layoutId="nav-dot"
                            transition={spring}
                            style={{
                                position: "absolute",
                                bottom: 3, left: "50%",
                                transform: "translateX(-50%)",
                                width: 3, height: 3, borderRadius: "50%",
                                background: "rgba(216,180,254,0.8)",
                            }}
                        />
                    )}
                </motion.div>
            )}
        </NavLink>
    );
};

// ─── SearchModal ──────────────────────────────────────────────────────────────
const SearchModal = ({ onClose }) => {
    const [q, setQ] = useState("");
    const [focused, setFocused] = useState(null);
    const inputRef = useRef(null);
    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 300,
                background: "rgba(5,0,20,0.65)",
                backdropFilter: "blur(12px)",
                display: "flex", alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: 96,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={spring}
                onClick={e => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: 600, margin: "0 20px",
                    background: "rgba(12,4,36,0.98)",
                    backdropFilter: "blur(32px)",
                    border: "1px solid rgba(168,85,247,0.25)",
                    borderRadius: 22,
                    boxShadow: "0 0 0 1px rgba(168,85,247,0.1), 0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(168,85,247,0.08)",
                    overflow: "hidden",
                }}
            >
                <div style={{
                    height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(236,72,153,0.6), transparent)",
                }} />
                <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "16px 20px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(236,72,153,0.15))",
                        border: "1px solid rgba(168,85,247,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        <Search size={15} color="#c084fc" />
                    </div>
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search documents, flashcards, or ask AI…"
                        style={{
                            flex: 1, background: "transparent", border: "none",
                            outline: "none", color: "#f3e8ff", fontSize: 15,
                            fontFamily: "'DM Sans', sans-serif",
                            caretColor: "#c084fc",
                        }}
                    />
                    <kbd onClick={onClose} style={{
                        fontSize: 10.5, color: "rgba(255,255,255,0.28)",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6, padding: "3px 8px",
                        fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.04em",
                    }}>ESC</kbd>
                </div>
                <div style={{ padding: "12px 12px 8px" }}>
                    {!q && (
                        <>
                            <p style={{
                                fontSize: 10.5, letterSpacing: "0.18em",
                                color: "rgba(255,255,255,0.28)", textTransform: "uppercase",
                                margin: "4px 8px 10px", fontWeight: 600,
                            }}>Recent</p>
                            {RECENT_SEARCHES.map((s, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ x: 2, background: "rgba(168,85,247,0.09)" }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        padding: "9px 12px", borderRadius: 11, cursor: "pointer",
                                        marginBottom: 2, transition: "background 0.15s",
                                    }}
                                >
                                    <Clock size={13} color="rgba(192,132,252,0.5)" />
                                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{s}</span>
                                    <ArrowRight size={12} color="rgba(255,255,255,0.2)" style={{ marginLeft: "auto" }} />
                                </motion.div>
                            ))}
                            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "10px 0" }} />
                        </>
                    )}
                    <p style={{
                        fontSize: 10.5, letterSpacing: "0.18em",
                        color: "rgba(255,255,255,0.28)", textTransform: "uppercase",
                        margin: "4px 8px 10px", fontWeight: 600,
                    }}>Quick search</p>
                    {SEARCH_CATEGORIES.map((s, i) => {
                        const Icon = s.icon;
                        const isFocused = focused === i;
                        return (
                            <motion.div
                                key={i}
                                onHoverStart={() => setFocused(i)}
                                onHoverEnd={() => setFocused(null)}
                                whileHover={{ x: 2 }}
                                animate={{ background: isFocused ? "rgba(168,85,247,0.1)" : "transparent" }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                                    marginBottom: 2, transition: "background 0.15s",
                                }}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: 9,
                                    background: isFocused ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.09)",
                                    border: `1px solid ${isFocused ? "rgba(168,85,247,0.4)" : "rgba(168,85,247,0.15)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0, transition: "all 0.18s",
                                }}>
                                    <Icon size={14} color={isFocused ? "#e879f9" : "#a78bfa"} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 13, color: isFocused ? "#f3e8ff" : "rgba(255,255,255,0.72)", margin: 0, fontWeight: 500 }}>{s.label}</p>
                                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>{s.hint}</p>
                                </div>
                                <span style={{
                                    fontSize: 10, color: "rgba(192,132,252,0.5)",
                                    background: "rgba(168,85,247,0.1)",
                                    border: "1px solid rgba(168,85,247,0.18)",
                                    borderRadius: 5, padding: "2px 7px", fontFamily: "monospace",
                                }}>{s.tag}</span>
                            </motion.div>
                        );
                    })}
                </div>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px 14px",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                    <div style={{ display: "flex", gap: 14 }}>
                        {[["↵", "open"], ["↑↓", "navigate"], ["esc", "close"]].map(([k, a]) => (
                            <span key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <kbd style={{
                                    fontSize: 10, color: "rgba(255,255,255,0.3)",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 5, padding: "2px 7px", fontFamily: "monospace",
                                }}>{k}</kbd>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{a}</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Zap size={11} color="rgba(192,132,252,0.5)" />
                        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.22)" }}>Powered by AI</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── NotificationPanel ────────────────────────────────────────────────────────
const NotificationPanel = ({ onClose }) => {
    const [items, setItems] = useState(NOTIFICATIONS);
    const unread = items.filter(n => n.unread).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={spring}
            style={{
                position: "absolute", top: "calc(100% + 10px)", right: -8,
                width: 320,
                background: "rgba(10,3,30,0.98)",
                backdropFilter: "blur(32px)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: 20,
                boxShadow: "0 0 0 1px rgba(168,85,247,0.08), 0 28px 80px rgba(0,0,0,0.6)",
                overflow: "hidden", zIndex: 200,
            }}
        >
            <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.7),rgba(236,72,153,0.5),transparent)" }} />
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ color: "#fff", fontSize: 13.5, fontWeight: 700, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Notifications</p>
                    {unread > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                                background: "linear-gradient(135deg,#a855f7,#ec4899)",
                                color: "#fff", fontSize: 10, fontWeight: 700,
                                padding: "2px 7px", borderRadius: 100,
                            }}
                        >{unread} new</motion.span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {unread > 0 && (
                        <button
                            onClick={() => setItems(items.map(n => ({ ...n, unread: false })))}
                            style={{
                                fontSize: 11, color: "rgba(192,132,252,0.75)",
                                background: "none", border: "none", cursor: "pointer",
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >Mark all read</button>
                    )}
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 7, padding: "4px 6px",
                        color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex",
                    }}>
                        <X size={12} />
                    </button>
                </div>
            </div>
            <div style={{ padding: "6px 8px 8px", maxHeight: 340, overflowY: "auto" }}>
                {items.map((n) => (
                    <motion.div
                        key={n.id}
                        whileHover={{ background: "rgba(168,85,247,0.08)" }}
                        onClick={() => setItems(items.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                        style={{
                            display: "flex", gap: 11, alignItems: "flex-start",
                            padding: "11px 10px", borderRadius: 13, cursor: "pointer",
                            marginBottom: 2,
                            background: n.unread ? "rgba(168,85,247,0.05)" : "transparent",
                            transition: "background 0.15s",
                        }}
                    >
                        <div style={{
                            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                            background: `${n.color}18`,
                            border: `1px solid ${n.color}35`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 17,
                        }}>{n.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p style={{
                                    color: n.unread ? "#f3e8ff" : "rgba(255,255,255,0.55)",
                                    fontSize: 12.5, fontWeight: n.unread ? 600 : 400,
                                    margin: 0, fontFamily: "'DM Sans', sans-serif",
                                }}>{n.title}</p>
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", flexShrink: 0, marginLeft: 8 }}>{n.time} ago</span>
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11.5, margin: "3px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{n.sub}</p>
                        </div>
                        {n.unread && (
                            <div style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: n.color, flexShrink: 0, marginTop: 6,
                                boxShadow: `0 0 8px ${n.color}`,
                            }} />
                        )}
                    </motion.div>
                ))}
            </div>
            <div style={{
                borderTop: "1px solid rgba(255,255,255,0.05)",
                padding: "10px 16px",
                display: "flex", justifyContent: "center",
            }}>
                <button style={{
                    background: "none", border: "none",
                    color: "rgba(192,132,252,0.6)", fontSize: 12,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", gap: 5,
                }}>
                    View all <ArrowRight size={11} />
                </button>
            </div>
        </motion.div>
    );
};

// ─── ProfileDropdown ──────────────────────────────────────────────────────────
const ProfileDropdown = ({ user, initials, onLogout, onClose }) => {
    const navigate = useNavigate();
    const go = (to) => { onClose(); navigate(to); };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={spring}
            style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                width: 240,
                background: "rgba(10,3,30,0.98)",
                backdropFilter: "blur(32px)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: 20,
                boxShadow: "0 0 0 1px rgba(168,85,247,0.08), 0 28px 80px rgba(0,0,0,0.6)",
                overflow: "hidden", zIndex: 200,
            }}
        >
            <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.7),rgba(236,72,153,0.5),transparent)" }} />
            <div style={{
                padding: "14px 14px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 11,
            }}>
                <div style={{ position: "relative" }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                        background: "linear-gradient(135deg,#a855f7,#ec4899)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 14, fontWeight: 700,
                        fontFamily: "'Sora', sans-serif",
                        boxShadow: "0 4px 16px rgba(168,85,247,0.5)",
                    }}>{initials}</div>
                    <div style={{
                        position: "absolute", bottom: -1, right: -1,
                        width: 11, height: 11, borderRadius: "50%",
                        background: "#34d399", border: "2px solid #0a031e",
                    }} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <p style={{
                        color: "#fff", fontSize: 13.5, fontWeight: 700, margin: 0,
                        fontFamily: "'DM Sans', sans-serif",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{user?.username || "User"}</p>
                    <p style={{
                        color: "rgba(216,180,254,0.5)", fontSize: 11.5, margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontFamily: "'DM Sans', sans-serif",
                    }}>{user?.email || "user@example.com"}</p>
                </div>
            </div>
            <div style={{ padding: "8px 8px 6px" }}>
                {PROFILE_MENU.map((item) => {
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.to}
                            whileHover={{ x: 2, background: "rgba(255,255,255,0.05)" }}
                            onClick={() => go(item.to)}
                            style={{
                                width: "100%", background: "transparent", border: "none",
                                borderRadius: 11, padding: "9px 10px",
                                display: "flex", alignItems: "center", gap: 10,
                                color: "rgba(255,255,255,0.6)", cursor: "pointer",
                                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                                textAlign: "left", transition: "background 0.15s",
                            }}
                        >
                            <div style={{
                                width: 26, height: 26, borderRadius: 8,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                            }}>
                                <Icon size={13} color="rgba(255,255,255,0.5)" strokeWidth={1.8} />
                            </div>
                            {item.label}
                        </motion.button>
                    );
                })}
            </div>
            <div style={{ padding: "4px 8px 10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <motion.button
                    whileHover={{ x: 2, background: "rgba(252,165,165,0.07)" }}
                    onClick={() => { onClose(); onLogout?.(); }}
                    style={{
                        width: "100%", background: "transparent", border: "none",
                        borderRadius: 11, padding: "9px 10px",
                        display: "flex", alignItems: "center", gap: 10,
                        color: "rgba(252,165,165,0.6)", cursor: "pointer",
                        fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                        textAlign: "left", transition: "background 0.15s",
                    }}
                >
                    <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: "rgba(252,165,165,0.07)",
                        border: "1px solid rgba(252,165,165,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                    }}>
                        <LogOut size={13} color="rgba(252,165,165,0.6)" strokeWidth={1.8} />
                    </div>
                    Sign out
                </motion.button>
            </div>
        </motion.div>
    );
};

// ─── MobileMenu ───────────────────────────────────────────────────────────────
const MobileMenu = ({ user, initials, onLogout, onClose, onIntercept }) => {
    const navigate = useNavigate();
    const go = (to) => { onClose(); navigate(to); };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(5,0,20,0.7)", backdropFilter: "blur(6px)",
            }}
        >
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={spring}
                onClick={e => e.stopPropagation()}
                style={{
                    position: "absolute", top: 0, right: 0,
                    width: 290, height: "100%",
                    background: "rgba(10,3,30,0.99)",
                    backdropFilter: "blur(32px)",
                    borderLeft: "1px solid rgba(168,85,247,0.2)",
                    boxShadow: "-20px 0 80px rgba(0,0,0,0.6)",
                    display: "flex", flexDirection: "column",
                    overflowY: "auto",
                }}
            >
                <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.7),rgba(236,72,153,0.5),transparent)" }} />
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 18px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 9,
                            background: "linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.2))",
                            border: "1px solid rgba(168,85,247,0.35)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <BrainCircuit size={16} color="#e879f9" />
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Sora', sans-serif" }}>MEETMIND</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, padding: 6, cursor: "pointer", color: "rgba(255,255,255,0.5)",
                        display: "flex",
                    }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ padding: "12px 10px" }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "4px 8px 10px", fontFamily: "'DM Sans', sans-serif" }}>Navigation</p>
                    {NAV_LINKS.map(link => {
                        const Icon = link.icon;
                        const handleClick = (e) => {
                            if (link.interceptClick && typeof onIntercept === "function") {
                                const handled = onIntercept(link, e);
                                if (handled) { e.preventDefault(); return; }
                            }
                            onClose();
                        };
                        return (
                            <NavLink key={link.to} to={link.to} onClick={handleClick} style={{ textDecoration: "none", display: "block" }}>
                                {({ isActive }) => (
                                    <motion.div
                                        whileHover={{ x: 3 }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12,
                                            padding: "11px 12px", borderRadius: 12, marginBottom: 2,
                                            background: isActive ? "rgba(168,85,247,0.18)" : "transparent",
                                            border: isActive ? "1px solid rgba(168,85,247,0.3)" : "1px solid transparent",
                                            color: isActive ? "#f3e8ff" : "rgba(255,255,255,0.55)",
                                            cursor: "pointer", transition: "all 0.15s",
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.7} />
                                        <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>{link.label}</span>
                                        {link.premium && (
                                            <span style={{
                                                marginLeft: "auto",
                                                display: "inline-flex", alignItems: "center", gap: 3,
                                                fontSize: 9, fontWeight: 800,
                                                letterSpacing: "0.08em", textTransform: "uppercase",
                                                color: "#fff",
                                                background: "linear-gradient(135deg,#f59e0b 0%,#ec4899 100%)",
                                                padding: "2px 7px", borderRadius: 999,
                                                boxShadow: "0 2px 8px rgba(236,72,153,0.4)",
                                                whiteSpace: "nowrap",
                                            }}>
                                                <Crown size={9} strokeWidth={2.4} />
                                                Premium
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </NavLink>
                        );
                    })}
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px" }} />
                <div style={{ padding: "12px 10px" }}>
                    <p style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "4px 8px 10px", fontFamily: "'DM Sans', sans-serif" }}>Tools & Account</p>
                    {PROFILE_MENU.map(item => {
                        const Icon = item.icon;
                        return (
                            <motion.button
                                key={item.to}
                                whileHover={{ x: 3, background: "rgba(255,255,255,0.05)" }}
                                onClick={() => go(item.to)}
                                style={{
                                    width: "100%", background: "transparent", border: "none",
                                    borderRadius: 12, padding: "11px 12px", marginBottom: 2,
                                    display: "flex", alignItems: "center", gap: 12,
                                    color: "rgba(255,255,255,0.55)", cursor: "pointer",
                                    fontSize: 13.5, fontFamily: "'DM Sans', sans-serif",
                                    textAlign: "left", transition: "background 0.15s",
                                }}
                            >
                                <Icon size={16} strokeWidth={1.7} />
                                {item.label}
                            </motion.button>
                        );
                    })}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ padding: "12px 10px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", marginBottom: 8,
                        background: "rgba(168,85,247,0.08)",
                        border: "1px solid rgba(168,85,247,0.15)",
                        borderRadius: 14,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: "linear-gradient(135deg,#a855f7,#ec4899)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 12, fontWeight: 700,
                            fontFamily: "'Sora', sans-serif",
                        }}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, margin: 0, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.username || "User"}</p>
                            <p style={{ color: "rgba(216,180,254,0.45)", fontSize: 11, margin: 0, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || "user@example.com"}</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ background: "rgba(252,165,165,0.07)" }}
                        onClick={() => { onClose(); onLogout?.(); }}
                        style={{
                            width: "100%", background: "transparent",
                            border: "1px solid rgba(252,165,165,0.12)", borderRadius: 12,
                            padding: "11px 12px",
                            display: "flex", alignItems: "center", gap: 10,
                            color: "rgba(252,165,165,0.6)", cursor: "pointer",
                            fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                            transition: "background 0.15s",
                        }}
                    >
                        <LogOut size={15} strokeWidth={1.7} />
                        Sign out
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ toggleSidebar }) => {
    const { user, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useBreakpoint();

    const [searchOpen,  setSearchOpen]  = useState(false);
    const [notifOpen,   setNotifOpen]   = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenu,  setMobileMenu]  = useState(false);

    // AI Meeting Recorder — informational Premium popup (shown only the
    // first time the user clicks the new tab; subsequent clicks navigate
    // directly). Owned at the Header level so both the desktop pill nav
    // and the mobile drawer route through the same popup instance.
    const meetingRecorderPopup = usePremiumPopup();

    const notifRef   = useRef(null);
    const profileRef = useRef(null);

    useOutsideClick(notifRef,   () => setNotifOpen(false));
    useOutsideClick(profileRef, () => setProfileOpen(false));

    useEffect(() => {
        const h = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
            if (e.key === "Escape") { setSearchOpen(false); setNotifOpen(false); setProfileOpen(false); setMobileMenu(false); }
        };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, []);

    const handleLogout = useCallback(() => { logout(); navigate("/login"); }, [logout, navigate]);

    // Hook for nav items flagged with `interceptClick`. Returning `true`
    // signals NavPill / MobileMenu to call e.preventDefault(). The popup
    // is shown ONLY the first time; subsequent clicks navigate directly.
    const handleNavIntercept = useCallback((link) => {
        if (link.to === MEETING_RECORDER_ROUTE) {
            return meetingRecorderPopup.requestOpen(() => {
                setMobileMenu(false);
                navigate(MEETING_RECORDER_ROUTE);
            });
        }
        return false;
    }, [meetingRecorderPopup, navigate]);

    // "Continue" → mark as seen and navigate to the recorder page.
    const handlePopupContinue = useCallback(() => {
        meetingRecorderPopup.dismiss();
        setMobileMenu(false);
        navigate(MEETING_RECORDER_ROUTE);
    }, [meetingRecorderPopup, navigate]);

    // "Maybe Later" / Escape / overlay click → just close, do NOT set the
    // seen flag so the popup re-appears next time. Matches the spec.
    const handlePopupMaybeLater = useCallback(() => {
        meetingRecorderPopup.close();
    }, [meetingRecorderPopup]);

    const initials = (user?.username || "U")
        .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

    const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;

    return (
        <>
            <header style={{
                position: "sticky", top: 0, zIndex: 50,
                width: "100%", height: 62,
                background: "rgba(25,6,65,0.75)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 12px 48px rgba(0,0,0,0.3)",
            }}>
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 1,
                    background: "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.9) 25%, rgba(236,72,153,0.7) 60%, rgba(99,102,241,0.6) 85%, transparent 100%)",
                    pointerEvents: "none",
                }} />

                <div style={{
                    display: "flex", alignItems: "center",
                    height: "100%",
                    padding: "0 18px",
                    gap: 10,
                    maxWidth: 1440,
                    margin: "0 auto",
                }}>

                    {/* ── LEFT ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <motion.div
                            whileHover={{ opacity: 0.9 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate("/dashboard")}
                            style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}
                        >
                            <div style={{
                                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(236,72,153,0.25))",
                                border: "1px solid rgba(168,85,247,0.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 0 20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
                            }}>
                                <BrainCircuit size={18} color="#e879f9" />
                            </div>
                            {!isMobile && (
                                <div>
                                    <p style={{
                                        fontFamily: "'Sora', sans-serif",
                                        fontWeight: 800, fontSize: 13.5, color: "#fff",
                                        margin: 0, lineHeight: 1.1, letterSpacing: "0.06em",
                                    }}>MEETMIND</p>
                                    <p style={{
                                        fontSize: 9, color: "rgba(216,180,254,0.5)",
                                        margin: 0, letterSpacing: "0.1em",
                                        textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif",
                                    }}>AI Learning</p>
                                </div>
                            )}
                        </motion.div>

                        {!isTablet && (
                            <>
                                <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.09)" }} />
                                <motion.div
                                    whileHover={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 5,
                                        padding: "5px 10px",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                        borderRadius: 8, cursor: "pointer",
                                        transition: "all 0.18s",
                                    }}
                                >
                                    <Hash size={11} color="rgba(255,255,255,0.35)" />
                                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>My Workspace</span>
                                    <ChevronDown size={11} color="rgba(255,255,255,0.28)" />
                                </motion.div>
                            </>
                        )}
                    </div>

                    {/* ── CENTER nav ── */}
                    {!isTablet && (
                        <nav style={{
                            flex: 1, display: "flex", alignItems: "center",
                            justifyContent: "center", gap: 1,
                        }}>
                            {NAV_LINKS.map(link => (
                                <NavPill
                                    key={link.to}
                                    link={link}
                                    onIntercept={handleNavIntercept}
                                />
                            ))}
                        </nav>
                    )}

                    {isTablet && <div style={{ flex: 1 }} />}

                    {/* ── RIGHT ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

                        {/* search */}
                        {!isMobile ? (
                            <motion.button
                                whileHover={{ borderColor: "rgba(168,85,247,0.35)", background: "rgba(255,255,255,0.07)" }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSearchOpen(true)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 10, padding: "7px 12px",
                                    color: "rgba(255,255,255,0.38)", cursor: "pointer",
                                    fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                                    transition: "all 0.18s", minWidth: 148,
                                }}
                            >
                                <Search size={12} />
                                <span>Search…</span>
                                <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                                    <kbd style={{
                                        fontSize: 10, background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: 4, padding: "1px 5px",
                                        color: "rgba(255,255,255,0.25)", fontFamily: "monospace",
                                    }}>⌘K</kbd>
                                </div>
                            </motion.button>
                        ) : (
                            <IconButton onClick={() => setSearchOpen(true)} title="Search">
                                <Search size={16} />
                            </IconButton>
                        )}

                        {/* ── THEME TOGGLE ── */}
                        <IconButton onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
                            {isDark
                                ? <Sun size={16} strokeWidth={1.8} color="#fbbf24" />
                                : <Moon size={16} strokeWidth={1.8} color="rgba(255,255,255,0.7)" />
                            }
                        </IconButton>

                        {/* notification bell */}
                        <div ref={notifRef} style={{ position: "relative" }}>
                            <IconButton
                                onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
                                badge={unreadCount > 0}
                                badgeCount={unreadCount}
                                title="Notifications"
                            >
                                <Bell size={16} strokeWidth={1.8} />
                            </IconButton>
                            <AnimatePresence>
                                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
                            </AnimatePresence>
                        </div>

                        {/* profile */}
                        <div ref={profileRef} style={{ position: "relative" }}>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: 7,
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.09)",
                                    borderRadius: 11, padding: "5px 8px 5px 5px",
                                    cursor: "pointer", transition: "border-color 0.18s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"}
                            >
                                <div style={{
                                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                    background: "linear-gradient(135deg,#a855f7,#ec4899)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", fontSize: 10.5, fontWeight: 700,
                                    fontFamily: "'Sora', sans-serif",
                                    boxShadow: "0 2px 10px rgba(168,85,247,0.45)",
                                }}>{initials}</div>
                                {!isMobile && (
                                    <span style={{
                                        fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)",
                                        fontFamily: "'DM Sans', sans-serif",
                                        maxWidth: 72, overflow: "hidden",
                                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>{user?.username || "User"}</span>
                                )}
                                <motion.div animate={{ rotate: profileOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={12} color="rgba(255,255,255,0.35)" />
                                </motion.div>
                            </motion.button>
                            <AnimatePresence>
                                {profileOpen && (
                                    <ProfileDropdown
                                        user={user}
                                        initials={initials}
                                        onLogout={handleLogout}
                                        onClose={() => setProfileOpen(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* mobile menu */}
                        {isMobile && (
                            <IconButton onClick={() => setMobileMenu(true)} title="Menu">
                                <Menu size={17} />
                            </IconButton>
                        )}

                        {/* tablet hamburger */}
                        {isTablet && !isMobile && (
                            <IconButton onClick={toggleSidebar} title="Sidebar">
                                <Menu size={17} />
                            </IconButton>
                        )}
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
            </AnimatePresence>
            <AnimatePresence>
                {mobileMenu && (
                    <MobileMenu
                        user={user}
                        initials={initials}
                        onLogout={handleLogout}
                        onClose={() => setMobileMenu(false)}
                        onIntercept={handleNavIntercept}
                    />
                )}
            </AnimatePresence>

            {/* ── AI Meeting Recorder — informational Premium popup ── */}
            <PremiumInfoPopup
                isOpen={meetingRecorderPopup.isOpen}
                onContinue={handlePopupContinue}
                onMaybeLater={handlePopupMaybeLater}
            />
        </>
    );
};

// ─── shared icon button ────────────────────────────────────────────────────────
const IconButton = ({ onClick, children, badge = false, badgeCount = 0, title }) => (
    <motion.button
        title={title}
        whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.93 }}
        onClick={onClick}
        style={{
            position: "relative",
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.7)", cursor: "pointer",
            transition: "background 0.18s, border-color 0.18s",
        }}
    >
        {children}
        {badge && (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                    position: "absolute", top: 6, right: 6,
                    minWidth: 8, height: 8, borderRadius: "50%",
                    background: "linear-gradient(135deg,#f472b6,#a855f7)",
                    border: "1.5px solid rgba(25,6,65,0.9)",
                    boxShadow: "0 0 8px rgba(244,114,182,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
            />
        )}
    </motion.button>
);

export default Header;