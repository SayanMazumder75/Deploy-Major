// ─────────────────────────────────────────────────────────────────────────────
// intelligencePipeline (V3)
//
// The single orchestrator that drives an AI Document Intelligence
// generation end-to-end. V3 redesign per the token-optimisation spec:
//
//   PER-CALL CHANGES
//     - Provider chain: uses `intelligenceChain` from providers/intelligence
//       (NVIDIA → Groq → OpenRouter; Gemini deliberately skipped).
//     - Each generation creates a SCOPED chain instance via runScoped();
//       provider health (NVIDIA disabled, Groq disabled, etc.) carries
//       across every service call inside this pipeline run.
//
//   STAGES (12, down from 15 in V2)
//     1. ingest    — compute target chunk size, validate text
//     2. ocr       — NVIDIA-only, currently a graceful no-op
//     3. chunk     — semanticChunk (≤30 chunks, scaled target)
//     4. extract   — ONE AI call per chunk via pLimit(2). Single rich JSON
//                    response per chunk supplies definitions / formulas /
//                    examples / tips / important points — NO further
//                    enrichment passes.
//     5. merge     — local-only dedupe + normalisation, zero AI
//     6. rewrite   — single AI polish call (replaces V2's chapter
//                    finalise + the 4 separate enrichment passes)
//     7. flashcards (parallel) — 1 AI call
//     8. quiz       (parallel) — 1 AI call
//     9. viva       (parallel) — 1 AI call
//    10. mindmap    (parallel) — 1 AI call
//    11. diagrams   — NVIDIA Cosmos, currently a graceful no-op
//    12. compose    — local assembly of sections[] + insights, zero AI
//
//   TOTAL AI CALLS
//     ≤30 (chunks) + 1 (rewrite) + 4 (flashcards/quiz/viva/mindmap) = ≤35
//     — vs V2's ≤30 (chunks) + 1 (chapter finalise) + 4 (enrichment) +
//        4 (bundle) = ≤39 in the most chunk-heavy case. The savings are
//     bigger than they look because each V2 enrichment pass on a
//     ~30-resource list could be ~10x larger than a bundle call. V3 also
//     eliminates the per-resource fan-out variance entirely.
//
//   PROGRESS REPORTING
//     Stage events flow through pipelineRegistry to the SSE handler the
//     frontend subscribes to. The 12-stage shape is exposed via
//     `PIPELINE_STAGE_PLAN` so the SSE handler can send the plan
//     up-front and the UI renders every stage row before events arrive.
// ─────────────────────────────────────────────────────────────────────────────

import {
    beginPipeline,
    startStage,
    updateStageProgress,
    completeStage,
    failStage,
    skipStage,
    publishInsights,
    completePipeline,
    failPipeline,
} from './pipelineRegistry.js';

import { intelligenceChain } from '../providers/intelligence.js';
import { pLimit } from './concurrency.js';

import { computeTargetWords } from './chunkService.js';
import { reduceDocumentForAI } from './documentReductionService.js';
import {
    extractChunk,
    mergeChunkResults,
    rewriteMergedDocument,
} from './summaryService.js';
import { generateFlashcards } from './flashcardService.js';
import { generateQuiz } from './quizService.js';
import { generateVivaQuestions } from './vivaService.js';
import { generateMindMap } from './mindmapService.js';
import { runOcrIfNeeded } from './ocrService.js';
import { detectAndExplainDiagrams } from './diagramService.js';

import { targetWordsFor } from './shared/studyGoalConfig.js';

// V3 spec: maximum concurrent AI requests = 3; recommended = 2. We pick 2
// to stay comfortably inside every provider's free-tier rate limits while
// still doubling chunk-extraction throughput vs the V2 sequential loop.
const CHUNK_CONCURRENCY = 2;

// ─── stage plan (12 visible stages) ─────────────────────────────────────────

const STAGE_PLAN = [
    { id: 'ingest', label: 'Ingesting document' },
    { id: 'ocr', label: 'OCR (scanned-page recovery)' },
    { id: 'chunk', label: 'Reducing document before AI' },
    { id: 'extract', label: 'Generating mini summaries' },
    { id: 'merge', label: 'Merging mini summaries' },
    { id: 'rewrite', label: 'Generating final summary JSON' },
    { id: 'flashcards', label: 'Generating flashcards' },
    { id: 'quiz', label: 'Generating quiz' },
    { id: 'viva', label: 'Generating viva questions' },
    { id: 'mindmap', label: 'Generating mind map' },
    { id: 'diagrams', label: 'Understanding diagrams' },
    { id: 'compose', label: 'Assembling final summary' },
];

