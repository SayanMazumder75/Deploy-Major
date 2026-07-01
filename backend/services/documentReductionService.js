// documentReductionService
//
// Local, deterministic pre-AI reduction for AI Document Intelligence.
// Goal: send at most ~30% of extracted source words to the model while
// preserving chapter coverage and high-yield academic material.

const SMALL_CHUNK_TARGET_WORDS = 420;
const SMALL_CHUNK_MIN_WORDS = 180;
const DEFAULT_AI_WORD_BUDGET_RATIO = 0.3;
const MIN_SELECTED_CHUNKS = 3;

const HEADING_PATTERNS = [
    /^chapter\s+[0-9ivxlcdm]+\b.*$/i,
    /^unit\s+[0-9ivxlcdm]+\b.*$/i,
    /^module\s+[0-9ivxlcdm]+\b.*$/i,
    /^\d{1,2}(?:\.\d{1,2})*\s+[A-Z][^\n]{2,90}$/,
    /^[A-Z][A-Z0-9 \-,:&/()]{6,90}$/,
    /^#{1,4}\s+.+$/,
];

const IMPORTANCE_TERMS = [
    'definition',
    'define',
    'theorem',
    'principle',
    'formula',
    'equation',
    'method',
    'algorithm',
    'process',
    'steps',
    'example',
    'important',
    'key',
    'objective',
    'summary',
    'conclusion',
    'advantages',
    'disadvantages',
    'application',
    'applications',
    'classification',
    'properties',
    'causes',
    'effects',
    'features',
];

const wordCount = (text) => (text || '').split(/\s+/).filter(Boolean).length;

const normaliseLine = (line) =>
    String(line || '')
        .replace(/\s+/g, ' ')
        .replace(/\bpage\s+\d+\b/gi, 'page #')
        .replace(/\b\d+\s*\/\s*\d+\b/g, '#/#')
        .replace(/\d+/g, '#')
        .trim()
        .toLowerCase();

const paragraphKey = (paragraph) =>
    String(paragraph || '')
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()
        .toLowerCase()
        .slice(0, 220);

const isHeading = (line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.length > 120) return false;
    return HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const cleanTitle = (line, fallback) =>
    String(line || fallback || 'Untitled Chapter')
        .replace(/^#{1,4}\s*/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 90) || fallback;

export const removeRepeatedHeadersFooters = (text) => {
    const lines = String(text || '').split(/\r?\n/);
    const counts = new Map();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length > 100) continue;
        const key = normaliseLine(trimmed);
        if (!key || key.length < 3) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    const repeated = new Set();
    const threshold = Math.max(4, Math.floor(lines.length * 0.015));
    for (const [key, count] of counts.entries()) {
        if (count >= threshold) repeated.add(key);
    }

    return lines
        .filter((line) => {
            const trimmed = line.trim();
            if (!trimmed) return true;
            const key = normaliseLine(trimmed);
            if (!repeated.has(key)) return true;

            // Keep meaningful headings even if repeated in a table of contents.
            if (isHeading(trimmed) && wordCount(trimmed) >= 3) return true;
            return false;
        })
        .join('\n');
};

export const removeDuplicateParagraphs = (text) => {
    const paragraphs = String(text || '').split(/\n{2,}/);
    const seen = new Set();
    const kept = [];

    for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) continue;
        const words = wordCount(trimmed);
        const key = paragraphKey(trimmed);

        // Very short paragraphs are often headings or labels; keep them.
        if (words < 12) {
            kept.push(trimmed);
            continue;
        }

        if (seen.has(key)) continue;
        seen.add(key);
        kept.push(trimmed);
    }

    return kept.join('\n\n');
};

