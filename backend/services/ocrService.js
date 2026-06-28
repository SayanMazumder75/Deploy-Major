// ─────────────────────────────────────────────────────────────────────────────
// ocrService
//
// Detects when a source PDF appears to be scanned (i.e. has very little
// extractable text relative to its page count / file size), and routes it
// through NVIDIA's Nemotron OCR endpoint to recover the real text.
//
// CURRENT STATE — SCAFFOLD ONLY:
//   - The detection heuristic is fully implemented.
//   - The OCR network call is structured but gated behind `NVIDIA_API_KEY`
//     AND a feature flag (`enabled: false`) on the helper itself. PDF-to-
//     image extraction (a prerequisite for NVIDIA's vision OCR) needs a
//     heavy native dep (pdfjs-dist + canvas, or pdf-img-convert) which we
//     haven't taken on yet — the orchestrator therefore receives a
//     "skipped" verdict on every call today and continues with the original
//     pdf-parse text. The wiring is in place so the production
//     implementation lands as a swap of the body of `runOcrPages`.
//
// When `NVIDIA_API_KEY` is unset (the default), this module is a hard no-op:
// every entry-point logs once at debug level and returns the original text
// untouched. No surprises in production.
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_OCR_MODEL =
    process.env.NVIDIA_OCR_MODEL || 'nvidia/nemotron-ocr-v2';
const NVIDIA_OCR_ENDPOINT =
    process.env.NVIDIA_OCR_ENDPOINT ||
    'https://integrate.api.nvidia.com/v1/ocr';

// Heuristic: a "scanned-feeling" PDF has <30 words per page on average.
// Real text-PDFs of educational material consistently have 200+ words/page;
// even diagram-heavy chapters average ≥80. 30 is the safe floor where we're
// confident the embedded text is incomplete and OCR would add value.
const SCAN_DETECTION_THRESHOLD_WPP = 30;

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Decide whether `text` looks like the output of pdf-parse on a scanned
 * (image-only) PDF that needs OCR.
 *
 * @param {Object} args
 * @param {string} args.text
 * @param {number} args.numPages
 * @returns {{ scanned: boolean, wordsPerPage: number, totalWords: number }}
 */
export const detectScannedPdf = ({ text, numPages }) => {
    const totalWords = (text || '').split(/\s+/).filter(Boolean).length;
    const pages = Math.max(1, numPages || 1);
    const wordsPerPage = totalWords / pages;
    return {
        scanned: wordsPerPage < SCAN_DETECTION_THRESHOLD_WPP,
        wordsPerPage: Math.round(wordsPerPage),
        totalWords,
    };
};

/**
 * Whether the OCR feature is fully wired up. Today this is `false` because
 * we haven't taken on the PDF-to-image dependency yet. Flipping this to
 * `true` (and providing a real `runOcrPages` implementation below) is the
 * only change needed to enable OCR end-to-end.
 */
const OCR_IMPLEMENTATION_READY = false;

const ocrEnabled = () => !!process.env.NVIDIA_API_KEY && OCR_IMPLEMENTATION_READY;

/**
 * If the document looks scanned AND OCR is enabled, run it. Otherwise
 * return a clear `skipped: true` verdict so the orchestrator can emit a
 * `stage:skipped` event with the right reason.
 *
 * @param {Object} args
 * @param {string} args.text          Source text from pdf-parse.
 * @param {number} args.numPages
 * @param {string} [args.filePath]    Disk path of the source PDF (for image extraction).
 * @returns {Promise<{
 *   text: string,
 *   skipped: boolean,
 *   reason: string,
 *   detection: ReturnType<typeof detectScannedPdf>
 * }>}
 */
export const runOcrIfNeeded = async ({ text, numPages, filePath }) => {
    const detection = detectScannedPdf({ text, numPages });

    // Path A — doc has enough text already, no OCR needed.
    if (!detection.scanned) {
        return {
            text,
            skipped: true,
            reason: `Document has ${detection.wordsPerPage} words/page — above OCR threshold.`,
            detection,
        };
    }

    // Path B — scanned PDF but no NVIDIA key configured.
    if (!process.env.NVIDIA_API_KEY) {
        return {
            text,
            skipped: true,
            reason:
                'Document looks scanned but NVIDIA_API_KEY is not configured — OCR skipped.',
            detection,
        };
    }

    // Path C — scanned PDF + NVIDIA key, but OCR pipeline not yet
    // production-ready. We surface a clear reason so the user knows why
    // their scanned PDF didn't get re-OCR'd.
    if (!OCR_IMPLEMENTATION_READY) {
        console.warn(
            `[OCR] Scanned PDF detected (${detection.wordsPerPage} words/page) but OCR pipeline is not enabled in this build. Source: ${filePath || 'inline'}.`
        );
        return {
            text,
            skipped: true,
            reason:
                'Scanned document detected but the OCR pipeline is not enabled in this build.',
            detection,
        };
    }

    // Path D — actually run OCR. (Currently unreachable; see flag above.)
    try {
        const ocrText = await runOcrPages({ filePath });
        return {
            text: ocrText && ocrText.length > text.length ? ocrText : text,
            skipped: false,
            reason: `OCR produced ${ocrText.split(/\s+/).filter(Boolean).length} words.`,
            detection,
        };
    } catch (err) {
        console.error('[OCR] runOcrPages failed:', err.message);
        return {
            text,
            skipped: true,
            reason: `OCR call failed: ${err.message}`,
            detection,
        };
    }
};

// ─── internal: NVIDIA OCR call ──────────────────────────────────────────────
// Kept as a separate function so swapping in a real PDF-to-image pipeline
// (pdfjs-dist render → canvas → base64 → NVIDIA OCR) is purely additive.
// Today this throws to make accidental enablement obvious.

// eslint-disable-next-line no-unused-vars
const runOcrPages = async ({ filePath }) => {
    if (!ocrEnabled()) {
        throw new Error(
            'OCR pipeline is not yet enabled — set NVIDIA_API_KEY AND flip OCR_IMPLEMENTATION_READY=true after wiring up PDF page rasterisation.'
        );
    }

    // Production implementation outline (left here as documentation):
    //   1. Convert each PDF page to a PNG/JPEG buffer (pdfjs-dist + canvas).
    //   2. POST each base64-encoded image to NVIDIA_OCR_ENDPOINT with model
    //      = NVIDIA_OCR_MODEL, auth = Bearer NVIDIA_API_KEY.
    //   3. Concatenate the per-page text outputs in page order.
    //   4. Return the merged text.

    // Throw to make sure no caller silently relies on this until it's done.
    throw new Error('runOcrPages: not implemented');
};

export const _internal = { runOcrPages, OCR_IMPLEMENTATION_READY };
