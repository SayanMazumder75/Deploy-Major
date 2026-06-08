import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = ({ children }) => {
    // mobile drawer state only; desktop collapse is internal to Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                background: "#efe8fb",
                color: "#1a0533",
                overflow: "hidden",
                fontFamily: "'DM Sans', sans-serif",
            }}
        >
            {/* Google Fonts */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');

                /* custom scrollbar for sidebar nav */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
            `}</style>

            

            {/* Main content area */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    minWidth: 0,
                }}
            >
                <Header toggleSidebar={toggleSidebar} />

                <main
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        padding: "20px",
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;