export const PIPELINE_STAGE_PLAN = STAGE_PLAN;

// ─── small utility helpers ───────────────────────────────────────────────────

const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 64) || 'section';

const wordCount = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);

// ─── compose step (LOCAL — no AI) ───────────────────────────────────────────
//
// Build the V1-compatible sections[] + rawMarkdown view from the V3 rich
// data. Keeping the markdown view alongside the structured fields means
// the existing summary viewer + PDF builder keep working unchanged while
// the new V3 frontend can opt into the rich fields for richer cards.

const composeFinalDoc = ({
    finalChapters,
    enrichedDefinitions,
    enrichedFormulas,
    enrichedExamples,
    keyConcepts,
    tips,
    importantPoints,
    mindmap,
    settings,
    diagrams = [],
}) => {
    const adv = settings.advancedOptions || {};
    const sections = [];

    // Chapter list with stable anchors so the TOC can deep-link to them.
    const chapters = finalChapters.chapters.map((c) => ({
        anchor: slugify(c.title),
        title: c.title,
        content: c.content,
    }));

    const tableOfContents = chapters.map((c) => ({
        anchor: c.anchor,
        title: c.title,
        depth: 1,
    }));

    if (adv.includeToc !== false && chapters.length > 1) {
        sections.push({
            kind: 'toc',
            title: 'Table of Contents',
            anchor: 'toc',
            content: tableOfContents
                .map((t, i) => `${i + 1}. ${t.title}`)
                .join('\n'),
        });
    }

    for (const c of chapters) {
        sections.push({
            kind: 'chapter',
            title: c.title,
            anchor: c.anchor,
            content: c.content,
        });
    }

    if (adv.preserveDefinitions !== false && enrichedDefinitions.length) {
        sections.push({
            kind: 'definitions',
            title: 'Important Definitions',
            anchor: 'definitions',
            content: enrichedDefinitions
                .map((d) => `**${d.term}** — ${d.definition}`)
                .join('\n\n'),
        });
    }

    if (keyConcepts.length) {
        sections.push({
            kind: 'concepts',
            title: 'Key Concepts',
            anchor: 'concepts',
            content: keyConcepts
                .map((c) => `**${c.title}** — ${c.explanation}`)
                .join('\n\n'),
        });
    }

    if (adv.preserveFormulas !== false && enrichedFormulas.length) {
        sections.push({
            kind: 'formulas',
            title: 'Formula Sheet',
            anchor: 'formulas',
            content: enrichedFormulas
                .map((f) => {
                    const lines = [`**${f.name}**`];
                    if (f.expression) lines.push(`\`${f.expression}\``);
                    if (f.variables) lines.push(`_Variables:_ ${f.variables}`);
                    if (f.explanation) lines.push(f.explanation);
                    return lines.join('\n\n');
                })
                .join('\n\n---\n\n'),
        });
    }

    if (adv.keepExamples !== false && enrichedExamples.length) {
        sections.push({
            kind: 'examples',
            title: 'Important Examples',
            anchor: 'examples',
            content: enrichedExamples
                .map((e) => {
                    const lines = [`**${e.title}**`];
                    if (e.conceptExample)
                        lines.push(`_Concept:_ ${e.conceptExample}`);
                    if (e.realWorldExample)
                        lines.push(`_Real-world:_ ${e.realWorldExample}`);
                    return lines.join('\n\n');
                })
                .join('\n\n---\n\n'),
        });
    }

    if (adv.explainDiagrams && diagrams.length) {
        sections.push({
            kind: 'mindmap',
            title: 'Diagrams Explained',
            anchor: 'diagrams-explained',
            content: diagrams
                .map((d) => `**${d.title}**\n\n${d.content || ''}`)
                .join('\n\n---\n\n'),
        });
    }

    if (tips.length) {
        sections.push({
            kind: 'tips',
            title: 'Exam Tips',
            anchor: 'tips',
            content: tips.map((t) => `- ${t}`).join('\n'),
        });
    }

    // High-yield bullets — V3 extracts these per chunk; if any survive
    // the merge, surface them as a top-of-summary "must remember" rail.
    if (importantPoints.length) {
        sections.push({
            kind: 'tips',
            title: 'Important Points',
            anchor: 'important-points',
            content: importantPoints.map((p) => `- ${p}`).join('\n'),
        });
    }

    if (mindmap.outlineMarkdown) {
        sections.push({
            kind: 'mindmap',
            title: 'Mind Map',
            anchor: 'mindmap',
            content: mindmap.outlineMarkdown,
        });
    }

    const rawMarkdown = sections
        .map((s) => `# ${s.title}\n\n${s.content}`)
        .join('\n\n---\n\n');

    return { chapters, tableOfContents, sections, rawMarkdown };
};

