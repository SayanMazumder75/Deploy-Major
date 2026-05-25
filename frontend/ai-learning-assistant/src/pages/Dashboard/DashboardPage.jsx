import React, { useState, useEffect } from 'react';
import Spinner from '../../components/common/Spinner';
import progressService from '../../services/progressService';
import toast from 'react-hot-toast';

import {
    FileText,
    BookOpen,
    BrainCircuit,
    TrendingUp,
    Clock
} from 'lucide-react';

const DashboardPage = () => {

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const fetchDashboardData = async () => {

            try {

                const data = await progressService.getDashboardData();
                setDashboardData(data.data);

            } catch (error) {

                toast.error('Failed to fetch dashboard data.');
                console.error(error);

            } finally {

                setLoading(false);

            }
        };

        fetchDashboardData();

    }, []);

    if (loading) {
        return <Spinner />;
    }

    if (!dashboardData || !dashboardData.overview) {

        return (

            <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-[#faf5ff] to-[#fdf2f8] flex items-center justify-center">

                <div className="text-center">

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl mb-4">

                        <TrendingUp className="w-8 h-8 text-white" />

                    </div>

                    <p className="text-purple-700 text-sm font-medium">
                        No dashboard data available.
                    </p>

                </div>

            </div>
        );
    }

    const stats = [

        {
            label: 'Total Documents',
            value: dashboardData.overview.totalDocuments,
            icon: FileText,
            gradient: 'from-indigo-500 to-purple-600',
            shadowColor: 'shadow-purple-500/30'
        },

        {
            label: 'Total Flashcards',
            value: dashboardData.overview.totalFlashcards,
            icon: BookOpen,
            gradient: 'from-pink-500 to-rose-500',
            shadowColor: 'shadow-pink-500/30'
        },

        {
            label: 'Total Quizzes',
            value: dashboardData.overview.totalQuizzes,
            icon: BrainCircuit,
            gradient: 'from-violet-500 to-fuchsia-600',
            shadowColor: 'shadow-violet-500/30'
        }
    ];

    return (

        <div className="min-h-screen bg-gradient-to-br from-[#d8b4fe] via-[#c4b5fd] to-[#f0abfc] relative overflow-hidden p-6">

            {/* Background Glow Effects */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl"></div>

            <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-300/20 rounded-full blur-3xl"></div>

            <div className="relative max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-10">

                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-700 via-violet-600 to-pink-500 bg-clip-text text-transparent tracking-tight mb-3">

                        Dashboard

                    </h1>

                    <p className="text-purple-600 text-base font-medium">
                        Track your learning progress and activity
                    </p>

                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mb-8">

                    {stats.map((stat, index) => (

                        <div
                            key={index}
                            className="group bg-white/70 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-xl p-7 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
                        >

                            <div className="flex items-center justify-between mb-7">

                                <div>

                                    <p className="text-xs font-bold uppercase tracking-[2px] text-purple-500 mb-3">
                                        {stat.label}
                                    </p>

                                    <h2 className="text-5xl font-bold text-slate-800">
                                        {stat.value}
                                    </h2>

                                </div>

                                <div
                                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-2xl ${stat.shadowColor} flex items-center justify-center group-hover:scale-110 transition-all duration-300`}
                                >

                                    <stat.icon className="w-7 h-7 text-white" />

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

                {/* Recent Activity */}
                <div className="bg-white/70 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-xl p-8">

                    <div className="flex items-center gap-4 mb-8">

                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center">

                            <Clock className="w-7 h-7 text-white" />

                        </div>

                        <div>

                            <h3 className="text-3xl font-bold text-purple-900">
                                Recent Activity
                            </h3>

                            <p className="text-sm text-purple-500">
                                Your latest learning activities
                            </p>

                        </div>

                    </div>

                    {(dashboardData.recentActivity &&
                        (dashboardData.recentActivity.documents.length > 0 ||
                            dashboardData.recentActivity.quizzes.length > 0)) ? (

                        <div className="space-y-4">

                            {[
                                ...(dashboardData.recentActivity.documents || []).map(doc => ({
                                    id: doc._id,
                                    description: doc.title,
                                    timestamp: doc.lastAccessed,
                                    link: `/documents/${doc._id}`,
                                    type: 'document'
                                })),

                                ...(dashboardData.recentActivity.quizzes || []).map(quiz => ({
                                    id: quiz._id,
                                    description: quiz.title,
                                    timestamp: quiz.lastAttempted,
                                    link: `/quizzes/${quiz._id}`,
                                    type: 'quiz'
                                }))
                            ]

                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

                                .map((activity, index) => (

                                    <div
                                        key={activity.id || index}
                                        className="group flex items-center justify-between p-5 rounded-2xl bg-white/60 border border-purple-100 hover:bg-white hover:shadow-lg transition-all duration-300"
                                    >

                                        <div className="flex items-center gap-4 flex-1 min-w-0">

                                            <div
                                                className={`w-3 h-3 rounded-full ${activity.type === 'document'
                                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                                        : 'bg-gradient-to-r from-pink-500 to-rose-500'
                                                    }`}
                                            ></div>

                                            <p className="text-sm font-semibold text-slate-800 truncate">

                                                {activity.type === 'document'
                                                    ? 'Accessed Document: '
                                                    : 'Attempted Quiz: '}

                                                <span className="text-purple-700">
                                                    {activity.description}
                                                </span>

                                            </p>

                                        </div>

                                        <p className="text-xs text-purple-500 hidden md:block">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>

                                        {activity.link && (

                                            <a
                                                href={activity.link}
                                                className="ml-4 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-xl hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap"
                                            >

                                                View

                                            </a>

                                        )}

                                    </div>

                                ))}

                        </div>

                    ) : (

                        <div className="text-center py-14">

                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl mb-5">

                                <Clock className="w-9 h-9 text-white" />

                            </div>

                            <p className="text-lg font-semibold text-purple-700">
                                No recent activity yet.
                            </p>

                            <p className="text-sm text-purple-500 mt-2">
                                Start learning to see your progress here
                            </p>

                        </div>

                    )}

                </div>

            </div>

        </div>

    );
};

export default DashboardPage;