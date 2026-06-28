// ─────────────────────────────────────────────────────────────────────────────
// summaryService (V3)
//
// Two responsibilities:
//   1. extractChunk()          — single AI call per chunk returning a
//                                rich JSON shape (chapters + definitions +
//                                keyConcepts + formulas + examples + tips +
//                                importantPoints). NO follow-up enrichment
//                                calls; everything we need ships in this
//                                one response.
//   2. mergeChunkResults()     — local-only merge + dedupe. Zero AI calls.
//   3. rewriteMergedDocument() — the SINGLE polishing pass after merge.
//                                Improves prose / removes dupes / reorders
//                                chapters. Must not invent new facts.
//
// V3 dropped the V2 enrichment fan-out (4 extra AI passes for definitions /
// formulas / examples / tips). Those services have been deleted — the
// chunk JSON now carries everything those passes used to add, just with a
// slightly simpler per-resource shape (term + definition vs term +
// definition + simpleExplanation + analogy + …). The viewer already
// handles the simpler shape gracefully.
//
// The chain is passed in by the orchestrator so per-generation provider
// health (NVIDIA-disabled, Groq-disabled, etc.) carries between every
// call inside a pipeline run.
// ─────────────────────────────────────────────────────────────────────────────

import {
    safeParseJson,
    ensureArray,
    dedupeByTitle,
} from './shared/jsonParser.js';
import {
    perChunkExtractionPrompt,
    rewriteMergedPrompt,
} from './shared/promptTemplates.js';

// ─── stage 1 — per-chunk extraction ─────────────────────────────────────────

const emptyChunkResult = () => ({
    chapterTitle: '',
    summary: '',
    definitions: [],
    keyConcepts: [],
    formulas: [],
    examples: [],
    examTips: [],
    importantPoints: [],
});

/**
 * Extract structured material from a single chunk via ONE AI call.
 *
 * @param {Object} args
 * @param {{index:number, label:string|null, text:string, wordCount:number}} args.chunk
 * @param {Object} args.settings
 * @param {number} args.totalChunks
 * @param {{ generateJson: Function }} args.chain  Scoped intelligence chain.
 * @returns {Promise<ReturnType<typeof emptyChunkResult>>}
 */
export const extractChunk = async ({ chunk, settings, totalChunks, chain }) => {
    const prompt = perChunkExtractionPrompt({
        chunk: chunk.text,
        settings,
        chunkIndex: chunk.index,
        totalChunks,
    });

    let raw;
    try {
        raw = await chain.generateJson(prompt, {
            label: `chunk-extract[${chunk.index + 1}/${totalChunks}]`,
            // We keep maxTokens generous so the model doesn't truncate mid-
            // array on a chunk that happens to be definition-heavy. The
            // response is still ~10–20× smaller than the prompt for typical
            // educational PDFs.
            maxTokens: 4096,
            temperature: 0.4,
        });
    } catch (err) {
        // A single chunk failing should never kill the whole pipeline. We
        // log + return an empty result so downstream merge stages can
        // proceed; the user gets a slightly shorter summary instead of a
        // hard error.
        console.error(
            `chunk-extract ${chunk.index + 1}/${totalChunks} failed:`,
            err.message
        );
        return emptyChunkResult();
    }

    const parsed = safeParseJson(raw) || {};
    return {
        chapterTitle:
            (parsed.chapterTitle || chunk.label || `Section ${chunk.index + 1}`).trim() ||
            `Section ${chunk.index + 1}`,
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        definitions: ensureArray(parsed.definitions),
        keyConcepts: ensureArray(parsed.keyConcepts),
        formulas: ensureArray(parsed.formulas),
        examples: ensureArray(parsed.examples),
        examTips: ensureArray(parsed.examTips).filter(
            (t) => typeof t === 'string' && t.trim()
        ),
        importantPoints: ensureArray(parsed.importantPoints).filter(
            (t) => typeof t === 'string' && t.trim()
        ),
    };
};

// ─── merge / dedupe (LOCAL — no AI) ─────────────────────────────────────────

/**
 * Merge per-chunk results into a single bag, deduping each category. The
 * resulting shapes are what the orchestrator threads into the rewrite
 * stage and the compose stage. NO AI is involved here — this is pure JS.
 *
 * Field normalisation aligns the V3 chunk shape with the rich shapes the
 * AISummary model + the PDF builder expect (term/definition for defs,
 * name+expression+variables for formulas, etc.). Extra V2-era fields like
 * `simpleExplanation` are left empty — the viewer handles that fine.
 */
