// ─────────────────────────────────────────────────────────────────────────────
// providers/index — DEFAULT (global) chain
//
// V3: this file used to host both the chain logic AND the provider order.
// As of V3 the chain logic lives in ./chain.js (factory) and we just wire
// the global default chain here:
//
//   NVIDIA  →  Gemini Flash  →  Groq  →  OpenRouter
//
// This is the chain every OTHER module of the app uses. The AI Document
// Intelligence module uses a SEPARATE chain (./intelligence.js) that
// deliberately skips Gemini — see that file for why.
//
// Public API is unchanged: `generateText`, `generateJson`,
// `getProviderChainStatus`, and `ProviderError` re-export so existing
// imports work without modification.
// ─────────────────────────────────────────────────────────────────────────────

import { createProviderChain } from './chain.js';
import { NvidiaProvider } from './NvidiaProvider.js';
import { GeminiProvider } from './GeminiProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { OpenRouterProvider } from './OpenRouterProvider.js';

export const defaultChain = createProviderChain(
    [
        new NvidiaProvider(),
        new GeminiProvider(),
        new GroqProvider(),
        new OpenRouterProvider(),
    ],
    { name: 'AI Default' }
);

// Public API — preserved verbatim from V2 so existing call sites continue
// to work without an import-path change.
export const generateText = defaultChain.generateText;
export const generateJson = defaultChain.generateJson;
export const getProviderChainStatus = defaultChain.getStatus;

export { ProviderError } from './BaseProvider.js';
