import React from "react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
    LayoutDashboard,
    FileText,
    User,
    LogOut,
    BrainCircuit,
    BookOpen,
    X,
} from "lucide-react";

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {

    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navLinks = [
        { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' },
        { to: '/documents', icon: FileText, text: 'Documents' },
        { to: '/flashcards', icon: BookOpen, text: 'Flashcards' },
        { to: '/profile', icon: User, text: 'Profile' },
    ];

    return (

        <>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={toggleSidebar}
                aria-hidden="true"
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-[#581c87] via-[#6d28d9] to-[#7e22ce] border-r border-white/10 shadow-2xl z-50 md:relative md:w-64 md:shrink-0 md:flex md:flex-col md:translate-x-0 transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >

                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">

                    <div className="flex items-center gap-3">

                        <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30">

                            <BrainCircuit
                                className="text-white"
                                size={22}
                                strokeWidth={2.5}
                            />

                        </div>

                        <h1 className="text-sm md:text-base font-bold text-white tracking-tight">

                            AI Learning Assistant

                        </h1>

                    </div>

                    {/* Mobile Close */}
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden text-purple-200 hover:text-white transition-colors duration-200"
                    >

                        <X size={24} />

                    </button>

                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-2">

                    {navLinks.map((link) => (

                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={toggleSidebar}
                            className={({ isActive }) =>
                                `group flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                                    isActive
                                        ? 'bg-white/15 text-white shadow-lg backdrop-blur-lg'
                                        : 'text-purple-100 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >

                            {({ isActive }) => (

                                <>

                                    <link.icon
                                        size={19}
                                        strokeWidth={2.5}
                                        className={`transition-transform duration-300 ${
                                            isActive
                                                ? 'scale-110'
                                                : 'group-hover:scale-110'
                                        }`}
                                    />

                                    {link.text}

                                </>

                            )}

                        </NavLink>

                    ))}

                </nav>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-white/10">

                    <button
                        onClick={handleLogout}
                        className="group flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-purple-100 hover:bg-red-500/20 hover:text-white rounded-2xl transition-all duration-300"
                    >

                        <LogOut
                            size={18}
                            strokeWidth={2.5}
                            className="transition-transform duration-300 group-hover:scale-110"
                        />

                        Logout

                    </button>

                </div>

            </aside>

        </>

    );
};

export default Sidebar;