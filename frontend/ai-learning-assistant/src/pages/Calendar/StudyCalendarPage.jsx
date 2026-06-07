import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
// CORRECT (go up two levels):
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const toDateStr = (date) => date.toISOString().split('T')[0];
const today = new Date();

const SUBJECT_COLORS = ['#8B5CF6','#EF4444','#10B981','#F59E0B','#3B82F6','#EC4899','#14B8A6','#F97316'];

// ─── Modal Component ──────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-all">✕</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudyCalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('month'); // month | week | analytics
    const [sessions, setSessions] = useState([]);
    const [exams, setExams] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Modals
    const [showAddSession, setShowAddSession] = useState(false);
    const [showAddExam, setShowAddExam] = useState(false);
    const [showSessionDetail, setShowSessionDetail] = useState(false);
    const [showGenerateSchedule, setShowGenerateSchedule] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    // Forms
    const [sessionForm, setSessionForm] = useState({ title: '', subject: '', date: '', startTime: '09:00', endTime: '10:00', duration: 60, priority: 'medium', color: '#8B5CF6', notes: '' });
    const [examForm, setExamForm] = useState({ subject: '', examDate: '', examType: 'final', priority: 'high', totalStudyHoursNeeded: 10, color: '#EF4444', notes: '' });
    const [scheduleForm, setScheduleForm] = useState({ availableHoursPerDay: 4, studyDaysPerWeek: 5, preferredStartTime: '09:00' });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // ── Fetch Data ────────────────────────────────────────────────────────────
    const fetchSessions = useCallback(async () => {
        try {
            const res = await axiosInstance.get(API_PATHS.CALENDAR.GET_SESSIONS, {
                params: { month: month + 1, year }
            });
            setSessions(res.data?.data || []);
        } catch (e) { console.error(e); }
    }, [month, year]);

    const fetchExams = useCallback(async () => {
        try {
            const res = await axiosInstance.get(API_PATHS.CALENDAR.GET_EXAMS);
            setExams(res.data?.data || []);
        } catch (e) { console.error(e); }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await axiosInstance.get(API_PATHS.CALENDAR.GET_ANALYTICS);
            setAnalytics(res.data?.data || null);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchSessions(); fetchExams(); fetchAnalytics(); }, [fetchSessions, fetchExams, fetchAnalytics]);

    // ── Auto-reschedule on load ───────────────────────────────────────────────
    useEffect(() => {
        axiosInstance.post(API_PATHS.CALENDAR.AUTO_RESCHEDULE).catch(() => {});
    }, []);

    // ── Session Actions ───────────────────────────────────────────────────────
    const handleAddSession = async () => {
        try {
            await axiosInstance.post(API_PATHS.CALENDAR.CREATE_SESSION, sessionForm);
            toast.success('Study session added!');
            setShowAddSession(false);
            setSessionForm({ title: '', subject: '', date: '', startTime: '09:00', endTime: '10:00', duration: 60, priority: 'medium', color: '#8B5CF6', notes: '' });
            fetchSessions();
        } catch (e) { toast.error('Failed to add session'); }
    };

    const handleMarkComplete = async (sessionId) => {
        try {
            await axiosInstance.patch(API_PATHS.CALENDAR.COMPLETE_SESSION(sessionId));
            toast.success('Session marked complete! 🎉');
            setShowSessionDetail(false);
            fetchSessions(); fetchAnalytics();
        } catch (e) { toast.error('Failed to update session'); }
    };

    const handleDeleteSession = async (sessionId) => {
        try {
            await axiosInstance.delete(API_PATHS.CALENDAR.DELETE_SESSION(sessionId));
            toast.success('Session deleted');
            setShowSessionDetail(false);
            fetchSessions();
        } catch (e) { toast.error('Failed to delete session'); }
    };

    const handleAddExam = async () => {
        try {
            await axiosInstance.post(API_PATHS.CALENDAR.CREATE_EXAM, examForm);
            toast.success('Exam added!');
            setShowAddExam(false);
            setExamForm({ subject: '', examDate: '', examType: 'final', priority: 'high', totalStudyHoursNeeded: 10, color: '#EF4444', notes: '' });
            fetchExams();
        } catch (e) { toast.error('Failed to add exam'); }
    };

    const handleGenerateSchedule = async () => {
        try {
            setGenerating(true);
            const res = await axiosInstance.post(API_PATHS.CALENDAR.GENERATE_SCHEDULE, scheduleForm);
            toast.success(`${res.data?.data?.length || 0} study sessions generated! 🎯`);
            setShowGenerateSchedule(false);
            fetchSessions();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to generate schedule');
        } finally { setGenerating(false); }
    };

    // ── Calendar Helpers ──────────────────────────────────────────────────────
    const getSessionsForDate = (dateStr) => sessions.filter(s => toDateStr(new Date(s.date)) === dateStr);
    const getExamsForDate = (dateStr) => exams.filter(e => toDateStr(new Date(e.examDate)) === dateStr);

    const handleDayClick = (dateStr) => {
        setSelectedDate(dateStr);
        setSessionForm(prev => ({ ...prev, date: dateStr }));
        setShowAddSession(true);
    };

    // ── Month Grid ────────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const todayStr = toDateStr(today);
        const cells = [];

        for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-28 bg-gray-50/50 rounded-xl" />);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const daySessions = getSessionsForDate(dateStr);
            const dayExams = getExamsForDate(dateStr);
            const isToday = dateStr === todayStr;
            const isPast = new Date(dateStr) < today && !isToday;

            cells.push(
                <div key={d}
                    className={`h-28 rounded-xl p-2 cursor-pointer border transition-all duration-200 hover:shadow-md ${isToday ? 'bg-violet-50 border-violet-300 shadow-sm' : isPast ? 'bg-gray-50/70 border-gray-100' : 'bg-white border-gray-100 hover:border-purple-200'}`}
                    onClick={() => handleDayClick(dateStr)}
                >
                    <div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-violet-500 text-white' : isPast ? 'text-gray-400' : 'text-gray-700'}`}>
                        {d}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                        {dayExams.map(exam => (
                            <div key={exam._id} className="text-xs px-1.5 py-0.5 rounded-md text-white font-medium truncate" style={{ backgroundColor: exam.color || '#EF4444' }}>
                                📝 {exam.subject}
                            </div>
                        ))}
                        {daySessions.slice(0, 2).map(s => (
                            <div key={s._id}
                                className="text-xs px-1.5 py-0.5 rounded-md text-white font-medium truncate cursor-pointer"
                                style={{ backgroundColor: s.status === 'completed' ? '#10B981' : s.status === 'missed' ? '#6B7280' : s.color }}
                                onClick={e => { e.stopPropagation(); setSelectedSession(s); setShowSessionDetail(true); }}
                            >
                                {s.status === 'completed' ? '✅' : s.status === 'missed' ? '❌' : '📚'} {s.title}
                            </div>
                        ))}
                        {daySessions.length > 2 && (
                            <div className="text-xs text-gray-400 pl-1">+{daySessions.length - 2} more</div>
                        )}
                    </div>
                </div>
            );
        }
        return cells;
    };

    // ── Week View ─────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });

        return (
            <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, i) => {
                    const dateStr = toDateStr(day);
                    const daySessions = getSessionsForDate(dateStr);
                    const dayExams = getExamsForDate(dateStr);
                    const isToday = dateStr === toDateStr(today);

                    return (
                        <div key={i} className={`min-h-48 rounded-2xl p-3 border ${isToday ? 'bg-violet-50 border-violet-300' : 'bg-white border-gray-100'}`}>
                            <div className={`text-center mb-2`}>
                                <div className="text-xs text-gray-500">{DAYS[i]}</div>
                                <div className={`text-lg font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-violet-500 text-white' : 'text-gray-700'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                {dayExams.map(exam => (
                                    <div key={exam._id} className="text-xs p-1.5 rounded-lg text-white font-medium" style={{ backgroundColor: exam.color }}>
                                        📝 {exam.subject}
                                    </div>
                                ))}
                                {daySessions.map(s => (
                                    <div key={s._id}
                                        className="text-xs p-1.5 rounded-lg text-white font-medium cursor-pointer hover:opacity-90"
                                        style={{ backgroundColor: s.status === 'completed' ? '#10B981' : s.status === 'missed' ? '#9CA3AF' : s.color }}
                                        onClick={() => { setSelectedSession(s); setShowSessionDetail(true); }}
                                    >
                                        <div>{s.startTime} - {s.endTime}</div>
                                        <div className="truncate">{s.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Analytics View ────────────────────────────────────────────────────────
    const renderAnalytics = () => {
        if (!analytics) return <div className="text-center py-20 text-gray-400">Loading analytics...</div>;

        const riskColors = { low: 'text-green-600', medium: 'text-yellow-600', high: 'text-red-600', critical: 'text-red-800' };
        const pred = analytics.performancePrediction;

        return (
            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Completion Rate', value: `${analytics.completionRate}%`, emoji: '✅', color: 'from-green-400 to-emerald-500' },
                        { label: 'Study Hours', value: `${analytics.totalStudyHours}h`, emoji: '⏱', color: 'from-blue-400 to-indigo-500' },
                        { label: 'Avg Quiz Score', value: `${analytics.avgQuizScore}%`, emoji: '📝', color: 'from-violet-400 to-purple-500' },
                        { label: 'Avg Viva Score', value: `${analytics.avgVivaScore}%`, emoji: '🎯', color: 'from-pink-400 to-rose-500' },
                    ].map(({ label, value, emoji, color }) => (
                        <div key={label} className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white shadow-lg`}>
                            <div className="text-3xl mb-2">{emoji}</div>
                            <div className="text-2xl font-bold">{value}</div>
                            <div className="text-sm opacity-80">{label}</div>
                        </div>
                    ))}
                </div>

                {/* ML Performance Prediction */}
                {pred && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 text-lg mb-4">🤖 ML Performance Prediction</h3>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <div className="text-5xl font-bold text-violet-600">{pred.predictedScore}%</div>
                                <div className="text-sm text-gray-500 mt-1">Predicted Score</div>
                                <div className="text-2xl font-bold mt-1">{pred.grade}</div>
                            </div>
                            <div className="flex-1">
                                <p className={`font-semibold ${riskColors[pred.risk]} mb-2`}>
                                    Risk Level: {pred.risk?.toUpperCase()}
                                </p>
                                <p className="text-gray-600 text-sm">{pred.message}</p>
                                <div className="mt-3 space-y-1">
                                    {Object.entries(pred.breakdown || {}).map(([key, val]) => (
                                        <div key={key} className="flex items-center gap-2 text-xs text-gray-500">
                                            <div className="w-2 h-2 rounded-full bg-violet-400" />
                                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}: {val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Session Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">📊 Session Breakdown</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Completed', value: analytics.completed, color: 'bg-green-500', total: analytics.totalSessions },
                                { label: 'Missed', value: analytics.missed, color: 'bg-red-400', total: analytics.totalSessions },
                                { label: 'Planned', value: analytics.totalSessions - analytics.completed - analytics.missed, color: 'bg-violet-400', total: analytics.totalSessions },
                            ].map(({ label, value, color, total }) => (
                                <div key={label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">{label}</span>
                                        <span className="font-semibold">{value}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${color} rounded-full transition-all`}
                                            style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weak Topics */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">⚠️ Topics to Revise</h3>
                        {analytics.weakTopics?.length > 0 ? (
                            <div className="space-y-2">
                                {analytics.weakTopics.map((topic, i) => (
                                    <div key={i} className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                        <span className="text-red-500">•</span>
                                        <span className="text-sm text-gray-700">{topic}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">No weak topics detected yet. Complete some viva sessions!</p>
                        )}
                    </div>
                </div>

                {/* Subject breakdown */}
                {Object.keys(analytics.subjectBreakdown || {}).length > 0 && (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">📚 Study Hours by Subject</h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.subjectBreakdown).map(([subject, hours], i) => (
                                <div key={subject}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700 font-medium">{subject}</span>
                                        <span className="text-gray-500">{Math.round(hours * 10) / 10}h</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min((hours / 20) * 100, 100)}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">📅 Smart Study Calendar</h1>
                        <p className="text-gray-500 mt-1 text-sm">AI-powered study planner with ML performance predictions</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setShowAddExam(true)}
                            className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all shadow-sm">
                            + Add Exam
                        </button>
                        <button onClick={() => setShowAddSession(true)}
                            className="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-all shadow-sm">
                            + Add Session
                        </button>
                        <button onClick={() => setShowGenerateSchedule(true)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold hover:scale-105 transition-all shadow-md">
                            🤖 AI Generate Schedule
                        </button>
                    </div>
                </div>

                {/* Upcoming Exams Strip */}
                {exams.filter(e => new Date(e.examDate) >= today).length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
                        {exams.filter(e => new Date(e.examDate) >= today).slice(0, 5).map(exam => {
                            const daysLeft = Math.ceil((new Date(exam.examDate) - today) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={exam._id} className="flex-shrink-0 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-md flex items-center gap-2" style={{ backgroundColor: exam.color }}>
                                    <span>📝 {exam.subject}</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                        {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* View Tabs */}
                <div className="bg-white rounded-2xl p-1 flex gap-1 mb-6 shadow-sm border border-gray-100 w-fit">
                    {[['month', '📅 Month'], ['week', '📆 Week'], ['analytics', '📊 Analytics']].map(([v, label]) => (
                        <button key={v} onClick={() => setView(v)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${view === v ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Navigation */}
                {view !== 'analytics' && (
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => {
                            const d = new Date(currentDate);
                            view === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
                            setCurrentDate(d);
                        }} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-purple-300 transition-all font-semibold">
                            ← Prev
                        </button>
                        <h2 className="text-xl font-bold text-gray-800">
                            {view === 'month' ? `${MONTHS[month]} ${year}` : `Week of ${currentDate.toLocaleDateString()}`}
                        </h2>
                        <button onClick={() => {
                            const d = new Date(currentDate);
                            view === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
                            setCurrentDate(d);
                        }} className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-purple-300 transition-all font-semibold">
                            Next →
                        </button>
                    </div>
                )}

                {/* Calendar Grid */}
                {view === 'month' && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <div className="grid grid-cols-7 gap-2 mb-3">
                            {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase py-1">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-2">{renderMonthView()}</div>
                    </div>
                )}

                {view === 'week' && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        {renderWeekView()}
                    </div>
                )}

                {view === 'analytics' && renderAnalytics()}

                {/* Legend */}
                {view !== 'analytics' && (
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                        {[['#8B5CF6', 'Planned'], ['#10B981', 'Completed'], ['#9CA3AF', 'Missed'], ['#EF4444', 'Exam Day']].map(([color, label]) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                {label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add Session Modal ── */}
            <Modal isOpen={showAddSession} onClose={() => setShowAddSession(false)} title="📚 Add Study Session">
                <div className="space-y-4">
                    {[
                        { label: 'Title', key: 'title', type: 'text', placeholder: 'e.g. Study IoT Chapter 3' },
                        { label: 'Subject', key: 'subject', type: 'text', placeholder: 'e.g. IoT, Networks, DBMS' },
                        { label: 'Date', key: 'date', type: 'date' },
                        { label: 'Start Time', key: 'startTime', type: 'time' },
                        { label: 'End Time', key: 'endTime', type: 'time' },
                    ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                            <input type={type} placeholder={placeholder} value={sessionForm[key]}
                                onChange={e => setSessionForm(p => ({ ...p, [key]: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
                        </div>
                    ))}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select value={sessionForm.priority} onChange={e => setSessionForm(p => ({ ...p, priority: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {SUBJECT_COLORS.map(c => (
                                <button key={c} onClick={() => setSessionForm(p => ({ ...p, color: c }))}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${sessionForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                        <textarea value={sessionForm.notes} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Optional notes..." rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm resize-none" />
                    </div>
                    <button onClick={handleAddSession}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold hover:scale-105 transition-all shadow-lg">
                        Add Session
                    </button>
                </div>
            </Modal>

            {/* ── Add Exam Modal ── */}
            <Modal isOpen={showAddExam} onClose={() => setShowAddExam(false)} title="📝 Add Exam">
                <div className="space-y-4">
                    {[
                        { label: 'Subject', key: 'subject', type: 'text', placeholder: 'e.g. IoT, Networks' },
                        { label: 'Exam Date', key: 'examDate', type: 'date' },
                        { label: 'Study Hours Needed', key: 'totalStudyHoursNeeded', type: 'number', placeholder: '10' },
                    ].map(({ label, key, type, placeholder }) => (
                        <div key={key}>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                            <input type={type} placeholder={placeholder} value={examForm[key]}
                                onChange={e => setExamForm(p => ({ ...p, [key]: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm" />
                        </div>
                    ))}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Type</label>
                        <select value={examForm.examType} onChange={e => setExamForm(p => ({ ...p, examType: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400 text-sm">
                            {['midterm', 'final', 'quiz', 'assignment', 'viva', 'other'].map(t => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select value={examForm.priority} onChange={e => setExamForm(p => ({ ...p, priority: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm">
                            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                        <textarea value={examForm.notes} onChange={e => setExamForm(p => ({ ...p, notes: e.target.value }))}
                            placeholder="Optional..." rows={2}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none" />
                    </div>
                    <button onClick={handleAddExam}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:scale-105 transition-all shadow-lg">
                        Add Exam
                    </button>
                </div>
            </Modal>

            {/* ── Session Detail Modal ── */}
            <Modal isOpen={showSessionDetail} onClose={() => setShowSessionDetail(false)} title="📚 Session Details">
                {selectedSession && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl text-white" style={{ backgroundColor: selectedSession.color }}>
                            <h3 className="font-bold text-lg">{selectedSession.title}</h3>
                            <p className="text-sm opacity-90">{selectedSession.subject}</p>
                            <p className="text-sm opacity-80 mt-1">{new Date(selectedSession.date).toDateString()} · {selectedSession.startTime} - {selectedSession.endTime}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedSession.status === 'completed' ? 'bg-green-100 text-green-700' : selectedSession.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-violet-100 text-violet-700'}`}>
                                {selectedSession.status}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                {selectedSession.priority} priority
                            </span>
                            {selectedSession.aiGenerated && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">🤖 AI Generated</span>}
                        </div>
                        {selectedSession.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">{selectedSession.notes}</p>}
                        <div className="flex gap-3 pt-2">
                            {selectedSession.status === 'planned' && (
                                <button onClick={() => handleMarkComplete(selectedSession._id)}
                                    className="flex-1 py-3 rounded-2xl bg-green-500 text-white font-bold hover:bg-green-600 transition-all">
                                    ✅ Mark Complete
                                </button>
                            )}
                            <button onClick={() => handleDeleteSession(selectedSession._id)}
                                className="flex-1 py-3 rounded-2xl bg-red-100 text-red-600 font-bold hover:bg-red-200 transition-all">
                                🗑 Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Generate Schedule Modal ── */}
            <Modal isOpen={showGenerateSchedule} onClose={() => setShowGenerateSchedule(false)} title="🤖 AI Generate Study Schedule">
                <div className="space-y-4">
                    <div className="p-4 bg-violet-50 rounded-2xl border border-violet-200 text-sm text-violet-700">
                        The AI will create a personalized study schedule based on your exams and performance data. Make sure you have added your exams first!
                    </div>
                    {[
                        { label: 'Available Study Hours Per Day', key: 'availableHoursPerDay', type: 'number', min: 1, max: 12 },
                        { label: 'Study Days Per Week', key: 'studyDaysPerWeek', type: 'number', min: 1, max: 7 },
                    ].map(({ label, key, type, min, max }) => (
                        <div key={key}>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                            <input type={type} min={min} max={max} value={scheduleForm[key]}
                                onChange={e => setScheduleForm(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
                        </div>
                    ))}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Start Time</label>
                        <input type="time" value={scheduleForm.preferredStartTime}
                            onChange={e => setScheduleForm(p => ({ ...p, preferredStartTime: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm" />
                    </div>
                    <button onClick={handleGenerateSchedule} disabled={generating}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        {generating ? '🤖 Generating...' : '🚀 Generate My Schedule'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default StudyCalendarPage;
