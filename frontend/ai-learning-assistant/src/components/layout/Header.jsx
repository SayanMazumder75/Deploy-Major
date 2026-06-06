
import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    Bell,
    User,
    Menu
} from "lucide-react";

const Header = ({ toggleSidebar }) => {

    const { user } = useAuth();

    return (

        <header className="sticky top-0 z-40 w-full h-16 bg-gradient-to-r from-[#581c87] via-[#6d28d9] to-[#7e22ce] shadow-md">

            <div className="flex items-center justify-between h-full px-6">

                {/* Mobile Menu */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden text-white"
                >
                    <Menu size={24} />
                </button>

                <div className="hidden md:block" />

                <div className="flex items-center gap-4">

                    {/* Notification */}
                    <button className="relative w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center text-white">

                        <Bell size={20} />

                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-400" />

                    </button>

                    {/* User */}
                    <div className="flex items-center gap-3">

                        <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-white">

                            <User size={18} />

                        </div>

                        <div>

                            <p className="text-sm font-semibold text-white">
                                {user?.username || 'User'}
                            </p>

                            <p className="text-xs text-purple-100">
                                {user?.email || 'user@example.com'}
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </header>

    );
};

export default Header;