export const splitIntoChapters = (text) => {
    const lines = String(text || '').split(/\r?\n/);
    const chapters = [];
    let current = {
        title: 'Introduction',
        lines: [],
    };

    const flush = () => {
        const body = current.lines.join('\n').trim();
        if (!body) return;
        chapters.push({
            index: chapters.length,
            title: cleanTitle(current.title, `Chapter ${chapters.length + 1}`),
            text: body,
            wordCount: wordCount(body),
        });
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (isHeading(trimmed) && wordCount(current.lines.join(' ')) >= 300) {
            flush();
            current = { title: trimmed, lines: [line] };
            continue;
        }
        if (isHeading(trimmed) && current.lines.length === 0) {
            current.title = trimmed;
        }
        current.lines.push(line);
    }
    flush();

    if (chapters.length) return chapters;
    const safe = String(text || '').trim();
    return safe
        ? [{ index: 0, title: 'Summary', text: safe, wordCount: wordCount(safe) }]
        : [];
};

const splitChapterIntoChunks = (chapter) => {
    const paragraphs = chapter.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const chunks = [];
    let buf = [];
    let bufWords = 0;

    const flush = () => {
        const text = buf.join('\n\n').trim();
        if (!text) return;
        chunks.push({
            chapterIndex: chapter.index,
            chapterTitle: chapter.title,
            localIndex: chunks.length,
            text,
            wordCount: wordCount(text),
        });
        buf = [];
        bufWords = 0;
    };

    for (const paragraph of paragraphs) {
        const words = wordCount(paragraph);
        if (words > SMALL_CHUNK_TARGET_WORDS * 1.35) {
            flush();
            const tokens = paragraph.split(/\s+/).filter(Boolean);
            for (let i = 0; i < tokens.length; i += SMALL_CHUNK_TARGET_WORDS) {
                const slice = tokens.slice(i, i + SMALL_CHUNK_TARGET_WORDS).join(' ');
                chunks.push({
                    chapterIndex: chapter.index,
                    chapterTitle: chapter.title,
                    localIndex: chunks.length,
                    text: slice,
                    wordCount: wordCount(slice),
                });
            }
            continue;
        }

        if (bufWords + words > SMALL_CHUNK_TARGET_WORDS && bufWords >= SMALL_CHUNK_MIN_WORDS) {
            flush();
        }
        buf.push(paragraph);
        bufWords += words;
    }
    flush();

    return chunks;
};

const scoreChunk = (chunk, chapterChunkCount) => {
    const text = chunk.text;
    const lower = text.toLowerCase();
    const words = Math.max(1, chunk.wordCount);
    let score = 0;

    for (const term of IMPORTANCE_TERMS) {
        if (lower.includes(term)) score += 2.2;
    }

    const hasFormula = /[=+\-*/^]|\\frac|\\sum|\\int|[a-z]\s*=\s*/i.test(text);
    if (hasFormula) score += 4;

    const numberedDensity = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).length / words;
    score += Math.min(4, numberedDensity * 70);

    const bulletCount = (text.match(/(^|\n)\s*(?:[-*•]|\d+[.)])\s+/g) || []).length;
    score += Math.min(5, bulletCount * 0.7);

    const headingCount = text
        .split(/\r?\n/)
        .filter((line) => isHeading(line.trim())).length;
    score += Math.min(4, headingCount);

    const uniqueWords = new Set(
        lower
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 4)
    ).size;
    score += Math.min(5, (uniqueWords / words) * 12);

    if (chunk.localIndex === 0) score += 2.5;
    if (chunk.localIndex === chapterChunkCount - 1) score += 1.2;

    // Prefer substantial chunks, but cap the benefit to avoid selecting
    // long low-signal prose over compact definitions.
    score += Math.min(3, words / 180);

    return Number(score.toFixed(3));
};

