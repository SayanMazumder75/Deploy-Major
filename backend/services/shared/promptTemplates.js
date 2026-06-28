// ─────────────────────────────────────────────────────────────────────────────
// promptTemplates
//
// One file holding every prompt the AI Document Intelligence pipeline
// emits. Keeping them centralised here (rather than inlined in each
// service) means:
//   - prompt engineering iterations only touch one file
//   - the voice / tone-of-voice instruction is appended uniformly
//   - we can A/B test prompt variants by swapping factories without
//     touching service logic
//
// Every factory takes a normalised settings object (see /shared/studyGoalConfig)
// plus content, returns a string. Services then hand the string to the
// provider chain via generateJson / generateText.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveStudyContext } from './studyGoalConfig.js';

/**
 * Common instruction scaffold prepended to every prompt. Keeps the
 * "what voice", "what language", "no markdown fences in JSON output"
 * rules consistent across every stage.
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

// ─── stage 1: per-chunk extraction ───────────────────────────────────────────

/**
 * Per-chunk extraction prompt. Asks the model for a structured JSON object
 * containing chapter summaries, raw definitions, raw formulas, raw
 * examples, raw diagrams, and raw exam tips from a single chunk of source
 * text.
 *
 * Advanced options gate which arrays the model emits — preserveFormulas,
 * preserveDefinitions, explainDiagrams, keepExamples each remove the
 * corresponding section from the request if false.
 *
 * @param {Object} args
 * @param {string} args.chunk            Source-text chunk.
 * @param {Object} args.settings         Normalised settings.
 * @param {number} args.chunkIndex
 * @param {number} args.totalChunks
 * @returns {string}
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
    const includeDiagrams = !!adv.explainDiagrams;

    return `${buildHeader(settings, { jsonOnly: true })}

You are processing chunk ${chunkIndex + 1} of ${totalChunks} of an educational document.
Extract structured study material from THIS chunk only. Do NOT invent material that isn't in the chunk.

Return a JSON object matching exactly this schema (omit arrays whose flag is false):
{
  "chapters": [{"title": "Chapter / section title from this chunk", "summary": "3-6 bullet-style sentences. Use \\n- prefix per bullet."}],
${includeDefinitions ? '  "definitions": [{"term": "the term", "definition": "concise 1-2 sentence definition"}],\n' : ''}${includeFormulas ? '  "formulas": [{"name": "what the formula computes", "expression": "the formula itself, plain text or LaTeX-ish", "variables": "what each symbol means", "notes": "when it applies"}],\n' : ''}${includeExamples ? '  "examples": [{"title": "example title", "content": "1-3 sentence example from the chunk"}],\n' : ''}${includeDiagrams ? '  "diagrams": [{"title": "diagram or figure title", "description": "what the diagram shows in 1-3 sentences"}],\n' : ''}  "concepts":  [{"title": "key concept", "explanation": "1-3 sentence explanation"}],
  "tips":      ["short actionable exam / study tip from this chunk"]
}

CHUNK TEXT:
${chunk}
`;
};

// ─── stage 2: chapter polish + table of contents ────────────────────────────

/**
 * Final aggregation prompt. Takes merged chapter summaries from all
 * chunks and asks the model to re-order, polish wording, and emit a
 * lightweight mind-map outline that ties them together.
 */
export const chapterFinalisePrompt = ({ mergedChapters, settings, targetWords }) =>
    `${buildHeader(settings, { jsonOnly: true })}

You are finalising chapter-level summaries by polishing pre-extracted chapter chunks.
Target total length across all chapter contents combined: roughly ${targetWords} words.

Tasks:
1. Re-order chapters into a natural reading order (intro → core → advanced → closing).
2. Rewrite each chapter "content" as clean markdown with bullet points, **bolded** key terms, and short subheadings (## prefix) where they help readability.
3. Improve auto-generated titles like "Chapter section 1" into descriptive names.
4. Do NOT add or remove information. No fabrications.

Return JSON exactly matching:
{
  "chapters": [{"title": "Descriptive chapter title", "content": "polished markdown body"}],
  "mindmapMarkdown": "An 8-20 line nested-bullet mind map outline tying the chapters together."
}

PRE-EXTRACTED CHAPTERS (JSON):
${JSON.stringify(mergedChapters, null, 2)}
`;

