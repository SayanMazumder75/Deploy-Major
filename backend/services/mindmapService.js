// mindmapService
//
// Bundle stage: generate a Mermaid mindmap representing the structure of
// the chapters. Returns both:
//   - `mermaid`: Mermaid mindmap syntax (rendered client-side by mermaid.js)
//   - `outlineMarkdown`: same content as nested markdown bullets (used as
//                        a fallback for the PDF builder, which can't run
//                        the Mermaid renderer)
//
// Defensive: if the AI emits Mermaid that doesn't start with `mindmap`, we
// repair it. Mermaid is strict about the first non-whitespace line.

import { generateJson } from '../providers/index.js';
import { safeParseJson } from './shared/jsonParser.js';
import { mindmapPrompt } from './shared/promptTemplates.js';

const sanitiseMermaid = (m) => {
    if (!m || typeof m !== 'string') return '';
    let trimmed = m.trim();
    // Strip ```mermaid fences if the AI included them despite being asked not to.
    const fence = trimmed.match(/^```(?:mermaid)?\s*([\s\S]*?)```$/);
    if (fence) trimmed = fence[1].trim();
    // Ensure it starts with the `mindmap` directive.
    if (!/^mindmap\b/.test(trimmed)) {
        trimmed = `mindmap\n${trimmed}`;
    }
    return trimmed;
};

export const generateMindMap = async ({ chapters, settings }) => {
    if (!chapters?.length) {
        return { mermaid: '', outlineMarkdown: '' };
    }
    try {
        const raw = await generateJson(
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
