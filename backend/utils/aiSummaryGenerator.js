// ─────────────────────────────────────────────────────────────────────────────
// aiSummaryGenerator
//
// Multi-stage summarization pipeline used by the AI Document Intelligence
// module. Built on top of the existing Groq llama-3.3-70b helper in
// `geminiService.js` so we re-use the same client / token budget / error
// handling as the rest of the AI features.
//
// Pipeline:
//   1. Chunk the full extracted text into ~3500-word slices (Groq's context
//      window comfortably handles this with room for the prompt).
//   2. For each chunk, ask the model to emit a compact JSON object with
//      per-chunk chapter summaries, definitions, formulas, examples, etc.
//      (We use JSON instead of free markdown so we can robustly merge the
//      pieces from many chunks without losing structure.)
//   3. Merge the per-chunk JSON objects, deduplicate definitions / formulas,
//      and run a single final aggregation pass to produce a clean,
//      length-controlled set of sections (chapter summaries, key concepts,
//      mind map, exam tips, etc.).
//   4. Compute insights (counts + difficulty heuristic + reading time).
//
// All AI calls go through `rawGenerate` in geminiService — that is the
// canonical Groq wrapper for this codebase.
// ─────────────────────────────────────────────────────────────────────────────

import { rawGenerate } from './geminiService.js';

// Target words PER PAGE for converting "summaryLength" (2/5/10 pages) into a
// concrete output-size budget. Loosely calibrated against a normal printed
// study-notes page.
const WORDS_PER_PAGE = 320;

// How many words from the source we feed into each per-chunk pass. Keeping
// this well below Groq's context window leaves room for the prompt scaffold
// + JSON formatting overhead.
const CHUNK_WORDS = 3500;

// ─── helpers ──────────────────────────────────────────────────────────────────

const studyGoalLabels = {
    exam_tomorrow: 'Exam Tomorrow — prioritise the highest-yield facts, drilled definitions, must-know formulas, and rapid-recall bullets. Skip nice-to-have background.',
    quick_revision: 'Quick Revision — short, scannable bullets, key terms in bold, light on prose. Optimise for last-minute revision.',
    detailed_notes: 'Detailed Notes — comprehensive coverage, explain every concept clearly, include intuition + examples. Treat this as a complete study companion.',
    research_mode: 'Research Mode — preserve nuance, technical terminology, edge cases, and the original argumentative structure. Suitable for academic study.',
    interview_prep: 'Interview Preparation — emphasise definitions, trade-offs, real-world applications, and likely interview-style questions. Treat each concept as something you might be asked about.',
};

const languageInstruction = {
    english: 'Write the entire summary in clear, professional English.',
    hindi: 'पूरा सारांश हिंदी (देवनागरी लिपि) में लिखें। तकनीकी शब्दों के लिए जहाँ आवश्यक हो वहाँ अंग्रेज़ी शब्द भी कोष्ठक में दे सकते हैं।',
    bengali: 'সম্পূর্ণ সারাংশটি বাংলা ভাষায় লিখুন। যেখানে প্রয়োজন সেখানে কারিগরি শব্দের ইংরেজি প্রতিশব্দ বন্ধনীতে দেওয়া যেতে পারে।',
};

const splitIntoChunks = (text, wordsPerChunk = CHUNK_WORDS) => {
    if (!text) return [];
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= wordsPerChunk) return [text];
    const out = [];
    for (let i = 0; i < words.length; i += wordsPerChunk) {
        out.push(words.slice(i, i + wordsPerChunk).join(' '));
    }
    return out;
};

// Robust JSON extraction. Groq sometimes wraps JSON in ```json fences,
// sometimes prepends a sentence, sometimes returns clean JSON. We try the
// cleanest paths first and fall back to a substring search between the first
// `{` and the matching `}` at the same depth.
const safeParseJson = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let text = raw.trim();

    // Strip code fences if present.
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) text = fenceMatch[1].trim();

    try {
        return JSON.parse(text);
    } catch {
        // Fall through to substring extraction.
    }

    // Find the first `{` and walk to its matching `}`.
    const start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) {
                const slice = text.slice(start, i + 1);
                try {
                    return JSON.parse(slice);
                } catch {
                    return null;
                }
            }
        }
    }
    return null;
};

// Dedupe a list of `{ title, content }` items by a normalised version of
// their title. Keeps the longer `content` when both versions exist (the
// summarizer often emits the same definition in successive chunks with
// slightly different wording — we prefer the more detailed one).
const dedupeByTitle = (items) => {
    const map = new Map();
    for (const item of items) {
        if (!item || !item.title) continue;
        const key = String(item.title).trim().toLowerCase();
        const prev = map.get(key);
        if (!prev) {
            map.set(key, item);
        } else if ((item.content || '').length > (prev.content || '').length) {
            map.set(key, item);
        }
    }
    return Array.from(map.values());
};