export const mergeChunkResults = (chunkResults) => {
    const out = {
        // Chapter aggregates: one entry per chunk that produced a non-empty
        // summary. The rewrite stage will rename and reorder these.
        chapters: [],
        definitions: [],
        keyConcepts: [],
        formulas: [],
        examples: [],
        examTips: [],
        importantPoints: [],
    };

    for (let i = 0; i < chunkResults.length; i++) {
        const r = chunkResults[i] || emptyChunkResult();

        if (r.summary && r.summary.trim()) {
            out.chapters.push({
                title: r.chapterTitle || `Section ${i + 1}`,
                content: r.summary,
            });
        }

        out.definitions.push(...(r.definitions || []));
        out.keyConcepts.push(...(r.keyConcepts || []));
        out.formulas.push(...(r.formulas || []));
        out.examples.push(...(r.examples || []));
        out.examTips.push(...(r.examTips || []));
        out.importantPoints.push(...(r.importantPoints || []));
    }

    // ── normalise + dedupe each category ──────────────────────────────────
    // Each list converges to `{ title, content, raw? }` so downstream code
    // (PDF builder, viewer) can treat them uniformly.

    out.definitions = dedupeByTitle(
        out.definitions
            .filter((d) => d && (d.term || d.title))
            .map((d) => ({
                title: (d.term || d.title || '').trim(),
                content: (d.definition || d.content || '').trim(),
                raw: d,
            }))
    );

    out.keyConcepts = dedupeByTitle(
        out.keyConcepts
            .filter((c) => c && c.title)
            .map((c) => ({
                title: c.title.trim(),
                content: (c.explanation || c.content || '').trim(),
            }))
    );

    out.formulas = dedupeByTitle(
        out.formulas
            .filter((f) => f && (f.name || f.title || f.expression))
            .map((f) => ({
                title: (f.name || f.title || 'Formula').trim(),
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
            .map((e) => ({
                title: e.title.trim(),
                content: (e.content || '').trim(),
            }))
    );

    // Strings: dedupe case-insensitively.
    const seenTips = new Set();
    out.examTips = out.examTips
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim())
        .filter((t) => {
            const k = t.toLowerCase();
            if (!k || seenTips.has(k)) return false;
            seenTips.add(k);
            return true;
        });

    const seenPoints = new Set();
    out.importantPoints = out.importantPoints
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim())
        .filter((t) => {
            const k = t.toLowerCase();
            if (!k || seenPoints.has(k)) return false;
            seenPoints.add(k);
            return true;
        });

    return out;
};

// ─── stage 2 — single rewrite pass ──────────────────────────────────────────

/**
 * The V3 rewrite pass. One AI call that polishes the merged chapters.
 *
 * NOTE: this is a POLISH pass, not an enrichment pass. The prompt instructs
 * the model not to invent new facts; if it tries anyway we still ship what
 * it gives us — drift is bounded and the alternative (manual chapter
 * polishing per pass) was what made V2 expensive.
 *
 * If the rewrite call fails entirely (every provider exhausted, JSON
 * parsing fails, etc.) we fall back to the merged-but-unpolished chapters
 * so the user still gets a usable summary instead of a hard error.
 */
export const rewriteMergedDocument = async ({ merged, settings, targetWords, chain }) => {
    if (!merged.chapters.length) {
        return {
            chapters: [
                {
                    title: 'Summary',
                    content:
                        '_The summarizer was unable to extract chapter-level structure from this document. Open the original document for full content._',
                },
            ],
        };
    }

    try {
        const raw = await chain.generateJson(
            rewriteMergedPrompt({
                mergedChapters: merged.chapters,
                settings,
                targetWords,
            }),
            { label: 'rewrite-merged', maxTokens: 8192, temperature: 0.4 }
        );
        const parsed = safeParseJson(raw);
        if (parsed && Array.isArray(parsed.chapters) && parsed.chapters.length) {
            return {
                chapters: parsed.chapters.map((c) => ({
                    title: (c.title || 'Untitled Section').trim(),
                    content: (c.content || '').trim(),
                })),
            };
        }
    } catch (err) {
        console.error('rewrite-merged failed:', err.message);
    }

    // Fallback: ship the merged chapters as-is.
    return {
        chapters: merged.chapters.map((c) => ({
            title: c.title || 'Untitled Section',
            content: c.content || '',
        })),
    };
};
