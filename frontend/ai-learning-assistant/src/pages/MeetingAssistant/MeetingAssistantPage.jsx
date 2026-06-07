import React, { useState } from "react";
import Spinner from "../../components/common/Spinner";
import { Mic, Sparkles, FileText, Languages, BrainCircuit } from "lucide-react";

const featureItems = [
  "Live Translation",
  "Meeting Notes",
  "Transcript Export",
  "AI Learning Support",
];

const MeetingAssistantPage = () => {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="min-h-full w-full px-0 pb-2 md:pb-0">
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-r from-violet-600 via-purple-600 to-fuchsia-500 p-6 md:p-8 shadow-2xl shadow-purple-300/40">
        <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-pink-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg backdrop-blur-xl">
                <Mic className="h-7 w-7" />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                Native assistant
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              AI Meeting Assistant
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-purple-100 md:text-base">
              Real-time meeting transcription, translation and learning assistant
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl sm:grid-cols-2 xl:min-w-105">
            {featureItems.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Languages className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="rounded-3xl border border-purple-100 bg-white/80 p-5 shadow-xl shadow-purple-100/50 backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-purple-300/40">
              <BrainCircuit className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-violet-900">
                Embedded live meeting experience
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Stay inside MEETMIND while your translator runs natively below.
                The assistant loads in place, so meetings, notes and learning support all stay connected.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-purple-100 bg-white/80 p-5 shadow-xl shadow-purple-100/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-900">Smooth loading</p>
              <p className="text-xs leading-5 text-slate-500">
                Spinner visible until the embedded assistant is ready.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-purple-100 bg-white/70 p-3 shadow-2xl shadow-purple-100/60 backdrop-blur-xl md:p-4">
        <div className="relative overflow-hidden rounded-[20px] bg-slate-100">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/95 px-6 text-center backdrop-blur-sm">
              <Spinner />
              <p className="text-sm font-medium text-violet-700">
                Loading AI Meeting Assistant...
              </p>
            </div>
          )}

          <iframe
            title="AI Meeting Assistant"
            src="https://speechtotext-sepia-nine.vercel.app/"
            className="h-[calc(100vh-14rem)] min-h-160 w-full rounded-[20px] border-0 bg-white md:h-[calc(100vh-12rem)]"
            onLoad={() => setIframeLoaded(true)}
            loading="eager"
            allow="microphone; clipboard-read; clipboard-write; display-capture"
          />
        </div>
      </div>
    </div>
  );
};

export default MeetingAssistantPage;