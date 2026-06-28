// ─────────────────────────────────────────────────────────────────────────────
// intelligencePipeline
//
// The single orchestrator that drives an AI Document Intelligence
// generation end-to-end. Composes every service in /services in the
// right order, emits progress events to the pipelineRegistry, and
// returns the populated rich-data shape ready to be merged into an
// AISummary document.
//
// Stage plan:
//   ingest        — wrap the source text + compute initial metrics
//   chunk         — semanticChunk()
//   extract       — extractChunk() per chunk, then mergeChunkResults()
//   chapters      — finaliseChapters() (rewrite + reorder)
//   definitions   — enrichDefinitions()        (skip-able)
//   formulas      — enrichFormulas()           (skip-able)
//   examples      — enrichExamples()           (skip-able)
//   tips          — polishExamTips()
//   flashcards    — generateFlashcards()       (bundle, parallel)
//   quiz          — generateQuiz()             (bundle, parallel)
//   viva          — generateVivaQuestions()    (bundle, parallel)
//   mindmap       — generateMindMap()          (bundle, parallel)
//   compose       — build sections[] + rawMarkdown + TOC + insights
//
// The bundle stages run in parallel via Promise.all because they're
// mutually independent and each is its own provider call — running
// them sequentially would unnecessarily double the wall-clock time of
// generation.
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

import { semanticChunk } from './chunkService.js';
import {
    extractChunk,
    mergeChunkResults,
    finaliseChapters,
} from './summaryService.js';
import { enrichDefinitions } from './definitionService.js';
import { enrichFormulas } from './formulaService.js';
import { enrichExamples } from './exampleService.js';
import { polishExamTips } from './examTipService.js';
import { generateFlashcards } from './flashcardService.js';
import { generateQuiz } from './quizService.js';
import { generateVivaQuestions } from './vivaService.js';
import { generateMindMap } from './mindmapService.js';
import { runOcrIfNeeded } from './ocrService.js';
import { detectAndExplainDiagrams } from './diagramService.js';

import { targetWordsFor } from './shared/studyGoalConfig.js';

// ─── stage plan ──────────────────────────────────────────────────────────────

const STAGE_PLAN = [
    { id: 'ingest', label: 'Ingesting document' },
    { id: 'ocr', label: 'OCR (scanned-page recovery)' },
    { id: 'chunk', label: 'Splitting into semantic chunks' },
    { id: 'extract', label: 'AI processing each chunk' },
    { id: 'chapters', label: 'Polishing chapter summaries' },
    { id: 'definitions', label: 'Enriching definitions' },
    { id: 'formulas', label: 'Enriching formulas' },
    { id: 'examples', label: 'Enriching examples' },
    { id: 'diagrams', label: 'Understanding diagrams' },
    { id: 'tips', label: 'Curating exam tips' },
    { id: 'flashcards', label: 'Generating flashcards' },
    { id: 'quiz', label: 'Generating quiz' },
    { id: 'viva', label: 'Generating viva questions' },
    { id: 'mindmap', label: 'Generating mind map' },
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

// ─── compose stage ───────────────────────────────────────────────────────────
// Build the V1-compatible sections[] + rawMarkdown view, plus the TOC.
// Keeping the markdown view alongside the rich shapes means the existing
// summary viewer + PDF builder keep working unchanged while the new V2
// frontend can opt in to the rich fields whenever it's ready to render
// them.

const composeFinalDoc = ({
    finalChapters,
    enrichedDefinitions,
    enrichedFormulas,
    enrichedExamples,
    keyConcepts,
    tips,
    mindmap,
    settings,
    diagrams = [],
}) => {
    const adv = settings.advancedOptions || {};
    const sections = [];

    // Chapters with anchors so the TOC can deep-link to them.
    const chapters = finalChapters.chapters.map((c) => ({
        anchor: slugify(c.title),
        title: c.title,
        content: c.content,
    }));

    // Table of contents (just chapter-level for now; sub-headings would
    // require parsing the chapter markdown).
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
                .map((d) => {
                    const lines = [`**${d.term}** — ${d.definition}`];
                    if (d.simpleExplanation)
                        lines.push(`_Plain language:_ ${d.simpleExplanation}`);
                    if (d.analogy) lines.push(`_Analogy:_ ${d.analogy}`);
                    if (d.importance) lines.push(`_Why it matters:_ ${d.importance}`);
                    if (d.examQuestion)
                        lines.push(`_Likely exam Q:_ ${d.examQuestion}`);
                    if (d.interviewQuestion)
                        lines.push(`_Likely interview Q:_ ${d.interviewQuestion}`);
                    return lines.join('\n\n');
                })
                .join('\n\n---\n\n'),
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
                    if (f.example) lines.push(`_Example:_ ${f.example}`);
                    if (f.examImportance || f.interviewImportance) {
                        lines.push(
                            `_Importance:_ exam=${f.examImportance}, interview=${f.interviewImportance}`
                        );
                    }
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
                    if (e.examExample)
                        lines.push(`_Exam variant:_ ${e.examExample}`);
                    if (e.interviewExample)
                        lines.push(`_Interview variant:_ ${e.interviewExample}`);
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
}) => {
    const actualWords = wordCount(rawMarkdown);
    // ~250 words/minute comfortable reading.
    const estimatedReadingTime = Math.max(1, Math.round(actualWords / 250));

    // Difficulty heuristic: denser source material (more formulas + unique
    // definitions + concepts) → harder.
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
    };
};

