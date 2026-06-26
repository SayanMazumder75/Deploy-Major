import React, { useState } from "react";
import { Radio, Sparkles, Crown } from "lucide-react";
import Spinner from "../../../components/common/Spinner";
import { MEETING_RECORDER_URL } from "../config";

// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — embedded page
//
// Mirrors the layout of MeetingAssistantPage: a hero strip + an iframe that
// hosts the full standalone recorder application. The Quick-Start onboarding
// guide that the assistant page renders has been intentionally omitted —
// per spec, this page shows the recorder site and nothing else around it.
//
// The recorder's own UI (recording, video upload, streaming, live
// transcription, AI summary, key points, action items, English / Hindi /
// Bengali summary generation) runs inside the iframe exactly as it does in
// the standalone deployment. No business logic is duplicated or modified.
// ─────────────────────────────────────────────────────────────────────────────

const featureItems = [
    "Live AI Transcription",
    "AI Meeting Summary",
    "Key Points & Action Items",
    "EN / HI / BN Summaries",
];

const MeetingRecorderDashboardPage = () => {
    const [iframeLoaded, setIframeLoaded] = useState(false);

    return (
        <div className="min-h-full w-full px-0 pb-2 md:pb-0">
            {/* ── HERO ── */}
            <div className="relative overflow-hidden rounded-[28px] bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-500 p-6 md:p-8 shadow-2xl shadow-purple-300/40">
                <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-pink-300/20 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur-xl">
                                <Radio className="h-7 w-7" />
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
                                <Sparkles className="h-4 w-4" />
                                Free preview
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-linear-to-r from-amber-400/30 to-pink-400/30 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-100 backdrop-blur-md">
                                <Crown className="h-3 w-3" />
                                Premium
                            </div>
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                            AI Meeting Recorder
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-purple-100 md:text-base">
                            Record meetings, get a live AI transcript, then
                            instant summaries, key points and action items in
                            English, Hindi or Bengali.
                        </p>
                    </div>

                    <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl sm:grid-cols-2 xl:min-w-105">
                        {featureItems.map((feature) => (
                            <div
                                key={feature}
                                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-medium">
                                    {feature}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── IFRAME — the only thing on this page besides the hero ── */}
            <div className="mt-6 rounded-[28px] border border-purple-100 bg-white/70 p-3 shadow-2xl shadow-purple-100/60 backdrop-blur-xl md:p-4">
                <div className="relative overflow-hidden rounded-[20px] bg-slate-100">
                    {!iframeLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/95 px-6 text-center backdrop-blur-sm">
                            <Spinner />
                            <p className="text-sm font-medium text-violet-700">
                                Loading AI Meeting Recorder...
                            </p>
                        </div>
                    )}
                    <iframe
                        title="AI Meeting Recorder"
                        src={MEETING_RECORDER_URL}
                        onLoad={() => setIframeLoaded(true)}
                        loading="eager"
                        allow="microphone; camera; display-capture; clipboard-read; clipboard-write; autoplay"
                        className="h-[calc(100vh-14rem)] min-h-160 w-full rounded-[20px] border-0 bg-white md:h-[calc(100vh-12rem)]"
                    />
                </div>
            </div>
        </div>
    );
};

export default MeetingRecorderDashboardPage;