// ─── stage 3: enrichment passes (per-resource type) ─────────────────────────

export const definitionEnrichmentPrompt = ({ rawDefinitions, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

You are enriching a raw list of definitions extracted from a study document.
For EACH definition, produce a rich card with the fields below. Keep wording
crisp; never invent facts. If a field genuinely doesn't apply, return an
empty string for it.

Return JSON:
{
  "definitions": [{
    "term": "the term",
    "definition": "1-2 sentence rigorous definition",
    "simpleExplanation": "the same concept in plain language a beginner would understand",
    "analogy": "a one-line real-world analogy (or empty string)",
    "importance": "why this term matters in this subject (one line)",
    "examQuestion": "one likely exam-style question on this term",
    "interviewQuestion": "one likely interview-style question on this term"
  }]
}

RAW DEFINITIONS (JSON):
${JSON.stringify(rawDefinitions, null, 2)}
`;

export const formulaEnrichmentPrompt = ({ rawFormulas, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

You are enriching a raw list of formulas extracted from a study document.
For EACH formula, produce a rich card with the fields below. Keep the
formula expression as the source had it; do not "fix" notation differences.

Return JSON:
{
  "formulas": [{
    "name": "what the formula computes",
    "expression": "the formula as written (plain text or LaTeX-ish)",
    "variables": "what each symbol means (one line)",
    "explanation": "how/when the formula is used",
    "example": "one-line worked example or substitution",
    "examImportance": "low | medium | high",
    "interviewImportance": "low | medium | high"
  }]
}

RAW FORMULAS (JSON):
${JSON.stringify(rawFormulas, null, 2)}
`;

export const exampleEnrichmentPrompt = ({ rawExamples, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

You are enriching a raw list of examples extracted from a study document.
For EACH example, expand it into the schema below. Where the source
example is purely conceptual, you may add a plausible real-world or exam
variant — but mark the source field accordingly.

Return JSON:
{
  "examples": [{
    "title": "example title",
    "conceptExample": "the conceptual example as written in the source",
    "realWorldExample": "a real-world application of the same concept",
    "examExample": "an exam-style restatement of the same problem",
    "interviewExample": "how this might come up in an interview"
  }]
}

RAW EXAMPLES (JSON):
${JSON.stringify(rawExamples, null, 2)}
`;

export const examTipsPrompt = ({ rawTips, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Polish a raw list of exam tips into a clean, deduplicated, ranked list.
Keep each tip to a single actionable sentence.

Return JSON:
{
  "tips": ["short actionable exam / study tip"]
}

RAW TIPS (JSON):
${JSON.stringify(rawTips, null, 2)}
`;

// ─── stage 4: bundled resources (flashcards / quiz / viva / mindmap) ─────────

export const flashcardsPrompt = ({ chapters, settings, count }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate exactly ${count} active-recall flashcards from the chapter summaries below.
Each flashcard should test ONE specific fact, definition, or skill.

Return JSON:
{
  "flashcards": [{
    "question": "Clear, specific question",
    "answer":   "Concise, accurate answer (1-3 sentences)",
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
    "explanation":    "1-2 sentence explanation of why the correct option is correct",
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
    "expectedAnswer": "the 2-4 sentence expected answer",
    "difficulty":     "easy | medium | hard"
  }]
}

CHAPTERS (JSON):
${JSON.stringify(chapters, null, 2)}
`;

export const mindmapPrompt = ({ chapters, settings }) =>
    `${buildHeader(settings, { jsonOnly: true })}

Generate a Mermaid mindmap representing the structure of the chapters below.
The root node should be the document topic, with each chapter as a top-level
branch and 2-5 key sub-concepts under each.

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
