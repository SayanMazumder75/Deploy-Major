// mindmapService (V3)
//
// Bundle stage — generates a Mermaid mindmap from the rewritten chapter
// summaries. ONE AI call per generation via the scoped Intelligence chain.
//
// Returns { mermaid, outlineMarkdown }:
//   - mermaid:         valid Mermaid mindmap syntax, rendered client-side
//                      by mermaid.js in the Summary Viewer
//   - outlineMarkdown: same structure as nested markdown bullets — used by
//                      the PDF builder (which can't run the Mermaid
//                      renderer) and as a fallback if the SVG render fails

import { safeParseJson } from './shared/jsonParser.js';
import { mindmapPrompt } from './shared/promptTemplates.js';

const sanitiseMermaid = (m) => {
    if (!m || typeof m !== 'string') return '';
    let trimmed = m.trim();
    // Strip ```mermaid fences if the AI included them despite being told not to.
    const fence = trimmed.match(/^```(?:mermaid)?\s*([\s\S]*?)```$/);
    if (fence) trimmed = fence[1].trim();
    // Mermaid is strict about the first non-whitespace line; force the
    // `mindmap` directive if the model dropped it.
    if (!/^mindmap\b/.test(trimmed)) {
        trimmed = `mindmap\n${trimmed}`;
    }
    return trimmed;
};

export const generateMindMap = async ({ chapters, settings, chain }) => {
    if (!chapters?.length) {
        return { mermaid: '', outlineMarkdown: '' };
    }
    try {
        const raw = await chain.generateJson(
            mindmapPrompt({ chapters, settings }),
            { label: 'mindmap', maxTokens: 2048, temperature: 0.5 }
        );
        const parsed = safeParseJson(raw) || {};
        return {
            mermaid: sanitiseMermaid(parsed.mermaid),
            outlineMarkdown: parsed.outlineMarkdown || '',
        };
    } catch (err) {
        console.error('generateMindMap failed:', err.message);
        return { mermaid: '', outlineMarkdown: '' };
    }
};
