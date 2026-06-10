import React, { useState, useEffect } from 'react';
import Spinner from '../../components/common/Spinner';
import progressService from '../../services/progressService';
import toast from 'react-hot-toast';
import { FileText, BookOpen, BrainCircuit, TrendingUp, Clock } from 'lucide-react';

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

    if (loading) return <Spinner />;

    if (!dashboardData || !dashboardData.overview) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600 text-white mb-4">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">No dashboard data available</p>
                </div>
            </div>
        );
    }

    const stats = [
        { label: 'TOTAL DOCUMENTS', value: dashboardData.overview.totalDocuments, icon: FileText, bg: 'bg-violet-500' },
        { label: 'TOTAL FLASHCARDS', value: dashboardData.overview.totalFlashcards, icon: BookOpen, bg: 'bg-pink-500' },
        { label: 'TOTAL QUIZZES', value: dashboardData.overview.totalQuizzes, icon: BrainCircuit, bg: 'bg-purple-500' },
    ];

    return (
        <div>
            {/* Heading */}
            <div className="mb-6">
                <h1 className="text-4xl font-bold text-[#5d19c4] dark:text-purple-400">
                    Dashboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Track your learning progress and activity
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-[#13102a] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#2d2a4a]"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold tracking-wide mb-3">
                                    {stat.label}
                                </p>
                                <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                                    {stat.value}
                                </h2>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center text-white`}>
                                <stat.icon size={26} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#13102a] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-[#2d2a4a]">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                            Recent Activity
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Your latest learning activity
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
                                    className="flex items-center justify-between bg-[#f9f6ff] dark:bg-[#1a0a3a] dark:border dark:border-purple-800/40 rounded-2xl px-5 py-4"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {activity.type === 'document' ? 'Accessed Document' : 'Attempted Quiz'}
                                        </p>
                                        <p className="text-sm text-[#5d19c4] dark:text-purple-400 font-semibold mt-1">
                                            {activity.description}
                                        </p>
                                    </div>
                                    {activity.link && (
                                        <a href={activity.link} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm">
                                            View
                                        </a>
                                    )}
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">No recent activity yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;