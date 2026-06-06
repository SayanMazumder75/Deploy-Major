
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const AppLayout = ({ children }) => {

    const [isSidebarOpen, setIsSidebarOpen] =
        useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (

        <div className="flex h-screen bg-[#efe8fb] text-neutral-900 overflow-hidden">

            {/* Sidebar */}
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
            />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">

                <Header
                    toggleSidebar={toggleSidebar}
                />

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-5">

                    {children}

                </main>

            </div>

        </div>

    );
};

export default AppLayout;

