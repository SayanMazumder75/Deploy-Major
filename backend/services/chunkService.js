// ─────────────────────────────────────────────────────────────────────────────
// chunkService (V4)
//
// Semantic chunking for the AI Document Intelligence pipeline. Hard
// requirement: produce AT MOST 30 chunks regardless of source size (target
// range ~20–30 for typical large docs), while keeping each chunk between
// roughly 1500 and 6000 words so it fits comfortably in every provider's
// context window (Groq llama-3.3-70b: 128k tokens; NVIDIA Nemotron Ultra:
// similar; OpenRouter free models: 32k+).
//
// V4 adds a NOISE-STRIPPING pass (`stripBoilerplate`) that runs before
// chunking. It removes:
//   - Non-learning sections by heading: Acknowledgements, Copyright, Index,
//     Bibliography, References, Appendix.
//   - Blank / whitespace-only pages (form-feed / empty-page artifacts from
//     PDF extraction).
//   - Repeated running headers/footers (a line that appears verbatim many
//     times across the doc — classic PDF-extraction noise).
//   - Repeated paragraphs (duplicate blocks, e.g. a disclaimer reprinted on
//     every chapter's first page).
// This shrinks the *input* to chunking, which in turn shrinks both the
// chunk count and the total tokens sent to the AI providers — the two
// biggest levers on Groq TPM usage. It runs BEFORE chunkText() in
// utils/textChunker.js too (used for document upload / chat retrieval),
// since that path had no cap at all and was the actual source of very
// high chunk counts (e.g. 182) on large PDFs.
//
// Algorithm (chunking, unchanged from V3):
//   1. Compute a target word count per chunk based on the source's total
//      word count, scaled so that we never exceed 30 chunks. For small
//      docs the target is 2500; for very large docs it grows up to
//      whatever's needed to stay at ≤30 chunks.
//   2. Walk the source line-by-line. Whenever a heading pattern matches
//      AND the current buffer is "big enough" (≥ minWords), close the
//      current chunk and start a fresh one labelled by the heading.
//   3. When the buffer exceeds the target word count, look ahead a few
//      lines for the next heading — if one's nearby, cut at it; otherwise
//      cut where we are.
//   4. Safety net: if we still exceed MAX_CHUNKS, repeatedly merge
//      adjacent chunks — preferring pairs from the SAME chapter/label
//      first, then falling back to the smallest overall pair.
//
// The heading-aware cutting means we keep chapter boundaries intact, which
// preserves chapter-level structure for the orchestrator's rewrite pass.
// ─────────────────────────────────────────────────────────────────────────────

// V3: cap on total chunk count regardless of source size.
const MAX_CHUNKS = 30;
// Soft floor we aim for on large docs so we land in the 20–30 range rather
// than always maxing out at exactly 30 — computeTargetWords scales chunk
// size to hit this range for anything above the small-doc default.
const TARGET_CHUNK_COUNT = 25;

// Minimum / maximum target word count per chunk. Targets between these
// bounds are computed dynamically from totalWords / MAX_CHUNKS.
const MIN_TARGET_WORDS = 1800;
const DEFAULT_TARGET_WORDS = 2500;
// No hard upper bound — for truly huge docs (1000+ pages) the chunks
// expand to keep us ≤MAX_CHUNKS even if each chunk is large.

// Minimum words a non-tail chunk must have before we close it on a heading.
// Prevents tiny "Chapter 1\nIntroduction" lines from each becoming their
// own chunk.
const MIN_CHUNK_WORDS = 800;

const HEADING_PATTERNS = [
    /^chapter\s+[0-9ivxlcdm]+\b.*$/im, // "Chapter 4: Vectors"
    /^\d{1,2}(?:\.\d{1,2})*\s+[A-Z][^\n]{2,80}$/m, // "1.2 Topic"
    /^[A-Z][A-Z0-9 \-,:&/]{6,80}$/m, // "INTRODUCTION TO LINEAR ALGEBRA"
    /^#{1,3}\s+.+$/m, // "## Heading"
];

// ── noise / boilerplate stripping ────────────────────────────────────────────

// Headings that mark a section contributing nothing to studying — we drop
// everything from one of these headings up to (but not including) the next
// heading of any kind.
const BOILERPLATE_HEADING_RE =
    /^(acknowledge?ments?|copyright(\s+(page|notice))?|index|bibliography|references?|works\s+cited|appendix(\s+[a-z0-9]+)?|about\s+the\s+authors?)\s*$/i;

// A line consisting only of whitespace / form-feed / page-number-ish tokens
// counts as a "blank page" artifact from PDF extraction.
const BLANK_PAGE_LINE_RE = /^[\s\f]*$|^\s*(page\s*)?\d{1,4}\s*$/i;

// A running header/footer line is short and repeats verbatim many times
// across the document. Threshold tuned conservatively so real short
// sentences (e.g. a one-line definition) aren't mistaken for noise.
const REPEATED_LINE_MAX_CHARS = 90;
const REPEATED_LINE_MIN_OCCURRENCES = 4;

