import React, { useEffect, useState } from "react";
import axios from "axios";
import { Crown } from "lucide-react";
import RecordingControls from "../components/RecordingControls";
import RecordingsList from "../components/RecordingsList";
import { API_URL } from "../config";
import "../meetingRecorder.css";

// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — Dashboard page
// Logic is ported verbatim from Deploy-Whisper's Dashboard.jsx; the only
// changes are:
//   • wrapped in `.meeting-recorder-root` so the ported CSS stays scoped
//   • added a small feature header strip with a Premium pill so the page
//     reads as the Meeting Recorder (without redesigning the inner UI)
// ─────────────────────────────────────────────────────────────────────────────

function MeetingRecorderDashboardPage() {
    const [stats, setStats] = useState({ total: 0, completed: 0, recording: 0 });
    const [activeRecordingId, setActiveRecordingId] = useState(null);

    const fetchStats = () => {
        axios
            .get(`${API_URL}/api/recordings`)
            .then((res) => {
                const recs = res.data;
                setStats({
                    total: recs.length,
                    completed: recs.filter((r) => r.status === "completed")
                        .length,
                    recording: recs.filter((r) => r.status === "recording")
                        .length,
                });
            })
            .catch(() => {});
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleRecordingChange = (isRecording, recordingId) => {
        setActiveRecordingId(recordingId);
        setTimeout(fetchStats, 1000);
    };

    return (
        <div className="meeting-recorder-root">
            <div className="mr-feature-header">
                <span className="mr-premium-pill">
                    <Crown size={11} /> Premium · Free Preview
                </span>
            </div>

            <div className="dashboard">
                <div className="hero">
                    <span className="hero-badge">
                        AI-powered meeting assistant
                    </span>
                    <h1>Capture every conversation, effortlessly</h1>
                    <p className="dashboard-subtitle">
                        Whisper Voice AI listens to your meetings, transcribes
                        them in real time, and turns the conversation into
                        clear, actionable summaries.
                    </p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <p className="stat-label">Total meetings</p>
                        <p className="stat-value">{stats.total}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-label">Completed</p>
                        <p className="stat-value">{stats.completed}</p>
                    </div>
                    <div className="stat-card">
                        <p className="stat-label">In progress</p>
                        <p className="stat-value">{stats.recording}</p>
                    </div>
                </div>

                {/* ── Recording Controls — no extension needed ── */}
                <RecordingControls
                    onRecordingChange={handleRecordingChange}
                />

                <h2 className="dashboard-section-title">Your meetings</h2>
                <RecordingsList activeRecordingId={activeRecordingId} />
            </div>
        </div>
    );
}

export default MeetingRecorderDashboardPage;
