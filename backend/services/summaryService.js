// ─────────────────────────────────────────────────────────────────────────────
// summaryService
//
// Stage 1 (per-chunk extraction) + stage 2 (final aggregation pass).
// Consumes the provider chain (generateJson) for both.
//
// Per-chunk extraction returns a JSON object with chapter summaries,
// definitions, formulas, examples, diagrams, concepts, and tips.
// Aggregation merges + dedupes the per-chunk results and then runs ONE
// final polish pass to re-order chapters and emit a mind-map outline.
//
// All structural defence (safeParseJson, ensureArray, dedupeByTitle) is
// delegated to /shared/jsonParser so this file stays focused on the AI
// orchestration.
// ─────────────────────────────────────────────────────────────────────────────

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray, dedupeByTitle } from './shared/jsonParser.js';
import {
    perChunkExtractionPrompt,
    chapterFinalisePrompt,
} from './shared/promptTemplates.js';

// ─── stage 1 ────────────────────────────────────────────────────────────────

const emptyChunkResult = () => ({
    chapters: [],
    definitions: [],
    concepts: [],
    formulas: [],
    examples: [],
    diagrams: [],
    tips: [],
});

/**
 * Extract structured material from a single chunk.
 *
 * @param {Object} args
 * @param {{index:number,text:string}} args.chunk
 * @param {Object} args.settings
 * @param {number} args.totalChunks
 * @returns {Promise<ReturnType<typeof emptyChunkResult>>}
 */
export const extractChunk = async ({ chunk, settings, totalChunks }) => {
    const prompt = perChunkExtractionPrompt({
        chunk: chunk.text,
        settings,
        chunkIndex: chunk.index,
        totalChunks,
    });
    let raw;
    try {
        raw = await generateJson(prompt, {
            label: `chunk-extract[${chunk.index + 1}/${totalChunks}]`,
            maxTokens: 4096,
            temperature: 0.4,
        });
    } catch (err) {
        // One bad chunk should never kill the whole summary — log and
        // continue with an empty contribution from this chunk.
        console.error(
            `chunkExtract ${chunk.index + 1}/${totalChunks} failed:`,
            err.message
        );
        return emptyChunkResult();
    }

    const parsed = safeParseJson(raw) || {};
    return {
        chapters: ensureArray(parsed.chapters),
        definitions: ensureArray(parsed.definitions),
        concepts: ensureArray(parsed.concepts),
        formulas: ensureArray(parsed.formulas),
        examples: ensureArray(parsed.examples),
        diagrams: ensureArray(parsed.diagrams),
        tips: ensureArray(parsed.tips),
    };
};

// ─── merge / dedupe ──────────────────────────────────────────────────────────

/**
 * Merge an array of per-chunk results into a single bag and dedupe each
 * category. Normalises field names so downstream enrichment services
 * always see `{ title, content }` shapes.
 */
export const mergeChunkResults = (chunkResults) => {
    const out = emptyChunkResult();
    for (const r of chunkResults) {
        out.chapters.push(...(r.chapters || []));
        out.definitions.push(...(r.definitions || []));
        out.concepts.push(...(r.concepts || []));
        out.formulas.push(...(r.formulas || []));
        out.examples.push(...(r.examples || []));
        out.diagrams.push(...(r.diagrams || []));
        out.tips.push(...(r.tips || []));
    }

    // Normalise to { title, content } and dedupe.
    out.definitions = dedupeByTitle(
        out.definitions
            .filter((d) => d && (d.term || d.title))
            .map((d) => ({
                title: d.term || d.title,
                content: d.definition || d.content || '',
                raw: d, // preserved for enrichment stage to reuse if useful
            }))
    );
    out.concepts = dedupeByTitle(
        out.concepts
            .filter((c) => c && c.title)
            .map((c) => ({
                title: c.title,
                content: c.explanation || c.content || '',
            }))
    );
    out.formulas = dedupeByTitle(
        out.formulas
            .filter((f) => f && (f.name || f.title))
            .map((f) => ({
                title: f.name || f.title,
                content: [
                    f.expression || '',
                    f.variables ? `Variables: ${f.variables}` : '',
                    f.notes || '',
                ]
                    .filter(Boolean)
                    .join('\n\n'),
                raw: f,
            }))
    );
    out.examples = dedupeByTitle(
        out.examples
            .filter((e) => e && e.title)
            .map((e) => ({ title: e.title, content: e.content || '' }))
    );
    out.diagrams = dedupeByTitle(
        out.diagrams
            .filter((d) => d && d.title)
            .map((d) => ({
                title: d.title,
                content: d.description || d.content || '',
            }))
    );

    // Tips: simple lowercase dedupe — they're plain strings.
    const seenTips = new Set();
    out.tips = out.tips
        .filter((t) => typeof t === 'string')
        .filter((t) => {
            const k = t.trim().toLowerCase();
            if (!k || seenTips.has(k)) return false;
            seenTips.add(k);
            return true;
        });

    return out;
};

// ─── stage 2: final polish ───────────────────────────────────────────────────

/**
 * Run the final aggregation pass on merged chapters. Returns the polished
 * chapters + a mind-map outline (the latter is just a fallback; the
 * dedicated mindmapService produces a richer Mermaid version separately).
 */
export const finaliseChapters = async ({ merged, settings, targetWords }) => {
    if (!merged.chapters.length) {
        return {
            chapters: [
                {
                    title: 'Summary',
                    content:
                        '_The summarizer was unable to extract chapter-level structure from this document. Open the original document for full content._',
                },
            ],
            mindmapMarkdown: '',
        };
    }

    try {
        const raw = await generateJson(
            chapterFinalisePrompt({
                mergedChapters: merged.chapters,
                settings,
                targetWords,
            }),
            { label: 'chapter-finalise', maxTokens: 8192, temperature: 0.4 }
        );
        const parsed = safeParseJson(raw);

        if (parsed && Array.isArray(parsed.chapters) && parsed.chapters.length) {
            return {
                chapters: parsed.chapters.map((c) => ({
                    title: c.title || 'Untitled Section',
                    content: c.content || '',
                })),
                mindmapMarkdown: parsed.mindmapMarkdown || '',
            };
        }
    } catch (err) {
        console.error('chapter finalise failed:', err.message);
    }

    // Fallback: keep the raw per-chunk chapters as-is so we still ship a
    // usable summary even if the polish pass fails entirely.
    return {
        chapters: merged.chapters.map((c) => ({
            title: c.title || 'Untitled Section',
            content: c.summary || c.content || '',
        })),
        mindmapMarkdown: '',
    };
};
