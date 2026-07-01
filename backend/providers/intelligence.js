// ─────────────────────────────────────────────────────────────────────────────
// providers/intelligence
//
// V4: dedicated provider chain for the AI Document Intelligence module.
//
//   NVIDIA  →  Gemini  →  Groq  →  OpenRouter
//
// V3 deliberately excluded Gemini here to avoid burning its free-tier quota
// across 20–30+ calls per generation. V4 brings Gemini back in because the
// chain no longer permanently disables a provider after one 429 — Gemini
// (and every other provider) now just takes a short, per-provider cooldown
// (see ./chain.js), so including it only helps: it's one more fallback
// available the moment Groq is cooling down, instead of one more quota to
// burn through with no way back in.
// ─────────────────────────────────────────────────────────────────────────────

import { createProviderChain } from './chain.js';
import { NvidiaProvider } from './NvidiaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';

export const intelligenceChain = createProviderChain(
    [new NvidiaProvider(), new GeminiProvider(), new GroqProvider(), new OpenRouterProvider()],
    { name: 'AI Intelligence' }
);

export const getIntelligenceChainStatus = () => intelligenceChain.getStatus();
