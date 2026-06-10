import React, { useState, useEffect } from "react";
import { useTheme } from '../../context/ThemeContext.jsx';
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { isDark } = useTheme();
    useEffect(() => {
    if (isDark) {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}, [isDark]);
    const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

    return (
        <div style={{
            display: "flex",
            height: "100vh",
            background: isDark ? "#0d0120" : "#efe8fb",
            color: isDark ? "#f1f5f9" : "#1a0533",
            overflow: "hidden",
            fontFamily: "'DM Sans', sans-serif",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
            `}</style>

            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                minWidth: 0,
            }}>
                <Header toggleSidebar={toggleSidebar} />
                <main style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "20px",
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;