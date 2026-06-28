// ─────────────────────────────────────────────────────────────────────────────
// chunkService
//
// Semantic chunking for the AI Document Intelligence pipeline. The V2 spec
// is explicit: "Never send an entire PDF to AI. Chunk by chapter / heading /
// topic / semantic section. Target 1000–2000 tokens per chunk. Store chunk
// order."
//
// We approximate tokens with words (~0.75 tokens/word for English content),
// targeting ~2500 words per chunk = ~1875 tokens. Headings are detected
// from common textbook patterns; we cut at a heading whenever the current
// chunk is "full enough" to keep chapters intact.
//
// Returns a list of `{ index, label, text, wordCount }` entries — the
// orchestrator preserves `index` so chunk order is never lost downstream.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TARGET_WORDS = 2500; // ~1875 tokens — well inside any provider's window
const MIN_CHUNK_WORDS = 800; // never emit a chunk smaller than this (except the tail)

// Headings we cut on. Order matters — we try the strongest patterns first:
//   1. "Chapter 4" / "CHAPTER IV" / "Chapter 4: ..."
//   2. Numbered sections like "1.2 Topic Name"
//   3. ALL-CAPS standalone lines (common in scanned-then-OCR'd notes)
//   4. Markdown-style # / ## headings
const HEADING_PATTERNS = [
    /^chapter\s+[0-9ivxlcdm]+\b.*$/im,
    /^\d{1,2}(?:\.\d{1,2})*\s+[A-Z][^\n]{2,80}$/m,
    /^[A-Z][A-Z0-9 \-,:&/]{6,80}$/m,
    /^#{1,3}\s+.+$/m,
];

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

const cleanLabel = (raw) =>
    (raw || '')
        .replace(/^#+\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || null;

/**
 * Split text into chunks of approximately `targetWords` words each. Cuts
 * are nudged to the nearest detected heading when possible so chapters
 * stay intact.
 *
 * @param {string} text                Full extracted text from the PDF.
 * @param {Object} [opts]
 * @param {number} [opts.targetWords]  Approximate words per chunk.
 * @param {number} [opts.minWords]     Minimum words in a non-tail chunk.
 * @returns {Array<{index:number,label:string|null,text:string,wordCount:number}>}
 */
export const semanticChunk = (text, opts = {}) => {
    const targetWords = opts.targetWords || DEFAULT_TARGET_WORDS;
    const minWords = opts.minWords || MIN_CHUNK_WORDS;

    const safe = (text || '').trim();
    if (!safe) return [];

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

        // Heading on this line? Use it as the chunk label going forward.
        const isHeading = HEADING_PATTERNS.some((p) => p.test(trimmed));
        if (isHeading) {
            // If we've already accumulated enough material in the buffer,
            // close out the previous chunk before starting under the new
            // heading. This keeps chapter boundaries clean.
            if (bufWords >= minWords) flush();
            currentLabel = trimmed;
        }

        buf.push(line);
        if (trimmed) {
            bufWords += trimmed.split(/\s+/).filter(Boolean).length;
        }

        // If we've blown past the target, look ahead a little for a
        // heading-shaped line and cut there. Otherwise cut here.
        if (bufWords >= targetWords) {
            const lookaheadCut = findHeadingNearAfter(lines, i + 1, 20);
            if (lookaheadCut !== -1 && lookaheadCut <= i + 20) {
                // Pull lines up to (but not including) the next heading.
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
    return chunks;
};

/**
 * Convenience: how many chunks WOULD we produce, without actually building
 * them. Used by the orchestrator to estimate progress totals before the
 * heavy per-chunk extraction begins.
 */
export const estimateChunkCount = (text, opts = {}) => {
    if (!text) return 0;
    const wc = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wc / (opts.targetWords || DEFAULT_TARGET_WORDS)));
};