// ─── stage 1 — per-chunk extraction ──────────────────────────────────────────

const buildPerChunkPrompt = ({ chunk, settings, chunkIndex, totalChunks }) => {
    const adv = settings.advancedOptions || {};
    return `
You are an expert academic summarizer working on chunk ${chunkIndex + 1} of ${totalChunks} of a study document.

STUDY GOAL:
${studyGoalLabels[settings.studyGoal] || studyGoalLabels.quick_revision}

LANGUAGE INSTRUCTION:
${languageInstruction[settings.language] || languageInstruction.english}

ADVANCED OPTIONS (only emit these arrays if the corresponding flag is true):
- preserveFormulas: ${adv.preserveFormulas !== false}
- preserveDefinitions: ${adv.preserveDefinitions !== false}
- explainDiagrams: ${!!adv.explainDiagrams}
- keepExamples: ${adv.keepExamples !== false}

Your job: extract structured study material from THIS chunk only.

Return a STRICT JSON object — no prose, no markdown fences — matching exactly this schema:
{
  "chapters": [{"title": "Chapter or section title (from this chunk)", "summary": "3-6 bullet-style sentences capturing the chapter's main ideas. Use \\n- prefix per bullet."}],
  "definitions": [{"term": "the term", "definition": "concise definition in 1-2 sentences"}],
  "concepts":    [{"title": "key concept", "explanation": "1-3 sentence explanation"}],
  "formulas":    [{"name": "formula name or purpose", "expression": "the formula itself", "notes": "what the variables mean / when it applies"}],
  "examples":    [{"title": "example title", "content": "the example, 1-3 short sentences"}],
  "diagrams":    [{"title": "diagram or figure title", "description": "what the diagram shows in plain text, 1-3 sentences"}],
  "tips":        ["A short, actionable exam / study tip from this chunk"]
}

RULES:
- Only include arrays whose corresponding flag is true above. Always include "chapters".
- Skip "diagrams" entirely if explainDiagrams is false.
- Skip "formulas" if preserveFormulas is false.
- Skip "definitions" if preserveDefinitions is false.
- Skip "examples" if keepExamples is false.
- Do NOT invent material that isn't in this chunk.
- Output MUST be valid JSON, parseable as-is.

CHUNK TEXT:
${chunk}
`.trim();
};

