// ─────────────────────────────────────────────────────────────────────────────
// providers/intelligence
//
// V3: dedicated provider chain for the AI Document Intelligence module.
//
//   NVIDIA  →  Groq  →  OpenRouter
//
// Gemini is DELIBERATELY EXCLUDED from this chain (per the V3 spec). The
// rest of the app continues to use Gemini through `providers/index.js`'s
// default chain — we just don't route AI Intelligence traffic through it,
// because:
//   - Intelligence makes 20–30+ calls per generation; Gemini's free-tier
//     quota burns out quickly and the resulting fallbacks slow generation
//     and pollute logs.
//   - The other modules (flashcards-from-document, chat, viva tutor, etc.)
//     issue at most a handful of calls per request, so Gemini's quota
//     comfortably covers them.
//
// If Gemini is ever needed inside this module again, swap `IntelligencePChain`
// out for the default chain — every service consuming it accepts a chain
// via parameter, so the only change is at the call site.
// ─────────────────────────────────────────────────────────────────────────────

import { createProviderChain } from './chain.js';
import { NvidiaProvider } from './NvidiaProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';

// Constructed once at module load. None of the provider constructors fire
// real network calls — clients are built lazily on first use inside each
// provider, so this is essentially free.
export const intelligenceChain = createProviderChain(
    [new NvidiaProvider(), new GroqProvider(), new OpenRouterProvider()],
    { name: 'AI Intelligence' }
);

export const getIntelligenceChainStatus = () => intelligenceChain.getStatus();
