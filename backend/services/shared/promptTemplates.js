// ─────────────────────────────────────────────────────────────────────────────
// shared/promptTemplates  (V3)
//
// V3 collapses what used to be 4 separate enrichment passes (definitions /
// formulas / examples / tips) into ONE rich JSON response per chunk. The
// only follow-up AI work after chunk extraction is:
//
//   - `rewriteMergedPrompt`   — single pass to polish prose + dedupe
//   - `flashcardsPrompt`      — 1 call from rewritten chapters
//   - `quizPrompt`            — 1 call from rewritten chapters
//   - `vivaPrompt`            — 1 call from rewritten chapters
//   - `mindmapPrompt`         — 1 call from rewritten chapters
//   - `askAiPrompt` / `translatePrompt` — viewer-side interactive prompts
//
// That's ~25–35 AI calls per generation vs ~38–82 in V2. The reduction
// comes from killing the per-resource enrichment loop; everything we need
// for the definition / formula / example / tip cards now lives in the
// chunk's structured response.
//
// Every prompt header is uniform: study goal voice + language + an
// explicit "STRICT JSON only, no fences" preamble for JSON-shaped prompts.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveStudyContext } from './studyGoalConfig.js';

/**
 * Common scaffold prepended to every prompt. Keeps voice + language +
 * output-format instructions consistent across stages so we don't fight
 * subtle prompt drift between services.
 */
const buildHeader = (settings, { jsonOnly = false } = {}) => {
    const ctx = resolveStudyContext(settings);
    return [
        `STUDY GOAL: ${ctx.goalLabel}`,
        `VOICE: ${ctx.voice}`,
        `EMPHASES: ${ctx.emphases.join('; ')}`,
        `LANGUAGE: ${ctx.language}`,
        jsonOnly
            ? 'OUTPUT FORMAT: Return STRICT JSON only. No prose before or after. No markdown fences. No explanation. The first character of your response must be `{` (or `[` if the schema below specifies an array).'
            : 'OUTPUT FORMAT: Return clean GitHub-Flavoured Markdown.',
    ].join('\n');
};

// ─── stage 1: per-chunk extraction (single call, rich JSON) ─────────────────

/**
 * Per-chunk extraction prompt.
 *
 * V3 critical change: this is the ONLY AI call per chunk. The response
 * must contain every resource we care about — chapter summary, definitions,
 * key concepts, formulas, examples, exam tips, important points. We will
 * never re-prompt the model to enrich any of these later.
 *
 * Schema is intentionally compact (2 fields per definition, not 7 like V2
 * tried to enrich into) — fewer output tokens per chunk × 20–30 chunks
 * compounds into ~50% fewer output tokens overall. The viewer's
 * RichCardsView already renders gracefully when optional fields are empty,
 * so the simpler shape doesn't degrade UX.
 *
 * Advanced-options gates: when an advanced option is OFF, we OMIT the
 * corresponding array from the schema so the model doesn't waste tokens
 * filling it. The orchestrator's compose step still skips disabled sections
 * regardless of what the model returns.
 */
export const perChunkExtractionPrompt = ({
    chunk,
    settings,
    chunkIndex,
    totalChunks,
}) => {
    const adv = settings.advancedOptions || {};
    const includeFormulas = adv.preserveFormulas !== false;
    const includeDefinitions = adv.preserveDefinitions !== false;
    const includeExamples = adv.keepExamples !== false;

    return `${buildHeader(settings, { jsonOnly: true })}

You are processing chunk ${chunkIndex + 1} of ${totalChunks} of an educational document.
Extract a COMPLETE structured summary of THIS chunk in ONE response. Do not
invent material that isn't in the chunk.

Return a JSON object matching exactly this schema (omit arrays whose flag is false):
{
  "chapterTitle": "Most descriptive chapter / section title for this chunk",
  "summary":      "3–8 markdown bullets ('\\n- bullet') capturing the chunk's main ideas. Bold key terms with **bold**.",
${includeDefinitions ? '  "definitions":      [{"term": "the term", "definition": "concise 1–2 sentence definition"}],\n' : ''}  "keyConcepts":      [{"title": "key concept", "explanation": "1–3 sentence explanation"}],
${includeFormulas ? '  "formulas":         [{"name": "what the formula computes", "expression": "the formula itself, plain text or LaTeX-ish", "variables": "what each symbol means", "notes": "when it applies (optional)"}],\n' : ''}${includeExamples ? '  "examples":         [{"title": "example title", "content": "1–3 sentence example from the chunk"}],\n' : ''}  "examTips":         ["short actionable exam / study tip from this chunk"],
  "importantPoints":  ["concise high-yield fact worth remembering"]
}

CHUNK TEXT:
${chunk}
`.trim();
};

// ─── stage 2: single rewrite pass ────────────────────────────────────────────

/**
 * V3's "single rewrite pass". Takes the MERGED chapter summaries from every
 * chunk and produces a polished, deduplicated, re-ordered final version.
 *
 * This is the only AI work we do AFTER chunk extraction (apart from the
 * four bundle prompts). It exists because:
 *   - Per-chunk summaries written in isolation often repeat earlier
 *     material that's already in another chunk.
 *   - Auto-detected chapter titles ("Chapter section 1") need humanising.
 *   - Reading order in long PDFs is often jumbled by the original
 *     pagination — a polish pass re-orders intro → core → advanced
 *     → closing.
 *
 * IMPORTANT: this is a POLISH pass, not an enrichment pass. It must NOT
 * invent new facts. The prompt is explicit about that.
 */
