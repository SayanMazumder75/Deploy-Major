
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
    LayoutDashboard,
    FileText,
    User,
    LogOut,
    BookOpen,
    Brain,
    BrainCircuit,
    X,
} from "lucide-react";

const Sidebar = ({
    isSidebarOpen,
    toggleSidebar,
}) => {

    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = [
        {
            to: "/dashboard",
            icon: LayoutDashboard,
            text: "Dashboard",
        },
        {
            to: "/documents",
            icon: FileText,
            text: "Documents",
        },
        {
            to: "/flashcards",
            icon: BookOpen,
            text: "Flashcards",
        },
        {
            to: "/study-vault",
            icon: Brain,
            text: "Study Vault",
        },
        {
            to: "/profile",
            icon: User,
            text: "Profile",
        },
    ];

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-all duration-300 ${
                    isSidebarOpen
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                }`}
                onClick={toggleSidebar}
            />

            <aside
                className={`fixed top-0 left-0 h-full w-[260px] z-50 md:relative md:translate-x-0 transition-transform duration-300 ${
                    isSidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full"
                }`}
            >

                <div className="h-full flex flex-col bg-gradient-to-b from-[#5d19c4] via-[#6b21c8] to-[#7e22ce] text-white">

                    {/* Logo */}
                    <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">

                        <div className="flex items-center gap-3">

                            <div className="w-12 h-12 rounded-2xl bg-pink-400/20 flex items-center justify-center">

                                <BrainCircuit size={22} />

                            </div>

                            <div>

                                <h1 className="font-bold text-lg">
                                    MEETMIND
                                </h1>

                                <p className="text-xs text-purple-100">
                                    AI Learning
                                </p>

                            </div>

                        </div>

                        <button
                            onClick={toggleSidebar}
                            className="md:hidden"
                        >
                            <X size={20} />
                        </button>

                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-5 space-y-2">

                        {navLinks.map((link) => (

                            <NavLink
                                key={link.to}
                                to={link.to}
                                onClick={toggleSidebar}
                                className={({ isActive }) =>
                                    `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                                        isActive
                                            ? "bg-white/20 text-white"
                                            : "text-purple-100 hover:bg-white/10"
                                    }`
                                }
                            >

                                <link.icon size={20} />

                                <span>
                                    {link.text}
                                </span>

                            </NavLink>

                        ))}

                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-white/10">

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-white/10 transition-all"
                        >

                            <LogOut size={20} />

                            Logout

                        </button>

                    </div>

                </div>

            </aside>
        </>
    );
};

export default Sidebar;