const dedupeChunksByText = (chunks) => {
    const seen = new Set();
    return chunks.filter((chunk) => {
        const key = paragraphKey(chunk.text);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const selectImportantChunks = (chunks, sourceWords, budgetRatio) => {
    if (!chunks.length) return [];

    const budgetWords = Math.max(
        SMALL_CHUNK_TARGET_WORDS,
        Math.floor(sourceWords * budgetRatio)
    );
    const minSelectedChunks = sourceWords < 1500 ? 1 : MIN_SELECTED_CHUNKS;
    const byChapter = new Map();
    for (const chunk of chunks) {
        if (!byChapter.has(chunk.chapterIndex)) byChapter.set(chunk.chapterIndex, []);
        byChapter.get(chunk.chapterIndex).push(chunk);
    }

    for (const chapterChunks of byChapter.values()) {
        chapterChunks.forEach((chunk) => {
            chunk.importanceScore = scoreChunk(chunk, chapterChunks.length);
        });
    }

    const selected = new Map();
    let selectedWords = 0;

    // Preserve coverage: keep the best chunk from every chapter when possible.
    for (const chapterChunks of byChapter.values()) {
        const best = [...chapterChunks].sort((a, b) => b.importanceScore - a.importanceScore)[0];
        if (!best) continue;
        if (selectedWords + best.wordCount > budgetWords && selected.size >= minSelectedChunks) continue;
        selected.set(best.globalIndex, best);
        selectedWords += best.wordCount;
    }

    const ranked = [...chunks].sort((a, b) => {
        if (b.importanceScore !== a.importanceScore) {
            return b.importanceScore - a.importanceScore;
        }
        return a.globalIndex - b.globalIndex;
    });

    for (const chunk of ranked) {
        if (selected.has(chunk.globalIndex)) continue;
        if (selectedWords + chunk.wordCount > budgetWords && selected.size >= minSelectedChunks) continue;
        selected.set(chunk.globalIndex, chunk);
        selectedWords += chunk.wordCount;
        if (selectedWords >= budgetWords) break;
    }

    if (selectedWords > budgetWords && selected.size > minSelectedChunks) {
        const removable = [...selected.values()].sort((a, b) => {
            if (a.importanceScore !== b.importanceScore) {
                return a.importanceScore - b.importanceScore;
            }
            return b.wordCount - a.wordCount;
        });

        for (const chunk of removable) {
            if (selectedWords <= budgetWords || selected.size <= minSelectedChunks) break;
            selected.delete(chunk.globalIndex);
            selectedWords -= chunk.wordCount;
        }
    }

    return [...selected.values()].sort((a, b) => a.globalIndex - b.globalIndex);
};

export const reduceDocumentForAI = (text, opts = {}) => {
    const originalText = String(text || '');
    const sourceWordCount = wordCount(originalText);
    const withoutHeadersFooters = removeRepeatedHeadersFooters(originalText);
    const dedupedText = removeDuplicateParagraphs(withoutHeadersFooters);
    const cleanedWordCount = wordCount(dedupedText);
    const chapters = splitIntoChapters(dedupedText);

    let chunks = chapters.flatMap((chapter) => splitChapterIntoChunks(chapter));
    chunks = dedupeChunksByText(chunks).map((chunk, index) => ({
        ...chunk,
        globalIndex: index,
    }));

    const selectedChunks = selectImportantChunks(
        chunks,
        sourceWordCount,
        opts.budgetRatio || DEFAULT_AI_WORD_BUDGET_RATIO
    ).map((chunk, index) => ({
        index,
        originalIndex: chunk.globalIndex,
        chapterIndex: chunk.chapterIndex,
        label: chunk.chapterTitle,
        text: `Chapter: ${chunk.chapterTitle}\n\n${chunk.text}`,
        wordCount: chunk.wordCount,
        importanceScore: chunk.importanceScore,
    }));

    const selectedWordCount = selectedChunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
    const tokenReductionPercent = sourceWordCount
        ? Math.max(0, Math.min(99, Math.round((1 - selectedWordCount / sourceWordCount) * 100)))
        : 0;

    return {
        cleanedText: dedupedText,
        chapters,
        allChunks: chunks,
        selectedChunks,
        metrics: {
            sourceWordCount,
            cleanedWordCount,
            chapterCount: chapters.length,
            candidateChunkCount: chunks.length,
            selectedChunkCount: selectedChunks.length,
            selectedWordCount,
            tokenReductionPercent,
            targetReductionPercent: 70,
        },
    };
};

export const _internal = {
    SMALL_CHUNK_TARGET_WORDS,
    SMALL_CHUNK_MIN_WORDS,
    DEFAULT_AI_WORD_BUDGET_RATIO,
    wordCount,
    scoreChunk,
};