// ─── insights (LOCAL — no AI) ───────────────────────────────────────────────

const computeInsights = ({
    chapters,
    enrichedDefinitions,
    enrichedFormulas,
    enrichedExamples,
    keyConcepts,
    flashcards,
    quiz,
    vivaQuestions,
    diagrams,
    rawMarkdown,
    targetWords,
    reductionMetrics = null,
}) => {
    const actualWords = wordCount(rawMarkdown);
    // V3 spec: reading time = words / 220 (slightly slower than V2's 250
    // — better calibrated for study material vs casual reading).
    const estimatedReadingTime = Math.max(1, Math.round(actualWords / 220));

    // Local difficulty heuristic — denser material (more formulas / unique
    // definitions / diagrams) reads harder. No AI involved.
    let score = 0;
    score += enrichedFormulas.length * 2;
    score += enrichedDefinitions.length;
    score += keyConcepts.length;
    score += diagrams * 1.5;
    let difficulty = 'medium';
    if (score < 8) difficulty = 'easy';
    else if (score > 30) difficulty = 'hard';

    return {
        chapterCount: chapters.length,
        formulaCount: enrichedFormulas.length,
        definitionCount: enrichedDefinitions.length,
        diagramCount: diagrams,
        keyConceptCount: keyConcepts.length,
        flashcardCount: flashcards.length,
        quizCount: quiz.length,
        vivaCount: vivaQuestions.length,
        estimatedReadingTime,
        difficulty,
        targetWords,
        actualWords,
        sourceWordCount: reductionMetrics?.sourceWordCount || 0,
        cleanedWordCount: reductionMetrics?.cleanedWordCount || 0,
        candidateChunkCount: reductionMetrics?.candidateChunkCount || 0,
        selectedChunkCount: reductionMetrics?.selectedChunkCount || 0,
        selectedWordCount: reductionMetrics?.selectedWordCount || 0,
        tokenReductionPercent: reductionMetrics?.tokenReductionPercent || 0,
    };
};

// ─── main orchestrator ──────────────────────────────────────────────────────

/**
 * Run the full V3 AI Document Intelligence pipeline.
 *
 * @param {Object} args
 * @param {string} args.summaryId    AISummary id (drives progress events).
 * @param {string} args.text         Full extracted source text.
 * @param {Object} args.settings     Normalised settings object.
 * @param {Object} [args.sourceMeta] Optional source metadata for advanced
 *                                    stages (filePath for OCR / diagrams,
 *                                    numPages for the scanned-doc heuristic).
 * @returns {Promise<Object>}        Populated rich-data shape ready for the
 *                                    controller to merge into the AISummary
 *                                    document.
 */