/**
 * Remove non-learning sections, blank pages, and repeated headers/footers/
 * paragraphs from raw extracted text BEFORE chunking. Pure text-in,
 * text-out — no AI involved, so it's essentially free to run on every
 * document regardless of size.
 *
 * @param {string} text
 * @returns {string}
 */
export const stripBoilerplate = (text) => {
    const safe = (text || '').replace(/\r\n/g, '\n');
    if (!safe.trim()) return '';

    const rawLines = safe.split('\n');

    // ── pass 1: drop boilerplate sections + blank-page lines ──────────────
    const kept = [];
    let skippingSection = false;
    for (const line of rawLines) {
        const trimmed = line.trim();
        // A boilerplate section heading (e.g. "Copyright", "References") is
        // checked independently of the generic HEADING_PATTERNS list —
        // real books usually title these sections in plain Title Case, NOT
        // ALL CAPS / numbered / markdown, so gating this on isAnyHeading
        // would miss almost every real-world case.
        const headingCandidate = trimmed.replace(/^#+\s*/, '').replace(/^\d+(\.\d+)*\s+/, '');
        const isBoilerplateHeading = BOILERPLATE_HEADING_RE.test(headingCandidate);
        const isAnyHeading = isBoilerplateHeading || HEADING_PATTERNS.some((p) => p.test(trimmed));

        if (isBoilerplateHeading) {
            skippingSection = true;
            continue; // drop the heading line itself too
        }
        if (isAnyHeading) {
            // A "real" heading ends whatever boilerplate section we were
            // skipping and resumes normal content from here.
            skippingSection = false;
        }
        if (skippingSection) continue;
        // Drop standalone page-number artifacts ("12", "Page 12") but keep
        // genuinely blank lines — they're the paragraph separators the rest
        // of the pipeline (and pass 3 below) relies on.
        if (trimmed && BLANK_PAGE_LINE_RE.test(trimmed)) continue;

        kept.push(line);
    }

    // ── pass 2: strip repeated running headers/footers ────────────────────
    // Count verbatim occurrences of short trimmed lines. Anything repeating
    // REPEATED_LINE_MIN_OCCURRENCES+ times is almost certainly a running
    // header/footer, not real content.
    const counts = new Map();
    for (const line of kept) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length > REPEATED_LINE_MAX_CHARS) continue;
        counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
    }
    const noisyLines = new Set(
        Array.from(counts.entries())
            .filter(([, n]) => n >= REPEATED_LINE_MIN_OCCURRENCES)
            .map(([l]) => l)
    );
    const afterHeaderStrip = kept.filter((line) => !noisyLines.has(line.trim()));

    // ── pass 3: dedupe repeated paragraphs ─────────────────────────────────
    // Split into paragraph blocks (separated by blank lines), drop exact
    // duplicates after the first occurrence (e.g. a disclaimer reprinted at
    // the top of every chapter).
    const text2 = afterHeaderStrip.join('\n');
    const paragraphs = text2.split(/\n{2,}/);
    const seenParagraphs = new Set();
    const dedupedParagraphs = paragraphs.filter((p) => {
        const norm = p.trim().replace(/\s+/g, ' ').toLowerCase();
        if (norm.length < 40) return true; // too short to reliably judge as noise
        if (seenParagraphs.has(norm)) return false;
        seenParagraphs.add(norm);
        return true;
    });

    return dedupedParagraphs.join('\n\n').trim();
};

