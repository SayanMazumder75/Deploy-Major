// ─────────────────────────────────────────────────────────────────────────────
// jsonParser
//
// Robust JSON extraction for AI responses. Every AI provider in our chain
// CAN return clean JSON, but in practice models sometimes wrap it in
// ```json fences, prepend a sentence, or trail off with extra prose. This
// module is the single defence point for all of those failure modes — every
// service in /services calls `safeParseJson` instead of `JSON.parse`.
//
// Lifted (and slightly hardened) from the original aiSummaryGenerator so the
// new modular services share one implementation rather than each cargo-
// culting their own.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to parse a string into JSON, tolerating common AI-output quirks.
 * Returns `null` if no valid JSON object can be recovered.
 *
 * Order of strategies tried:
 *   1. JSON.parse on the trimmed input.
 *   2. JSON.parse on the contents of a ```json fenced block.
 *   3. JSON.parse on the first balanced `{ … }` substring.
 *   4. JSON.parse on the first balanced `[ … ]` substring (arrays).
 *
 * @param {string} raw
 * @returns {any|null}
 */
export const safeParseJson = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    let text = raw.trim();

    // Strategy 1 — try the input as-is.
    try {
        return JSON.parse(text);
    } catch {
        /* fall through */
    }

    // Strategy 2 — strip ```json fences.
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        const inner = fenceMatch[1].trim();
        try {
            return JSON.parse(inner);
        } catch {
            text = inner;
            /* fall through to balanced-substring search on the fenced content */
        }
    }

    // Strategy 3 — find the first balanced object.
    const objSlice = extractBalanced(text, '{', '}');
    if (objSlice) {
        try {
            return JSON.parse(objSlice);
        } catch {
            /* fall through to array search */
        }
    }

    // Strategy 4 — find the first balanced array.
    const arrSlice = extractBalanced(text, '[', ']');
    if (arrSlice) {
        try {
            return JSON.parse(arrSlice);
        } catch {
            /* fall through */
        }
    }

    return null;
};

/**
 * Walk `text` starting from the first occurrence of `open` and return the
 * substring up to (and including) the balanced closing bracket. Returns
 * null if no balanced match exists. Naively respects string literals so
 * `{ "a": "}" }` doesn't trip us up.
 *
 * @param {string} text
 * @param {'{'|'['} open
 * @param {'}'|']'} close
 * @returns {string|null}
 */
const extractBalanced = (text, open, close) => {
    const start = text.indexOf(open);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (ch === '\\') {
            escape = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (ch === open) depth++;
        else if (ch === close) {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return null;
};

/**
 * Safe array coercion — used liberally by services that need to defend
 * against `arr.map is not a function` when an AI returns a single object
 * instead of a list, or vice versa.
 */
export const ensureArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);

/**
 * Dedupe a list of `{ title, content }` shaped items by a normalised
 * version of their title. Keeps the entry with the longest content when a
 * duplicate is found — the AI tends to emit the same definition in
 * successive chunks with slightly different wording, and the longer one is
 * usually the more useful version.
 */
export const dedupeByTitle = (items) => {
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
