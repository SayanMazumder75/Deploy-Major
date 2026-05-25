import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Bell, User, Menu } from 'lucide-react'

const Header = ({ toggleSidebar }) => {

    const { user } = useAuth();

    return (

        <header className="sticky top-0 z-40 w-full h-16 bg-gradient-to-r from-[#581c87] via-[#6d28d9] to-[#7e22ce] backdrop-blur-xl border-b border-white/10 shadow-lg">

            <div className="flex items-center justify-between h-full px-6">

                {/* Mobile Menu Button */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden inline-flex items-center justify-center w-10 h-10 text-white hover:bg-white/10 rounded-xl transition-all duration-200"
                    aria-label="Toggle sidebar"
                >

                    <Menu size={24} />

                </button>

                <div className="hidden md:block"></div>

                <div className="flex items-center gap-3">

                    {/* Notification */}
                    <button className="relative inline-flex items-center justify-center w-10 h-10 text-white hover:bg-white/10 rounded-xl transition-all duration-200 group">

                        <Bell
                            size={20}
                            strokeWidth={2}
                            className="group-hover:scale-110 transition-transform duration-200"
                        />

                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-400 rounded-full ring-2 ring-purple-900"></span>

                    </button>

                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-3 border-l border-white/10">

                        <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer group">

                            {/* User Icon */}
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-all duration-200">

                                <User size={18} strokeWidth={2.5} />

                            </div>

                            {/* User Info */}
                            <div>

                                <p className="text-sm font-semibold text-white">
                                    {user?.username || 'User'}
                                </p>

                                <p className="text-xs text-purple-200">
                                    {user?.email || 'user@example.com'}
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </header>

    );
};

export default Header;