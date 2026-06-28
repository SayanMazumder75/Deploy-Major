// ─────────────────────────────────────────────────────────────────────────────
// chunkService (V3)
//
// Semantic chunking for the AI Document Intelligence pipeline. V3 has a
// hard requirement: produce AT MOST 30 chunks regardless of source size,
// while keeping each chunk between roughly 1500 and 6000 words so it
// fits comfortably in every provider's context window (Groq llama-3.3-70b:
// 128k tokens; NVIDIA Nemotron Ultra: similar; OpenRouter free models:
// 32k+).
//
// Algorithm:
//   1. Compute a target word count per chunk based on the source's total
//      word count, scaled so that we never exceed 30 chunks. For small
//      docs the target is 2500 (the V2 default); for very large docs it
//      grows up to whatever's needed to stay at ≤30 chunks.
//   2. Walk the source line-by-line. Whenever a heading pattern matches
//      AND the current buffer is "big enough" (≥ minWords), close the
//      current chunk and start a fresh one labelled by the heading.
//   3. When the buffer exceeds the target word count, look ahead a few
//      lines for the next heading — if one's nearby, cut at it; otherwise
//      cut where we are.
//
// The heading-aware cutting means we keep chapter boundaries intact, which
// preserves chapter-level structure for the orchestrator's rewrite pass.
// ─────────────────────────────────────────────────────────────────────────────

// V3: cap on total chunk count regardless of source size.
const MAX_CHUNKS = 30;

// Minimum / maximum target word count per chunk. Targets between these
// bounds are computed dynamically from totalWords / MAX_CHUNKS.
const MIN_TARGET_WORDS = 1500;
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

    // Otherwise scale chunk size up so MAX_CHUNKS is the ceiling. For a
    // 250k-word doc this lands at ~8333 words/chunk (~6250 tokens), still
    // well inside every provider's context window.
    return Math.ceil(totalWords / MAX_CHUNKS);
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
    const safe = (text || '').trim();
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
    // the smallest neighbouring pairs until we're under the cap. This is
    // O(n log n) but n is bounded.
    while (chunks.length > MAX_CHUNKS) {
        // Find the smallest pair of consecutive chunks (smallest total
        // word count) and merge them.
        let smallestPairStart = 0;
        let smallestPairWords = Infinity;
        for (let i = 0; i < chunks.length - 1; i++) {
            const pair = chunks[i].wordCount + chunks[i + 1].wordCount;
            if (pair < smallestPairWords) {
                smallestPairWords = pair;
                smallestPairStart = i;
            }
        }
        const a = chunks[smallestPairStart];
        const b = chunks[smallestPairStart + 1];
        chunks.splice(smallestPairStart, 2, {
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
    MIN_TARGET_WORDS,
    DEFAULT_TARGET_WORDS,
    MIN_CHUNK_WORDS,
    HEADING_PATTERNS,
};