export const runIntelligencePipeline = async ({
    summaryId,
    text,
    settings,
    sourceMeta = {},
}) => {
    const adv = settings.advancedOptions || {};

    // Plan + announce up-front so the SSE handler can send the full stage
    // list to subscribers immediately on connect.
    beginPipeline(summaryId, STAGE_PLAN);

    // Per-generation provider scope. NVIDIA / Groq / OpenRouter health
    // tracked together for the lifetime of this run.
    const chain = intelligenceChain.runScoped();
    console.log(
        `[AI Intelligence] pipeline start: scope=${chain.scopeId} · providers=${chain.getActiveProviders().join(',')}`
    );

    const sourceWordCount = wordCount(text);
    const computedTarget = computeTargetWords(sourceWordCount);
    const settingsTarget = targetWordsFor(settings.summaryLength, sourceWordCount);

    // Live insights bucket — updated incrementally as chunk extraction
    // progresses so the side rail ticks up smoothly.
    const insightsSoFar = {
        chapterCount: 0,
        formulaCount: 0,
        definitionCount: 0,
        diagramCount: 0,
        keyConceptCount: 0,
        flashcardCount: 0,
        quizCount: 0,
        vivaCount: 0,
        estimatedReadingTime: 0,
        difficulty: 'medium',
        targetWords: settingsTarget,
        actualWords: 0,
    };

    try {
        // ── 1. ingest ──────────────────────────────────────────────────
        startStage(summaryId, 'ingest');
        if (!text || text.trim().length < 50) {
            throw new Error('Source document does not contain enough text to summarise.');
        }
        completeStage(summaryId, 'ingest', {
            sourceWordCount,
            chunkTargetWords: computedTarget,
        });

        // ── 2. ocr (NVIDIA-only; gracefully skips without key) ─────────
        startStage(summaryId, 'ocr');
        let workingText = text;
        try {
            const ocrResult = await runOcrIfNeeded({
                text,
                numPages: sourceMeta.numPages || 0,
                filePath: sourceMeta.filePath,
            });
            if (ocrResult.skipped) {
                skipStage(summaryId, 'ocr', ocrResult.reason);
            } else {
                workingText = ocrResult.text;
                completeStage(summaryId, 'ocr', {
                    ocrWords: ocrResult.detection?.totalWords,
                });
            }
        } catch (err) {
            console.error('OCR stage threw unexpectedly:', err);
            skipStage(summaryId, 'ocr', `Unexpected OCR error: ${err.message}`);
        }

        // ── 3. chunk ───────────────────────────────────────────────────
        startStage(summaryId, 'chunk');
        const reduced = reduceDocumentForAI(workingText, { budgetRatio: 0.3 });
        const chunks = reduced.selectedChunks;
        if (!chunks.length) {
            throw new Error('Document reduction produced no usable chunks.');
        }
        insightsSoFar.chapterCount = reduced.metrics.chapterCount;
        publishInsights(summaryId, {
            ...insightsSoFar,
            sourceWordCount: reduced.metrics.sourceWordCount,
            selectedWordCount: reduced.metrics.selectedWordCount,
            tokenReductionPercent: reduced.metrics.tokenReductionPercent,
        });
        completeStage(summaryId, 'chunk', {
            chapterCount: reduced.metrics.chapterCount,
            candidateChunkCount: reduced.metrics.candidateChunkCount,
            selectedChunkCount: reduced.metrics.selectedChunkCount,
            sourceWordCount: reduced.metrics.sourceWordCount,
            selectedWordCount: reduced.metrics.selectedWordCount,
            tokenReductionPercent: reduced.metrics.tokenReductionPercent,
            chunkTargetWords: computedTarget,
        });

        // ── 4. extract (concurrency = 2) ───────────────────────────────
        startStage(summaryId, 'extract');
        // V3: bounded parallelism. pLimit(2) gives us ~2× the throughput
        // of the V2 sequential loop while staying well inside every free-
        // tier rate limit. We pre-allocate the result array so the merge
        // step sees results in chunk order regardless of completion order.
        const limit = pLimit(CHUNK_CONCURRENCY);
        const chunkResults = new Array(chunks.length);
        let extractsCompleted = 0;
        await Promise.all(
            chunks.map((chunk, i) =>
                limit(async () => {
                    const result = await extractChunk({
                        chunk,
                        settings,
                        totalChunks: chunks.length,
                        chain,
                    });
                    chunkResults[i] = result;

                    // Live progress + incremental insights so the side
                    // rail counts up even while extraction is still in
                    // flight on other chunks.
                    extractsCompleted += 1;
                    const pct = Math.round((extractsCompleted / chunks.length) * 100);
                    updateStageProgress(summaryId, 'extract', pct, {
                        completed: extractsCompleted,
                        totalChunks: chunks.length,
                        selectedWordCount: reduced.metrics.selectedWordCount,
                        tokenReductionPercent: reduced.metrics.tokenReductionPercent,
                    });
                    insightsSoFar.definitionCount += (result.definitions || []).length;
                    insightsSoFar.formulaCount += (result.formulas || []).length;
                    insightsSoFar.keyConceptCount += (result.keyConcepts || []).length;
                    publishInsights(summaryId, { ...insightsSoFar });
                })
            )
        );
        completeStage(summaryId, 'extract', {
            extractedChunks: chunkResults.filter(Boolean).length,
            tokenReductionPercent: reduced.metrics.tokenReductionPercent,
        });

        // ── 5. merge (LOCAL) ───────────────────────────────────────────
        startStage(summaryId, 'merge');
        const merged = mergeChunkResults(chunkResults);
        // Refresh insights with deduped counts.
        insightsSoFar.chapterCount = merged.chapters.length;
        insightsSoFar.definitionCount = merged.definitions.length;
        insightsSoFar.formulaCount = merged.formulas.length;
        insightsSoFar.keyConceptCount = merged.keyConcepts.length;
        publishInsights(summaryId, { ...insightsSoFar });
        completeStage(summaryId, 'merge', {
            chapters: merged.chapters.length,
            definitions: merged.definitions.length,
            formulas: merged.formulas.length,
            concepts: merged.keyConcepts.length,
            examples: merged.examples.length,
            tips: merged.examTips.length,
        });

        // ── 6. rewrite (single AI polish pass) ─────────────────────────
        startStage(summaryId, 'rewrite');
        const finalChapters = await rewriteMergedDocument({
            merged,
            settings,
            targetWords: settingsTarget,
            chain,
        });
        insightsSoFar.chapterCount = finalChapters.chapters.length;
        publishInsights(summaryId, { ...insightsSoFar });
        completeStage(summaryId, 'rewrite', {
            chapterCount: finalChapters.chapters.length,
        });

        // ── 7–10. bundle (parallel) + 11. diagrams (parallel) ──────────
        // Five mutually-independent AI calls (and one no-op stub). Running
        // them in parallel saves ~4 sequential round-trips.
        startStage(summaryId, 'flashcards');
        startStage(summaryId, 'quiz');
        startStage(summaryId, 'viva');
        startStage(summaryId, 'mindmap');
        startStage(summaryId, 'diagrams');

        const flashcardP = generateFlashcards({
            chapters: finalChapters.chapters,
            settings,
            chain,
        })
            .then((r) => {
                completeStage(summaryId, 'flashcards', { count: r.length });
                insightsSoFar.flashcardCount = r.length;
                publishInsights(summaryId, { ...insightsSoFar });
                return r;
            })
            .catch((err) => {
                failStage(summaryId, 'flashcards', err);
                return [];
            });

        const quizP = generateQuiz({
            chapters: finalChapters.chapters,
            settings,
            chain,
        })
            .then((r) => {
                completeStage(summaryId, 'quiz', { count: r.length });
                insightsSoFar.quizCount = r.length;
                publishInsights(summaryId, { ...insightsSoFar });
                return r;
            })
            .catch((err) => {
                failStage(summaryId, 'quiz', err);
                return [];
            });

        const vivaP = generateVivaQuestions({
            chapters: finalChapters.chapters,
            settings,
            chain,
        })
            .then((r) => {
                completeStage(summaryId, 'viva', { count: r.length });
                insightsSoFar.vivaCount = r.length;
                publishInsights(summaryId, { ...insightsSoFar });
                return r;
            })
            .catch((err) => {
                failStage(summaryId, 'viva', err);
                return [];
            });

        const mindmapP = generateMindMap({
    chapters: finalChapters.chapters,
    definitions: merged.definitions,
    keyConcepts: merged.keyConcepts,
    formulas: merged.formulas,
    examples: merged.examples,
    importantPoints: merged.importantPoints,
    examTips: merged.examTips,
    settings,
    chain,
})
    .then((r) => {
        completeStage(summaryId, 'mindmap', { hasMermaid: !!r.mermaid });
        return r;
    })
    .catch((err) => {
        failStage(summaryId, 'mindmap', err);
        return { mermaid: '', outlineMarkdown: '' };
    });

        // Diagram detection — currently always skips today (NVIDIA pipeline
        // not yet enabled). When NVIDIA_API_KEY is provisioned + the
        // diagramService's IMPLEMENTATION_READY flag is flipped, this
        // populates rich diagram cards alongside the bundle.
        const diagramsP = detectAndExplainDiagrams({
            filePath: sourceMeta.filePath,
            settings,
        })
            .then((r) => {
                if (r.skipped) {
                    skipStage(summaryId, 'diagrams', r.reason);
                } else {
                    completeStage(summaryId, 'diagrams', {
                        count: r.diagrams.length,
                    });
                    insightsSoFar.diagramCount = r.diagrams.length;
                    publishInsights(summaryId, { ...insightsSoFar });
                }
                return r.diagrams;
            })
            .catch((err) => {
                failStage(summaryId, 'diagrams', err);
                return [];
            });

        const [flashcards, quiz, vivaQuestions, mindmap, visionDiagrams] =
            await Promise.all([flashcardP, quizP, vivaP, mindmapP, diagramsP]);

        // ── 12. compose (LOCAL — no AI) ────────────────────────────────
        startStage(summaryId, 'compose');

        // Build the enriched shapes. V3: definitions / formulas / examples
        // come straight from the merged chunk JSON, NOT from a separate
        // enrichment call. The viewer's RichCardsView handles the simpler
        // shape gracefully (empty optional fields just don't render).
        const enrichedDefinitions = merged.definitions.map((d) => ({
            term: d.title,
            definition: d.content,
            // V2 also tried to fill simpleExplanation / analogy / importance /
            // examQuestion / interviewQuestion via a separate AI call. V3
            // drops those fields rather than burning tokens on enrichment;
            // they remain on the schema as optional defaults.
            simpleExplanation: '',
            analogy: '',
            importance: '',
            examQuestion: '',
            interviewQuestion: '',
        }));

        const enrichedFormulas = merged.formulas.map((f) => {
            const raw = f.raw || {};
            return {
                name: raw.name || f.title,
                expression: raw.expression || '',
                variables: raw.variables || '',
                explanation: raw.notes || '',
                example: '',
                examImportance: 'medium',
                interviewImportance: 'medium',
            };
        });

        const enrichedExamples = merged.examples.map((e) => ({
            title: e.title,
            conceptExample: e.content,
            realWorldExample: '',
            examExample: '',
            interviewExample: '',
        }));

        const keyConcepts = merged.keyConcepts.map((c) => ({
            title: c.title,
            explanation: c.content,
        }));

        // Merge text-mentioned diagrams (none today — V3 dropped the per-
        // chunk diagram extraction) with vision-detected ones.
        const allDiagrams = (visionDiagrams || []).map((d) => ({
            title: d.title,
            content: [
                d.description,
                d.mermaid && `\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``,
            ]
                .filter(Boolean)
                .join(''),
        }));

        const composed = composeFinalDoc({
            finalChapters,
            enrichedDefinitions,
            enrichedFormulas,
            enrichedExamples,
            keyConcepts,
            tips: merged.examTips,
            importantPoints: merged.importantPoints,
            mindmap,
            settings,
            diagrams: allDiagrams,
        });

        const insights = computeInsights({
            chapters: composed.chapters,
            enrichedDefinitions,
            enrichedFormulas,
            enrichedExamples,
            keyConcepts,
            flashcards,
            quiz,
            vivaQuestions,
            diagrams: allDiagrams.length,
            rawMarkdown: composed.rawMarkdown,
            targetWords: settingsTarget,
            reductionMetrics: reduced.metrics,
        });
        completeStage(summaryId, 'compose');

        // Final pipeline event so SSE clients get the consolidated insights
        // in one message (useful for late subscribers).
        completePipeline(summaryId, {
            insights,
            provider: {
                activeProviders: chain.getActiveProviders(),
                disabledProviders: chain.getDisabledProviders(),
            },
        });

        return {
            chapters: composed.chapters,
            tableOfContents: composed.tableOfContents,
            sections: composed.sections,
            rawMarkdown: composed.rawMarkdown,
            richDefinitions: enrichedDefinitions,
            richFormulas: enrichedFormulas,
            richExamples: enrichedExamples,
            keyConcepts,
            examTips: merged.examTips,
            flashcards,
            quiz,
            vivaQuestions,
            mindmap,
            insights,
        };
    } catch (err) {
        failPipeline(summaryId, err);
        throw err;
    }
};