const cleanLabel = (raw) =>
    (raw || '')
        .replace(/^#+\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || null;

const findHeadingNearAfter = (lines, fromIdx, maxLookahead = 25) => {
    const limit = Math.min(lines.length, fromIdx + maxLookahead);
    for (let i = fromIdx; i < limit; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        for (const pat of HEADING_PATTERNS) {
            if (pat.test(line)) return i;
        }
    }
    return -1;
};

// ─── target-words computation ───────────────────────────────────────────────

/**
 * Decide how many words each chunk should target so we stay under
 * MAX_CHUNKS. Exposed so the orchestrator can log it.
 *
 * @param {number} totalWords
 * @returns {number}
 */
export const computeTargetWords = (totalWords) => {
    if (!totalWords) return DEFAULT_TARGET_WORDS;

    // For small + medium docs the default chunk size already keeps us
    // under MAX_CHUNKS — use it and call it a day.
    const chunksAtDefault = Math.ceil(totalWords / DEFAULT_TARGET_WORDS);
    if (chunksAtDefault <= MAX_CHUNKS) {
        return Math.max(MIN_TARGET_WORDS, DEFAULT_TARGET_WORDS);
    }

    // Otherwise scale chunk size up so we land near TARGET_CHUNK_COUNT
    // (20-30 range) rather than always maxing out exactly at MAX_CHUNKS.
    // For a 250k-word doc this lands at ~10000 words/chunk (~7500 tokens),
    // still well inside every provider's context window.
    return Math.ceil(totalWords / TARGET_CHUNK_COUNT);
};

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Split text into ≤MAX_CHUNKS heading-aware chunks.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {number} [opts.targetWords]  Override the auto-computed target.
 * @param {number} [opts.minWords]     Minimum words in a non-tail chunk.
 * @returns {Array<{index:number,label:string|null,text:string,wordCount:number}>}
 */
export const semanticChunk = (text, opts = {}) => {
    // V4: strip acknowledgements / copyright / index / bibliography /
    // references / appendix, blank pages, and repeated headers/footers/
    // paragraphs BEFORE we even count words for target sizing — this is
    // what keeps large real-world PDFs (which are often 10-20% boilerplate
    // + duplicate running headers) out of the chunk/token budget entirely.
    const safe = stripBoilerplate(text).trim();
    if (!safe) return [];

    const totalWords = safe.split(/\s+/).filter(Boolean).length;
    const targetWords = opts.targetWords || computeTargetWords(totalWords);
    const minWords = opts.minWords || MIN_CHUNK_WORDS;

    const lines = safe.split(/\r?\n/);
    const chunks = [];
    let buf = [];
    let bufWords = 0;
    let currentLabel = null;

    const flush = () => {
        if (!buf.length) return;
        const joined = buf.join('\n').trim();
        if (!joined) {
            buf = [];
            bufWords = 0;
            return;
        }
        chunks.push({
            index: chunks.length,
            label: cleanLabel(currentLabel),
            text: joined,
            wordCount: joined.split(/\s+/).filter(Boolean).length,
        });
        buf = [];
        bufWords = 0;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const isHeading = HEADING_PATTERNS.some((p) => p.test(trimmed));

        // Cut at heading boundary when we've accumulated enough material.
        if (isHeading) {
            if (bufWords >= minWords) flush();
            currentLabel = trimmed;
        }

        buf.push(line);
        if (trimmed) {
            bufWords += trimmed.split(/\s+/).filter(Boolean).length;
        }

        // Hit/exceeded target — try to cut at the next nearby heading,
        // otherwise cut where we are.
        if (bufWords >= targetWords) {
            const lookaheadCut = findHeadingNearAfter(lines, i + 1, 20);
            if (lookaheadCut !== -1 && lookaheadCut <= i + 20) {
                for (let j = i + 1; j < lookaheadCut; j++) {
                    const ln = lines[j];
                    buf.push(ln);
                    if (ln.trim()) {
                        bufWords += ln.trim().split(/\s+/).filter(Boolean).length;
                    }
                }
                i = lookaheadCut - 1;
            }
            flush();
        }
    }

    flush();

    // Safety net: if our heading-aware logic somehow produced more chunks
    // than MAX_CHUNKS (e.g. very dense small-heading documents), merge
    // pairs until we're under the cap. We prefer merging two ADJACENT
    // chunks that share the same chapter label first (keeps chapter
    // structure coherent for the rewrite stage); once no same-label pairs
    // remain, fall back to the smallest overall pair by word count.
    while (chunks.length > MAX_CHUNKS) {
        let mergeStart = -1;

        // Pass 1: smallest same-label adjacent pair.
        let smallestSameLabelWords = Infinity;
        for (let i = 0; i < chunks.length - 1; i++) {
            if (!chunks[i].label || chunks[i].label !== chunks[i + 1].label) continue;
            const pair = chunks[i].wordCount + chunks[i + 1].wordCount;
            if (pair < smallestSameLabelWords) {
                smallestSameLabelWords = pair;
                mergeStart = i;
            }
        }

        // Pass 2: fall back to the smallest pair overall.
        if (mergeStart === -1) {
            let smallestPairWords = Infinity;
            for (let i = 0; i < chunks.length - 1; i++) {
                const pair = chunks[i].wordCount + chunks[i + 1].wordCount;
                if (pair < smallestPairWords) {
                    smallestPairWords = pair;
                    mergeStart = i;
                }
            }
        }

        const a = chunks[mergeStart];
        const b = chunks[mergeStart + 1];
        chunks.splice(mergeStart, 2, {
            index: a.index, // keep first chunk's original ordering index
            label: a.label || b.label,
            text: `${a.text}\n\n${b.text}`,
            wordCount: a.wordCount + b.wordCount,
        });
        // Re-index remaining chunks so `index` stays contiguous.
        chunks.forEach((c, i) => {
            c.index = i;
        });
    }

    return chunks;
};

/**
 * Convenience: how many chunks would we produce, without actually building
 * them. Used by the orchestrator's "ingest" stage to log target-words +
 * estimated chunk count up front.
 */
export const estimateChunkCount = (text, opts = {}) => {
    if (!text) return 0;
    const wc = text.split(/\s+/).filter(Boolean).length;
    const target = opts.targetWords || computeTargetWords(wc);
    return Math.min(MAX_CHUNKS, Math.max(1, Math.ceil(wc / target)));
};

export const _internal = {
    MAX_CHUNKS,
    TARGET_CHUNK_COUNT,
    MIN_TARGET_WORDS,
    DEFAULT_TARGET_WORDS,
    MIN_CHUNK_WORDS,
    HEADING_PATTERNS,
    BOILERPLATE_HEADING_RE,
};