const extractChunk = async ({ chunk, settings, chunkIndex, totalChunks }) => {
    const prompt = buildPerChunkPrompt({ chunk, settings, chunkIndex, totalChunks });
    const raw = await rawGenerate(prompt);
    const parsed = safeParseJson(raw) || {};
    return {
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
        definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        diagrams: Array.isArray(parsed.diagrams) ? parsed.diagrams : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
};

// ─── stage 2 — merge ─────────────────────────────────────────────────────────

const mergeChunkResults = (chunkResults) => {
    const merged = {
        chapters: [],
        definitions: [],
        concepts: [],
        formulas: [],
        examples: [],
        diagrams: [],
        tips: [],
    };
    for (const r of chunkResults) {
        merged.chapters.push(...r.chapters);
        merged.definitions.push(...r.definitions);
        merged.concepts.push(...r.concepts);
        merged.formulas.push(...r.formulas);
        merged.examples.push(...r.examples);
        merged.diagrams.push(...r.diagrams);
        merged.tips.push(...r.tips);
    }

    // Dedupe based on the most useful key for each kind.
    merged.definitions = dedupeByTitle(
        merged.definitions.map((d) => ({ title: d.term, content: d.definition }))
    );
    merged.concepts = dedupeByTitle(
        merged.concepts.map((c) => ({ title: c.title, content: c.explanation }))
    );
    merged.formulas = dedupeByTitle(
        merged.formulas.map((f) => ({
            title: f.name,
            content: `${f.expression || ''}${f.notes ? `\n\n${f.notes}` : ''}`,
        }))
    );
    merged.examples = dedupeByTitle(
        merged.examples.map((e) => ({ title: e.title, content: e.content }))
    );
    merged.diagrams = dedupeByTitle(
        merged.diagrams.map((d) => ({ title: d.title, content: d.description }))
    );

    // Tips: simple lowercase dedupe.
    const seenTips = new Set();
    merged.tips = merged.tips.filter((t) => {
        if (typeof t !== 'string') return false;
        const k = t.trim().toLowerCase();
        if (seenTips.has(k)) return false;
        seenTips.add(k);
        return true;
    });

    return merged;
};

// ─── stage 3 — final aggregation pass ────────────────────────────────────────

const targetWordsFor = (summaryLength, totalSourceWords) => {
    if (summaryLength === '2') return 2 * WORDS_PER_PAGE;
    if (summaryLength === '5') return 5 * WORDS_PER_PAGE;
    if (summaryLength === '10') return 10 * WORDS_PER_PAGE;
    // 'auto' — pick a sensible default based on source size.
    if (totalSourceWords < 4000) return 2 * WORDS_PER_PAGE;
    if (totalSourceWords < 12000) return 5 * WORDS_PER_PAGE;
    return 10 * WORDS_PER_PAGE;
};

const buildFinalPrompt = ({ merged, settings, targetWords }) => {
    return `
You are finalising a high-quality study summary by polishing per-chunk extractions.

STUDY GOAL:
${studyGoalLabels[settings.studyGoal] || studyGoalLabels.quick_revision}

LANGUAGE:
${languageInstruction[settings.language] || languageInstruction.english}

TARGET LENGTH: roughly ${targetWords} words across all chapter summaries combined.

You are given pre-extracted material below (already deduplicated). Your job:
1. Re-order chapters into a natural reading order (intro → core → advanced → closing).
2. Rewrite each chapter "summary" into clean markdown bullet points, keeping the same key facts but improving flow, headings, and bolding important terms with **bold**.
3. Do NOT drop information. Do NOT invent new information.
4. If the original chapter titles look auto-generated (e.g. "Chapter section 1"), give them more descriptive names.

Return STRICT JSON only — no prose, no markdown fences — matching:
{
  "chapters": [{"title": "Chapter title", "content": "markdown bullets, can use \\n for newlines, \\n- for list items, **bold**"}],
  "mindmapMarkdown": "A textual mind map (nested markdown bullets) tying the chapters together. 8-20 lines."
}

PRE-EXTRACTED CHAPTERS (JSON):
${JSON.stringify(merged.chapters, null, 2)}
`.trim();
};

const finaliseChapters = async ({ merged, settings, targetWords }) => {
    // If we have no chapters at all, return a graceful fallback so the rest
    // of the pipeline still produces a viewable summary.
    if (!merged.chapters.length) {
        return {
            chapters: [
                {
                    title: 'Summary',
                    content:
                        '_(The summarizer was unable to extract chapter-level structure from this document. Open the original document for full content.)_',
                },
            ],
            mindmapMarkdown: '',
        };
    }

    const prompt = buildFinalPrompt({ merged, settings, targetWords });
    let parsed = null;
    try {
        const raw = await rawGenerate(prompt);
        parsed = safeParseJson(raw);
    } catch (err) {
        console.error('Final aggregation pass failed:', err.message);
    }

    // Fallback: if the final pass failed to return parseable JSON, use the
    // per-chunk chapters as-is so we still ship a usable summary.
    if (!parsed || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
        return {
            chapters: merged.chapters.map((c) => ({
                title: c.title || 'Untitled Section',
                content: c.summary || '',
            })),
            mindmapMarkdown: '',
        };
    }

    return {
        chapters: parsed.chapters.map((c) => ({
            title: c.title || 'Untitled Section',
            content: c.content || '',
        })),
        mindmapMarkdown: parsed.mindmapMarkdown || '',
    };
};

// ─── stage 4 — sections + insights assembly ──────────────────────────────────

const wordCount = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

const buildSections = ({ finalChapters, merged, settings }) => {
    const adv = settings.advancedOptions || {};
    const sections = [];

    if (adv.includeToc !== false && finalChapters.chapters.length > 1) {
        sections.push({
            kind: 'toc',
            title: 'Table of Contents',
            content: finalChapters.chapters
                .map((c, i) => `${i + 1}. ${c.title}`)
                .join('\n'),
        });
    }

    for (const ch of finalChapters.chapters) {
        sections.push({ kind: 'chapter', title: ch.title, content: ch.content });
    }

    if (adv.preserveDefinitions !== false && merged.definitions.length) {
        sections.push({
            kind: 'definitions',
            title: 'Important Definitions',
            content: merged.definitions
                .map((d) => `**${d.title}** — ${d.content}`)
                .join('\n\n'),
        });
    }

    if (merged.concepts.length) {
        sections.push({
            kind: 'concepts',
            title: 'Key Concepts',
            content: merged.concepts
                .map((c) => `**${c.title}** — ${c.content}`)
                .join('\n\n'),
        });
    }

    if (adv.preserveFormulas !== false && merged.formulas.length) {
        sections.push({
            kind: 'formulas',
            title: 'Formulas',
            content: merged.formulas
                .map((f) => `**${f.title}**\n\n${f.content}`)
                .join('\n\n---\n\n'),
        });
    }

    if (adv.keepExamples !== false && merged.examples.length) {
        sections.push({
            kind: 'examples',
            title: 'Important Examples',
            content: merged.examples
                .map((e) => `**${e.title}**\n\n${e.content}`)
                .join('\n\n---\n\n'),
        });
    }

    if (adv.explainDiagrams && merged.diagrams.length) {
        sections.push({
            kind: 'mindmap',
            title: 'Diagrams Explained',
            content: merged.diagrams
                .map((d) => `**${d.title}** — ${d.content}`)
                .join('\n\n'),
        });
    }

    if (merged.tips.length) {
        sections.push({
            kind: 'tips',
            title: 'Exam Tips',
            content: merged.tips.map((t) => `- ${t}`).join('\n'),
        });
    }

    if (finalChapters.mindmapMarkdown) {
        sections.push({
            kind: 'mindmap',
            title: 'Mind Map',
            content: finalChapters.mindmapMarkdown,
        });
    }

    return sections;
};

const sectionsToMarkdown = (sections) =>
    sections.map((s) => `# ${s.title}\n\n${s.content}`).join('\n\n---\n\n');

const computeInsights = ({ merged, sections, summaryWords }) => {
    const chapterCount = sections.filter((s) => s.kind === 'chapter').length;
    const formulaCount = merged.formulas.length;
    const definitionCount = merged.definitions.length;
    const diagramCount = merged.diagrams.length;

    // ~250 words/min comfortable reading pace.
    const estimatedReadingTime = Math.max(1, Math.round(summaryWords / 250));

    // Difficulty heuristic — denser source material (more formulas / unique
    // definitions) → harder.
    let difficultyScore = 0;
    difficultyScore += formulaCount * 2;
    difficultyScore += definitionCount;
    difficultyScore += diagramCount;
    let difficulty = 'medium';
    if (difficultyScore < 8) difficulty = 'easy';
    else if (difficultyScore > 30) difficulty = 'hard';

    return {
        chapterCount,
        formulaCount,
        definitionCount,
        diagramCount,
        estimatedReadingTime,
        difficulty,
    };
};

// ─── public entrypoint ───────────────────────────────────────────────────────

/**
 * Generate a structured AI summary from extracted document text.
 *
 * @param {Object} args
 * @param {string} args.text            Full extracted text of the source PDF.
 * @param {Object} args.settings        Settings object (studyGoal / summaryLength / language / advancedOptions).
 * @returns {Promise<{
 *   sections: Array<{kind: string, title: string, content: string}>,
 *   rawMarkdown: string,
 *   insights: Object,
 *   summaryWordCount: number
 * }>}
 */
export const generateAISummary = async ({ text, settings }) => {
    const safeText = (text || '').trim();
    if (!safeText) {
        throw new Error('No source text provided for summarization.');
    }

    const totalSourceWords = wordCount(safeText);
    const chunks = splitIntoChunks(safeText, CHUNK_WORDS);

    // Stage 1 — per-chunk extraction. Done sequentially so we don't hammer
    // the Groq rate limit; for very large documents this is the slow part
    // but it stays well inside the 80s axios timeout the frontend uses,
    // and the frontend's processing-screen UI is designed to mask this.
    const chunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
        try {
            const result = await extractChunk({
                chunk: chunks[i],
                settings,
                chunkIndex: i,
                totalChunks: chunks.length,
            });
            chunkResults.push(result);
        } catch (err) {
            // A failed chunk shouldn't kill the whole summary — log it and
            // continue with an empty contribution from this chunk.
            console.error(`Chunk ${i + 1}/${chunks.length} extraction failed:`, err.message);
            chunkResults.push({
                chapters: [],
                definitions: [],
                concepts: [],
                formulas: [],
                examples: [],
                diagrams: [],
                tips: [],
            });
        }
    }

    // Stage 2 — merge + dedupe.
    const merged = mergeChunkResults(chunkResults);

    // Stage 3 — final aggregation pass to polish chapters and emit a mind map.
    const targetWords = targetWordsFor(settings.summaryLength, totalSourceWords);
    const finalChapters = await finaliseChapters({ merged, settings, targetWords });

    // Stage 4 — assemble final sections + markdown + insights.
    const sections = buildSections({ finalChapters, merged, settings });
    const rawMarkdown = sectionsToMarkdown(sections);
    const summaryWordCount = wordCount(rawMarkdown);
    const insights = computeInsights({ merged, sections, summaryWords: summaryWordCount });

    return { sections, rawMarkdown, insights, summaryWordCount };
};

// Re-exported for tests / debugging.
export const _internal = {
    splitIntoChunks,
    safeParseJson,
    dedupeByTitle,
    targetWordsFor,
    sectionsToMarkdown,
    computeInsights,
};
