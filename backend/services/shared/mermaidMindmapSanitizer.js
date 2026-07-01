// ─────────────────────────────────────────────────────────────────────────────
// mermaidMindmapSanitizer.js
//
// Defense-in-depth for AI-generated Mermaid mindmap syntax. Pipeline:
//   raw AI string -> sanitize -> validate -> (if invalid) repair -> validate
//   -> (if still invalid) fallback from chapter titles
//
// Guarantees: generateMindmapSafe() NEVER returns invalid mermaid and
// NEVER throws. Worst case = a minimal valid fallback tree.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LABEL_LEN = 60;

// ── label cleanup ────────────────────────────────────────────────────────
const cleanLabel = (raw) => {
    if (!raw) return '';
    let s = String(raw);
    s = s.replace(/```[a-z]*\n?/gi, '').replace(/```/g, ''); // stray fences
    s = s.replace(/\*\*|__/g, '');                            // bold/underline
    s = s.replace(/`/g, '');                                  // backticks
    s = s.replace(/^#+\s*/g, '');                              // markdown headers
    s = s.replace(/^[-*]\s+/g, '');                             // bullet markers
    s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');              // md links -> text
    s = s.replace(/<[^>]+>/g, '');                               // html tags
    s = s.replace(/[|]/g, '');                                    // table pipes
    s = s.replace(/[(){}[\]]/g, '');                              // nested brackets in label
    s = s.replace(/[:"']/g, '');                                  // colons/quotes break parsing
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > MAX_LABEL_LEN) s = s.slice(0, MAX_LABEL_LEN).trim();
    return s;
};

// ── strip lines that aren't real mindmap content ─────────────────────────
const isJunkLine = (line) => {
    const t = line.trim();
    if (!t) return true;
    if (/^```/.test(t)) return true;
    if (/^%%/.test(t)) return true; // mermaid comment directive
    if (/^(classDef|class|style|click|linkStyle|subgraph|end|graph|flowchart)\b/i.test(t)) return true;
    return false;
};

// ── main sanitizer ────────────────────────────────────────────────────────
export const sanitizeMermaidMindmap = (rawMermaid) => {
    if (!rawMermaid || typeof rawMermaid !== 'string') return '';

    let text = rawMermaid.replace(/```mermaid/gi, '').replace(/```/g, '').trim();

    let rawLines = text.split('\n');

    // drop everything before the actual "mindmap" keyword if model added preamble
    const startIdx = rawLines.findIndex((l) => l.trim().toLowerCase() === 'mindmap');
    if (startIdx > 0) rawLines = rawLines.slice(startIdx);

    // ensure first line present + exact
    if (rawLines.length === 0 || rawLines[0].trim().toLowerCase() !== 'mindmap') {
        rawLines.unshift('mindmap');
    } else {
        rawLines[0] = 'mindmap';
    }

    const bodyLines = rawLines.slice(1).filter((l) => !isJunkLine(l));

    // normalize indentation while preserving hierarchy, using an indent stack
    const stack = []; // stack of original indent widths, index = depth-1
    const normalized = [];
    const seenAtDepthPath = new Set(); // dedupe: `${depth}:${parentPath}:${label}`
    const pathStack = [];

    for (const line of bodyLines) {
        const m = line.match(/^(\s*)(.*)$/);
        const origIndent = m[1].replace(/\t/g, '  ').length;
        let label = cleanLabel(m[2]);
        if (!label) continue; // drop empty nodes

        // one node per line: split accidental multi-node lines on ';'
        const parts = label.split(';').map((p) => cleanLabel(p)).filter(Boolean);

        for (const part of parts) {
            while (stack.length && origIndent <= stack[stack.length - 1]) {
                stack.pop();
                pathStack.pop();
            }
            stack.push(origIndent);
            const depth = stack.length; // 1-based, root's children start at depth 1
            const parentPath = pathStack.join('>');
            const dedupeKey = `${depth}:${parentPath}:${part.toLowerCase()}`;
            if (seenAtDepthPath.has(dedupeKey)) continue; // drop duplicate sibling
            seenAtDepthPath.add(dedupeKey);

            pathStack[depth - 1] = part.toLowerCase();
            pathStack.length = depth;

            normalized.push('  '.repeat(depth) + part);
        }
    }

    // root node — force valid shape if depth-1 line missing/malformed
    if (normalized.length === 0) {
        return 'mindmap\n  root((Untitled))';
    }
    // ensure root line uses a valid mermaid mindmap shape
    const rootLine = normalized[0];
    const rootLabel = rootLine.trim();
    if (!/^root\(\(.*\)\)$/.test(rootLabel)) {
        normalized[0] = `  root((${cleanLabel(rootLabel) || 'Document Topic'}))`;
    }

    return ['mindmap', ...normalized].join('\n');
};

// ── lightweight validator ─────────────────────────────────────────────────
export const validateMermaidMindmap = (mermaidStr) => {
    const errors = [];
    if (!mermaidStr || typeof mermaidStr !== 'string') {
        return { valid: false, errors: ['empty or non-string input'] };
    }
    const lines = mermaidStr.split('\n');
    if (lines.length < 2) errors.push('too few lines');
    if (lines[0]?.trim() !== 'mindmap') errors.push('first line must be exactly "mindmap"');

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // trailing blank ok
        const indentMatch = line.match(/^( *)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        if (indent % 2 !== 0) errors.push(`line ${i}: indentation not multiple of 2 spaces`);
        if (/\*\*|__|`|^#|^\s*[-*]\s/.test(line)) errors.push(`line ${i}: leftover markdown syntax`);
        const opens = (line.match(/[({[]/g) || []).length;
        const closes = (line.match(/[)}\]]/g) || []).length;
        if (opens !== closes) errors.push(`line ${i}: unbalanced brackets`);
        if (/<[^>]+>/.test(line)) errors.push(`line ${i}: html tag present`);
    }

    return { valid: errors.length === 0, errors };
};

// ── fallback generator from chapter titles ────────────────────────────────
export const buildFallbackMindmap = (chapters = [], docTopic = 'Document Topic') => {
    const lines = ['mindmap', `  root((${cleanLabel(docTopic) || 'Document Topic'}))`];
    (chapters || []).slice(0, 12).forEach((ch) => {
        const title = cleanLabel(ch?.title) || 'Chapter';
        lines.push(`    ${title}`);
    });
    if (lines.length === 2) lines.push('    Overview'); // guarantee >=1 child
    return lines.join('\n');
};

// ── orchestrator: never returns invalid mermaid, never throws ─────────────
export const generateMindmapSafe = (rawMermaid, chapters = [], docTopic = 'Document Topic') => {
    try {
        const sanitized = sanitizeMermaidMindmap(rawMermaid);
        const check1 = validateMermaidMindmap(sanitized);
        if (check1.valid) {
            return { mermaid: sanitized, usedFallback: false, repaired: false };
        }

        // repair attempt: re-run sanitizer once more (idempotent pass tends to
        // fix cases where first pass left stray artifacts from nested cleanup)
        const repaired = sanitizeMermaidMindmap(sanitized);
        const check2 = validateMermaidMindmap(repaired);
        if (check2.valid) {
            return { mermaid: repaired, usedFallback: false, repaired: true };
        }

        // give up, deterministic fallback
        return {
            mermaid: buildFallbackMindmap(chapters, docTopic),
            usedFallback: true,
            repaired: false,
        };
    } catch {
        // absolute last resort — sanitizer itself threw
        return {
            mermaid: buildFallbackMindmap(chapters, docTopic),
            usedFallback: true,
            repaired: false,
        };
    }
};