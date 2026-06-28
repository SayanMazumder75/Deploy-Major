// ─────────────────────────────────────────────────────────────────────────────
// diagramService
//
// Detects diagrams embedded in the source PDF and uses NVIDIA's Cosmos Nano
// Reasoner (a multimodal vision model) to produce a textual explanation +
// a Mermaid diagram for each one.
//
// CURRENT STATE — SCAFFOLD ONLY:
//   - The public API + provider call shape are fully designed.
//   - PDF-to-image extraction (a prerequisite for any vision model call) is
//     not yet wired up — adding it would mean taking on a heavy native dep
//     (pdfjs-dist + canvas, or `pdf-img-convert`). The orchestrator
//     therefore receives a `skipped:true` verdict on every call today.
//   - When the user does provision `NVIDIA_API_KEY` AND we flip the
//     `IMPLEMENTATION_READY` flag below (after wiring image extraction),
//     this service becomes fully active.
//
// Why scaffold it now: the orchestrator already has a "diagrams" stage in
// its plan, and the Processing Screen + AISummary model both have a slot
// for diagram results. Having the no-op service in place means production
// already routes events through here; enabling it later is purely a swap
// of the function body, no further orchestrator/model/UI work.
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_VISION_MODEL =
    process.env.NVIDIA_VISION_MODEL || 'nvidia/cosmos-nano-reasoner';
// NVIDIA's vision-capable models accept image input via their standard
// OpenAI-compatible /v1/chat/completions endpoint (with a content array of
// `{type:'image_url'|'text'}` parts). We re-use that endpoint here.
const NVIDIA_VISION_ENDPOINT =
    process.env.NVIDIA_API_BASE_URL ||
    'https://integrate.api.nvidia.com/v1/chat/completions';

const IMPLEMENTATION_READY = false; // flip when pdf-to-image is wired

const isEnabled = () =>
    !!process.env.NVIDIA_API_KEY && IMPLEMENTATION_READY;

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Detect + explain diagrams in the source PDF.
 *
 * @param {Object} args
 * @param {string} [args.filePath]   Disk path of the source PDF.
 * @param {Object} args.settings     Pipeline settings (for advancedOptions.explainDiagrams gate).
 * @returns {Promise<{
 *   diagrams: Array<{ title: string, description: string, mermaid: string, sourcePage?: number }>,
 *   skipped: boolean,
 *   reason: string
 * }>}
 */
export const detectAndExplainDiagrams = async ({ filePath, settings }) => {
    const adv = settings?.advancedOptions || {};

    // Gate 1 — user opted out.
    if (adv.explainDiagrams !== true) {
        return {
            diagrams: [],
            skipped: true,
            reason: 'explainDiagrams option is disabled.',
        };
    }

    // Gate 2 — NVIDIA key not configured.
    if (!process.env.NVIDIA_API_KEY) {
        return {
            diagrams: [],
            skipped: true,
            reason:
                'NVIDIA_API_KEY is not configured — visual diagram extraction requires a vision-capable NVIDIA NIM model.',
        };
    }

    // Gate 3 — implementation not yet enabled.
    if (!IMPLEMENTATION_READY) {
        console.warn(
            `[Diagrams] Vision pipeline disabled in this build (filePath=${filePath || 'inline'}). Set IMPLEMENTATION_READY=true once PDF-to-image extraction is wired up.`
        );
        return {
            diagrams: [],
            skipped: true,
            reason:
                'NVIDIA vision pipeline is not enabled in this build (PDF-to-image extraction pending).',
        };
    }

    // Path D — actually call NVIDIA. Currently unreachable.
    try {
        const diagrams = await callNvidiaVision({ filePath });
        return { diagrams, skipped: false, reason: `Detected ${diagrams.length} diagram(s).` };
    } catch (err) {
        console.error('[Diagrams] NVIDIA vision call failed:', err.message);
        return {
            diagrams: [],
            skipped: true,
            reason: `NVIDIA vision call failed: ${err.message}`,
        };
    }
};

// ─── internal: NVIDIA Cosmos vision call ────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const callNvidiaVision = async ({ filePath }) => {
    if (!isEnabled()) {
        throw new Error(
            'Vision pipeline not yet enabled — wire up pdf-to-image rasterisation and flip IMPLEMENTATION_READY.'
        );
    }

    // Production implementation outline:
    //   1. Use pdfjs-dist + canvas to render each PDF page to a PNG buffer.
    //   2. Run a lightweight diagram-detection pass (heuristic or vision)
    //      to filter pages that contain figures/diagrams.
    //   3. For each candidate page, POST to NVIDIA_VISION_ENDPOINT:
    //          { model: NVIDIA_VISION_MODEL,
    //            messages: [{ role: 'user', content: [
    //                { type: 'text', text: 'Describe the diagram in JSON: {title, description, mermaid}' },
    //                { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
    //            ]}] }
    //   4. Parse the JSON response, normalise the Mermaid syntax.
    //   5. Return the merged list of diagram cards.

    throw new Error('callNvidiaVision: not implemented');
};

export const _internal = {
    NVIDIA_VISION_MODEL,
    NVIDIA_VISION_ENDPOINT,
    IMPLEMENTATION_READY,
};