export const rewriteMergedPrompt = ({ mergedChapters, settings, targetWords }) =>
    `${buildHeader(settings, { jsonOnly: true })}

You are polishing the final draft of an educational study summary by
rewriting pre-extracted chapter summaries. This is the SINGLE rewrite pass
the pipeline performs after merging chunk-level data — make it count.

Target total length across all chapter contents combined: roughly ${targetWords} words.

Tasks:
1. Re-order chapters into a natural reading order (intro → core → advanced → closing).
2. Rewrite each chapter "content" as clean markdown with bullet points,
   **bolded** key terms, and short ## subheadings where they help readability.
3. Improve auto-generated titles like "Chapter section 1" into descriptive names.
4. Remove duplicate ideas that appear in more than one chapter, but PRESERVE
   the chapters' distinct scope — don't merge two chapters into one.
5. Do NOT add or remove information. No fabrications.

Return JSON exactly matching:
{
  "chapters": [{"title": "Descriptive chapter title", "content": "polished markdown body"}]
}

PRE-EXTRACTED CHAPTERS (JSON):
${JSON.stringify(mergedChapters, null, 2)}
`;

// ─── stage 3: bundle resources (flashcards / quiz / viva / mindmap) ─────────
//
// Each of these is ONE call total — never one per chapter. The chapters
// array is fed in as JSON context.

export const flashcardsPrompt = ({ chapters, settings, count }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate exactly ${count} active-recall flashcards from the chapter summaries below.
Each flashcard should test ONE specific fact, definition, or skill.

Return JSON:
{
  "flashcards": [{
    "question":   "Clear, specific question",
    "answer":     "Concise, accurate answer (1–3 sentences)",
    "difficulty": "easy | medium | hard"
  }]
}

CHAPTERS (JSON):
${JSON.stringify(chapters, null, 2)}
`;

export const quizPrompt = ({ chapters, settings, count }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate exactly ${count} multiple-choice questions from the chapter summaries below.
Each question must have exactly 4 plausible options and exactly one correct answer.

Return JSON:
{
  "quiz": [{
    "question":       "the question",
    "options":        ["option 1", "option 2", "option 3", "option 4"],
    "correctIndex":   0,
    "correctAnswer":  "the exact text of the correct option",
    "explanation":    "1–2 sentence explanation of why the correct option is correct",
    "difficulty":     "easy | medium | hard"
  }]
}

CHAPTERS (JSON):
${JSON.stringify(chapters, null, 2)}
`;

export const vivaPrompt = ({ chapters, settings, count }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate ${count} viva-style oral-exam questions from the chapter summaries below.
Mix easy/medium/hard so the student gets a realistic spread.

Return JSON:
{
  "vivaQuestions": [{
    "question":       "viva question phrased as an examiner would ask it",
    "expectedAnswer": "the 2–4 sentence expected answer",
    "difficulty":     "easy | medium | hard"
  }]
}

CHAPTERS (JSON):
${JSON.stringify(chapters, null, 2)}
`;

export const mindmapPrompt = ({ chapters, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate a Mermaid mindmap representing the structure of the chapters below.
Root node = the document topic; each chapter = a top-level branch with 2–5
key sub-concepts under each.

Return JSON:
{
  "mermaid":         "valid Mermaid mindmap syntax starting with \`mindmap\` on its own line",
  "outlineMarkdown": "the same structure as nested markdown bullets (fallback for when Mermaid can't render)"
}

Mermaid syntax reminder:
mindmap
  root((Document Topic))
    Chapter One
      Sub-concept A
      Sub-concept B
    Chapter Two
      Sub-concept C

CHAPTERS (JSON):
${JSON.stringify(chapters, null, 2)}
`;

// ─── post-generation interactive prompts (Ask AI / Translate) ────────────────

export const askAiPrompt = ({ summaryMarkdown, question }) => `
You are a study tutor answering a student's follow-up question about an AI-generated study summary.

Rules:
- Be precise, cite the relevant section of the summary, keep the answer focused.
- Use markdown formatting (headings, bullets, bold) where it aids readability.
- Do NOT invent facts that aren't in the summary or in well-established knowledge of the field.

SUMMARY (truncated to fit context):
${(summaryMarkdown || '').substring(0, 12000)}

STUDENT QUESTION:
${question}

YOUR ANSWER:
`;

export const translatePrompt = ({ summaryMarkdown, targetLanguage }) => {
    const labelMap = {
        english: 'clear, professional English',
        hindi: 'Hindi (Devanagari script)',
        bengali: 'Bengali script',
    };
    return `
Translate the markdown study summary below into ${labelMap[targetLanguage] || targetLanguage}.
Preserve markdown formatting (headings, bullets, bold) exactly. Do NOT add or remove sections.
Where a technical term has no good local equivalent, keep the English term and add the translation in parentheses.

SUMMARY:
${(summaryMarkdown || '').substring(0, 12000)}

TRANSLATED SUMMARY:
`;
};