// ─── main orchestrator ──────────────────────────────────────────────────────

/**
 * Run the full AI Document Intelligence pipeline.
 *
 * @param {Object} args
 * @param {string} args.summaryId   AISummary id (used for progress events).
 * @param {string} args.text        Full extracted source text.
 * @param {Object} args.settings    Normalised settings object.
 * @param {Object} [args.sourceMeta] Optional source metadata for advanced
 *                                   stages — `filePath` lets OCR/diagram
 *                                   services hit the raw PDF, `numPages`
 *                                   feeds the scanned-doc heuristic.
 * @returns {Promise<Object>}       Populated rich-data shape ready to merge
 *                                  into the AISummary document.
 */
export const runIntelligencePipeline = async ({
    summaryId,
    text,
    settings,
    sourceMeta = {},
}) => {
    const adv = settings.advancedOptions || {};

    // Build the actual stage plan we'll execute. Skip-able stages are
    // included so the UI shows a "skipped" marker rather than an absent
    // step (clearer to the user).
    const plan = STAGE_PLAN.slice();
    beginPipeline(summaryId, plan);

    const sourceWordCount = wordCount(text);
    const targetWords = targetWordsFor(settings.summaryLength, sourceWordCount);
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
        targetWords,
        actualWords: 0,
    };

    try {
        // ── ingest ──────────────────────────────────────────────────────
        startStage(summaryId, 'ingest');
        if (!text || text.trim().length < 50) {
            throw new Error('Source document does not contain enough text to summarise.');
        }
        completeStage(summaryId, 'ingest');

        // ── ocr (NVIDIA Nemotron OCR v2 — only fires if scanned + key) ──
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
            // OCR failure is never fatal — we just continue with the
            // original text and surface a skipped marker so the UI shows
            // something happened.
            console.error('OCR stage threw unexpectedly:', err);
            skipStage(summaryId, 'ocr', `Unexpected OCR error: ${err.message}`);
        }

        // ── chunk ───────────────────────────────────────────────────────
        startStage(summaryId, 'chunk');
        const chunks = semanticChunk(workingText);
        completeStage(summaryId, 'chunk', { chunkCount: chunks.length });

        // ── extract (per chunk) ─────────────────────────────────────────
        startStage(summaryId, 'extract');
        const chunkResults = [];
        for (let i = 0; i < chunks.length; i++) {
            const c = chunks[i];
            try {
                const result = await extractChunk({
                    chunk: c,
                    settings,
                    totalChunks: chunks.length,
                });
                chunkResults.push(result);
            } catch (err) {
                console.error(`Chunk ${i + 1}/${chunks.length} failed:`, err.message);
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
            // Per-chunk progress update — the Processing Screen uses these
            // to animate the "AI processing each chunk" bar smoothly even
            // for very long documents.
            const pct = Math.round(((i + 1) / chunks.length) * 100);
            updateStageProgress(summaryId, 'extract', pct, {
                chunkIndex: i + 1,
                totalChunks: chunks.length,
            });

            // Live insights — update the running totals so the side rail
            // ticks up as material is extracted.
            insightsSoFar.definitionCount += (chunkResults[i].definitions || []).length;
            insightsSoFar.formulaCount += (chunkResults[i].formulas || []).length;
            insightsSoFar.diagramCount += (chunkResults[i].diagrams || []).length;
            insightsSoFar.keyConceptCount += (chunkResults[i].concepts || []).length;
            publishInsights(summaryId, { ...insightsSoFar });
        }
        const merged = mergeChunkResults(chunkResults);

        // Refresh insights with deduped counts.
        insightsSoFar.chapterCount = merged.chapters.length;
        insightsSoFar.definitionCount = merged.definitions.length;
        insightsSoFar.formulaCount = merged.formulas.length;
        insightsSoFar.diagramCount = merged.diagrams.length;
        insightsSoFar.keyConceptCount = merged.concepts.length;
        publishInsights(summaryId, { ...insightsSoFar });
        completeStage(summaryId, 'extract');

        // ── chapters (polish + reorder) ─────────────────────────────────
        startStage(summaryId, 'chapters');
        const finalChapters = await finaliseChapters({
            merged,
            settings,
            targetWords,
        });
        insightsSoFar.chapterCount = finalChapters.chapters.length;
        publishInsights(summaryId, { ...insightsSoFar });
        completeStage(summaryId, 'chapters', {
            chapterCount: finalChapters.chapters.length,
        });

        // ── definitions ─────────────────────────────────────────────────
        let enrichedDefinitions = [];
        if (adv.preserveDefinitions === false) {
            skipStage(summaryId, 'definitions', 'preserveDefinitions disabled');
        } else if (!merged.definitions.length) {
            skipStage(summaryId, 'definitions', 'no definitions extracted');
        } else {
            startStage(summaryId, 'definitions');
            enrichedDefinitions = await enrichDefinitions({
                rawDefinitions: merged.definitions,
                settings,
            });
            insightsSoFar.definitionCount = enrichedDefinitions.length;
            publishInsights(summaryId, { ...insightsSoFar });
            completeStage(summaryId, 'definitions');
        }

        // ── formulas ────────────────────────────────────────────────────
        let enrichedFormulas = [];
        if (adv.preserveFormulas === false) {
            skipStage(summaryId, 'formulas', 'preserveFormulas disabled');
        } else if (!merged.formulas.length) {
            skipStage(summaryId, 'formulas', 'no formulas extracted');
        } else {
            startStage(summaryId, 'formulas');
            enrichedFormulas = await enrichFormulas({
                rawFormulas: merged.formulas,
                settings,
            });
            insightsSoFar.formulaCount = enrichedFormulas.length;
            publishInsights(summaryId, { ...insightsSoFar });
            completeStage(summaryId, 'formulas');
        }

        // ── examples ────────────────────────────────────────────────────
        let enrichedExamples = [];
        if (adv.keepExamples === false) {
            skipStage(summaryId, 'examples', 'keepExamples disabled');
        } else if (!merged.examples.length) {
            skipStage(summaryId, 'examples', 'no examples extracted');
        } else {
            startStage(summaryId, 'examples');
            enrichedExamples = await enrichExamples({
                rawExamples: merged.examples,
                settings,
            });
            completeStage(summaryId, 'examples');
        }

        // ── tips ────────────────────────────────────────────────────────
        startStage(summaryId, 'tips');
        const tips = await polishExamTips({ rawTips: merged.tips, settings });
        completeStage(summaryId, 'tips');

        // ── bundle (parallel) ───────────────────────────────────────────
        // These five stages are mutually independent. Running them in
        // parallel cuts ~4 round-trips of wall-clock latency off every
        // generation. We mark each as "running" before kicking the lot
        // off so the UI shows them all spinning together, then completes
        // them individually as their promises resolve.
        startStage(summaryId, 'flashcards');
        startStage(summaryId, 'quiz');
        startStage(summaryId, 'viva');
        startStage(summaryId, 'mindmap');
        startStage(summaryId, 'diagrams');

        const flashcardP = generateFlashcards({
            chapters: finalChapters.chapters,
            settings,
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
            settings,
        })
            .then((r) => {
                completeStage(summaryId, 'mindmap', {
                    hasMermaid: !!r.mermaid,
                });
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
                    insightsSoFar.diagramCount =
                        merged.diagrams.length + r.diagrams.length;
                    publishInsights(summaryId, { ...insightsSoFar });
                }
                return r.diagrams;
            })
            .catch((err) => {
                failStage(summaryId, 'diagrams', err);
                return [];
            });

        const [flashcards, quiz, vivaQuestions, mindmap, visionDiagrams] =
            await Promise.all([
                flashcardP,
                quizP,
                vivaP,
                mindmapP,
                diagramsP,
            ]);

        // ── compose ─────────────────────────────────────────────────────
        startStage(summaryId, 'compose');
        // Use chapter `concepts` from the merged result as the keyConcepts
        // bag for the final document. We don't currently run an enrichment
        // pass on these — they're already short.
        const keyConcepts = merged.concepts.map((c) => ({
            title: c.title,
            explanation: c.content,
        }));

        // Merge text-mentioned diagrams with vision-detected diagrams. The
        // vision side is empty today (NVIDIA pipeline not yet enabled) but
        // the structure is in place so enabling it doesn't require any
        // further changes here.
        const allDiagrams = [
            ...merged.diagrams,
            ...(visionDiagrams || []).map((d) => ({
                title: d.title,
                content: [d.description, d.mermaid && `\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``]
                    .filter(Boolean)
                    .join(''),
            })),
        ];

        const composed = composeFinalDoc({
            finalChapters,
            enrichedDefinitions,
            enrichedFormulas,
            enrichedExamples,
            keyConcepts,
            tips,
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
            targetWords,
        });
        completeStage(summaryId, 'compose');

        // Final pipeline event with the consolidated insights so any SSE
        // client that joined late gets the full picture in one message.
        completePipeline(summaryId, { insights });

        return {
            chapters: composed.chapters,
            tableOfContents: composed.tableOfContents,
            sections: composed.sections,
            rawMarkdown: composed.rawMarkdown,
            richDefinitions: enrichedDefinitions,
            richFormulas: enrichedFormulas,
            richExamples: enrichedExamples,
            keyConcepts,
            examTips: tips,
            flashcards,
            quiz,
            vivaQuestions,
            mindmap,
            insights,
        };
    } catch (err) {
        // Catastrophic failure — surface it to subscribers and rethrow so
        // the controller can flip the AISummary status to 'failed'.
        failPipeline(summaryId, err);
        throw err;
    }
};
