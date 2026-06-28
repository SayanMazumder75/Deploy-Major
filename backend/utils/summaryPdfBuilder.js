// ─────────────────────────────────────────────────────────────────────────────
// summaryPdfBuilder (V2)
//
// Renders an `AISummary` document into a premium-feeling PDF using pdfkit.
//
// V2 changes vs V1:
//   - Card-styled definition / formula / example / tip blocks with coloured
//     side-rails and labelled rows (lifted straight from the new rich
//     model shapes — richDefinitions, richFormulas, richExamples, examTips).
//   - Clickable Table of Contents page with named-destination targets.
//   - PDF outline (bookmark tree) built incrementally as each section is
//     written. Native PDF viewers render this as a sidebar tree.
//   - Mermaid mind map rendered as a styled code block plus the textual
//     outline (pdfkit can't run a Mermaid renderer, so we surface both
//     representations and let the user import the Mermaid source elsewhere).
//   - Backwards-compatible: if a summary doc only has the legacy
//     `sections[]` array (V1) and none of the rich shapes, we fall back to
//     the same section walker the V1 builder used.
//
// Why pdfkit (still): pure-JS, streams output (no temp files on Render's
// ephemeral disk), per-page numbering via bufferPages, and incremental
// outline / namedDestination APIs.
// ─────────────────────────────────────────────────────────────────────────────

import PDFDocument from 'pdfkit';

// ─── theme tokens ───────────────────────────────────────────────────────────

const COLORS = {
    primary: '#7c3aed', // violet-600
    accent: '#ec4899', // pink-500
    text: '#1e1b4b', // indigo-950
    muted: '#64748b', // slate-500
    rule: '#e9d5ff', // purple-200
    chip: '#f5f3ff', // violet-50
    chipText: '#6d28d9', // violet-700

    // Card-rail colours per resource kind. Keeping the palette small +
    // deliberately differentiated so the user can recognise a card type
    // at-a-glance just from the side-rail colour.
    railDefinition: '#7c3aed', // violet
    railFormula: '#ec4899', // pink
    railExample: '#0ea5e9', // sky
    railTip: '#f59e0b', // amber
    railConcept: '#10b981', // emerald

    cardBg: '#faf5ff', // violet-50 / very light
    cardLabel: '#6d28d9', // violet-700
    cardLabelMuted: '#94a3b8', // slate-400
    codeBg: '#f1f5f9', // slate-100
    codeText: '#0f172a', // slate-900
    link: '#7c3aed',
};

const PAGE_MARGIN = 56;
const BODY_FONT_SIZE = 11;
const HEADING_FONT_SIZE = 18;
const SUBHEADING_FONT_SIZE = 14;
const CARD_PADDING_X = 16;
const CARD_PADDING_Y = 12;
const CARD_RAIL_WIDTH = 4;
const CARD_GAP = 10;

// ─── slug helper (must match the orchestrator's slug rules) ─────────────────
// Anchors are baked into sections at write time; the TOC entries reference
// these slugs verbatim, so the rules MUST match `slugify` in
// services/intelligencePipeline.js.
const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 64) || 'section';

// ─── inline-markdown writer (V1, slightly hardened) ─────────────────────────

const writeInlineMarkdown = (doc, line, opts = {}) => {
    const runs = [];
    let i = 0;
    let buf = '';
    let bold = false;
    let italic = false;

    const flush = () => {
        if (buf.length) {
            runs.push({ text: buf, bold, italic });
            buf = '';
        }
    };

    while (i < line.length) {
        if (line[i] === '*' && line[i + 1] === '*') {
            flush();
            bold = !bold;
            i += 2;
            continue;
        }
        if (
            line[i] === '_' &&
            (italic || /\s|^/.test(line[i - 1] || '')) &&
            (italic ? true : line[i + 1] && line[i + 1] !== '_')
        ) {
            flush();
            italic = !italic;
            i += 1;
            continue;
        }
        buf += line[i];
        i += 1;
    }
    flush();

    runs.forEach((run, idx) => {
        const fontName =
            run.bold && run.italic
                ? 'Helvetica-BoldOblique'
                : run.bold
                ? 'Helvetica-Bold'
                : run.italic
                ? 'Helvetica-Oblique'
                : 'Helvetica';
        doc.font(fontName);
        doc.text(run.text, { continued: idx < runs.length - 1, ...opts });
    });
};

// ─── primitive writers (V1 style, still used by chapters + fallback path) ───

const ensureSpaceFor = (doc, neededHeight = 60) => {
    if (doc.y + neededHeight > doc.page.height - PAGE_MARGIN) {
        doc.addPage();
    }
};

const writeHeading1 = (doc, text, anchor) => {
    ensureSpaceFor(doc, 80);
    if (anchor) {
        // Named destination — TOC entries reference these to jump here.
        doc.addNamedDestination(anchor);
    }
    doc
        .moveDown(0.4)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .fontSize(HEADING_FONT_SIZE)
        .text(text, { align: 'left' });

    const y = doc.y + 2;
    doc
        .moveTo(PAGE_MARGIN, y)
        .lineTo(doc.page.width - PAGE_MARGIN, y)
        .strokeColor(COLORS.rule)
        .lineWidth(1)
        .stroke();

    doc.moveDown(0.5).fillColor(COLORS.text).fontSize(BODY_FONT_SIZE).font('Helvetica');
};

const writeHeading2 = (doc, text) => {
    ensureSpaceFor(doc, 60);
    doc
        .moveDown(0.4)
        .fillColor(COLORS.accent)
        .font('Helvetica-Bold')
        .fontSize(SUBHEADING_FONT_SIZE)
        .text(text);
    doc.moveDown(0.2).fillColor(COLORS.text).fontSize(BODY_FONT_SIZE).font('Helvetica');
};

const writeBullet = (doc, text) => {
    const x = doc.x;
    doc
        .fillColor(COLORS.accent)
        .font('Helvetica-Bold')
        .fontSize(BODY_FONT_SIZE)
        .text('•  ', { continued: true });
    doc.fillColor(COLORS.text).font('Helvetica');
    writeInlineMarkdown(doc, text);
    doc.x = x;
};

const writeParagraph = (doc, text) => {
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(BODY_FONT_SIZE);
    writeInlineMarkdown(doc, text);
    doc.moveDown(0.25);
};

const writeDivider = (doc) => {
    doc.moveDown(0.3);
    const y = doc.y;
    doc
        .moveTo(PAGE_MARGIN + 8, y)
        .lineTo(doc.page.width - PAGE_MARGIN - 8, y)
        .strokeColor(COLORS.rule)
        .lineWidth(0.5)
        .dash(2, { space: 3 })
        .stroke()
        .undash();
    doc.moveDown(0.3);
};

const writeMarkdownBody = (doc, content) => {
    if (!content) return;
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let inBlankRun = false;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, '');
        if (!line.trim()) {
            if (!inBlankRun) doc.moveDown(0.3);
            inBlankRun = true;
            continue;
        }
        inBlankRun = false;
        if (/^---+$/.test(line.trim())) {
            writeDivider(doc);
            continue;
        }
        if (line.startsWith('## ')) {
            writeHeading2(doc, line.slice(3).trim());
            continue;
        }
        if (line.startsWith('# ')) {
            writeHeading1(doc, line.slice(2).trim());
            continue;
        }
        if (/^(\s*)([-*])\s+/.test(line)) {
            const trimmed = line.replace(/^(\s*)([-*])\s+/, '');
            writeBullet(doc, trimmed);
            continue;
        }
        if (/^\d+\.\s+/.test(line)) {
            const num = line.match(/^(\d+)\.\s+(.+)$/);
            if (num) {
                doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(BODY_FONT_SIZE);
                doc.text(`${num[1]}.  `, { continued: true });
                doc.fillColor(COLORS.text).font('Helvetica');
                writeInlineMarkdown(doc, num[2]);
                continue;
            }
        }
        writeParagraph(doc, line);
    }
};

// ─── card primitive ─────────────────────────────────────────────────────────
//
// All rich resource blocks (definition / formula / example / tip / concept)
// share the same card primitive: a coloured side-rail, optional light-violet
// background, padded content area.
//
// The content area accepts an array of `{ label, value, mono? }` rows. The
// card pre-measures its height with `doc.heightOfString` so we can page-
// break BEFORE drawing the rail/background (avoiding split cards across
// pages).

const contentWidth = (doc) => doc.page.width - PAGE_MARGIN * 2;
const cardInnerWidth = (doc) =>
    contentWidth(doc) - CARD_PADDING_X * 2 - CARD_RAIL_WIDTH;

const measureCardHeight = (doc, rows, { titleSize, hasFill }) => {
    let h = CARD_PADDING_Y * 2;
    // Title row
    if (rows.length > 0) {
        doc.font('Helvetica-Bold').fontSize(titleSize);
        h += doc.heightOfString(rows[0].value || '', {
            width: cardInnerWidth(doc),
            lineGap: 1,
        });
    }
    // Label rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row.value) continue;
        const labelFont = 'Helvetica-Bold';
        const valueFont = row.mono ? 'Courier' : 'Helvetica';
        doc.font(labelFont).fontSize(BODY_FONT_SIZE - 1);
        const labelH = doc.heightOfString(`${row.label}`, {
            width: cardInnerWidth(doc),
            lineGap: 1,
        });
        doc.font(valueFont).fontSize(BODY_FONT_SIZE);
        const valueH = doc.heightOfString(row.value, {
            width: cardInnerWidth(doc),
            lineGap: 1,
        });
        h += labelH + valueH + 6;
    }
    // mild padding to compensate for in-between gaps
    return h + 4 + (hasFill ? 0 : 0);
};

/**
 * Draw a resource card.
 *
 * @param {Object} doc      pdfkit document
 * @param {Object} args
 * @param {string} args.title          Card title (first row, bold)
 * @param {string} args.railColor      Hex colour for the left-edge rail
 * @param {Array<{label:string,value:string,mono?:boolean}>} args.rows
 * @param {boolean} [args.fill=true]   Whether to fill the card background
 */
const writeCard = (doc, { title, railColor, rows, fill = true }) => {
    const allRows = [{ label: '', value: title || '' }, ...rows.filter(Boolean)];
    const cardX = PAGE_MARGIN;
    const cardW = contentWidth(doc);
    const cardH =
        measureCardHeight(doc, allRows, { titleSize: SUBHEADING_FONT_SIZE, hasFill: fill });

    // Page-break before drawing if we don't fit.
    if (doc.y + cardH + 8 > doc.page.height - PAGE_MARGIN - 20) {
        doc.addPage();
    }

    const startY = doc.y;

    // Background fill (very light violet).
    if (fill) {
        doc.save()
            .roundedRect(cardX, startY, cardW, cardH, 6)
            .fill(COLORS.cardBg)
            .restore();
    }

    // Left side-rail.
    doc.save()
        .rect(cardX, startY, CARD_RAIL_WIDTH, cardH)
        .fill(railColor)
        .restore();

    // Card content
    const contentX = cardX + CARD_RAIL_WIDTH + CARD_PADDING_X;
    const contentY = startY + CARD_PADDING_Y;
    const innerW = cardInnerWidth(doc);

    doc.x = contentX;
    doc.y = contentY;

    // Title
    doc.fillColor(COLORS.cardLabel)
        .font('Helvetica-Bold')
        .fontSize(SUBHEADING_FONT_SIZE)
        .text(title || '', { width: innerW, lineGap: 1 });
    doc.moveDown(0.2);

    // Labelled rows
    for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (!row.value) continue;
        doc.x = contentX;
        doc.fillColor(COLORS.cardLabelMuted)
            .font('Helvetica-Bold')
            .fontSize(BODY_FONT_SIZE - 1)
            .text(row.label, { width: innerW, lineGap: 1 });
        doc.x = contentX;
        doc.fillColor(COLORS.text)
            .font(row.mono ? 'Courier' : 'Helvetica')
            .fontSize(BODY_FONT_SIZE)
            .text(row.value, { width: innerW, lineGap: 1 });
        doc.moveDown(0.25);
    }

    // Reset cursor below the card.
    doc.x = PAGE_MARGIN;
    doc.y = startY + cardH + CARD_GAP;
};

// ─── code block (used for the Mermaid mindmap source) ───────────────────────

const writeCodeBlock = (doc, code, { title = '' } = {}) => {
    if (!code) return;
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    // Pre-measure
    doc.font('Courier').fontSize(BODY_FONT_SIZE - 1);
    const lineHeight = doc.currentLineHeight(true);
    const codeH = lines.length * lineHeight + 24;

    if (doc.y + codeH > doc.page.height - PAGE_MARGIN - 20) doc.addPage();
    const startY = doc.y;
    const x = PAGE_MARGIN;
    const w = contentWidth(doc);

    doc.save()
        .roundedRect(x, startY, w, codeH, 6)
        .fill(COLORS.codeBg)
        .restore();

    doc.x = x + 12;
    doc.y = startY + 10;

    if (title) {
        doc.fillColor(COLORS.cardLabelMuted)
            .font('Helvetica-Bold')
            .fontSize(BODY_FONT_SIZE - 2)
            .text(title.toUpperCase(), { width: w - 24 });
        doc.moveDown(0.2);
    }

    doc.fillColor(COLORS.codeText)
        .font('Courier')
        .fontSize(BODY_FONT_SIZE - 1)
        .text(code, { width: w - 24, lineGap: 1 });

    doc.x = PAGE_MARGIN;
    doc.y = startY + codeH + 8;
};

// ─── per-section writers ────────────────────────────────────────────────────

const writeChapters = (doc, summary, outlineBranch) => {
    const chapters = Array.isArray(summary.chapters) ? summary.chapters : [];
    if (!chapters.length) return;
    for (const ch of chapters) {
        // Each chapter gets its own outline entry — pdfkit anchors the
        // outline item to whatever page is current when addItem is called.
        outlineBranch?.addItem(ch.title || 'Untitled chapter');
        writeHeading1(doc, ch.title || 'Untitled chapter', ch.anchor);
        writeMarkdownBody(doc, ch.content || '');
        doc.moveDown(0.4);
    }
};

const writeDefinitions = (doc, summary, outlineRoot) => {
    const defs = Array.isArray(summary.richDefinitions) ? summary.richDefinitions : [];
    if (!defs.length) return;
    outlineRoot?.addItem('Important Definitions');
    writeHeading1(doc, 'Important Definitions', 'definitions');
    for (const d of defs) {
        writeCard(doc, {
            title: d.term,
            railColor: COLORS.railDefinition,
            rows: [
                { label: 'Definition', value: d.definition },
                d.simpleExplanation && { label: 'Plain language', value: d.simpleExplanation },
                d.analogy && { label: 'Analogy', value: d.analogy },
                d.importance && { label: 'Why it matters', value: d.importance },
                d.examQuestion && { label: 'Likely exam question', value: d.examQuestion },
                d.interviewQuestion && {
                    label: 'Likely interview question',
                    value: d.interviewQuestion,
                },
            ].filter(Boolean),
        });
    }
};

const writeKeyConcepts = (doc, summary, outlineRoot) => {
    const concepts = Array.isArray(summary.keyConcepts) ? summary.keyConcepts : [];
    if (!concepts.length) return;
    outlineRoot?.addItem('Key Concepts');
    writeHeading1(doc, 'Key Concepts', 'concepts');
    for (const c of concepts) {
        writeCard(doc, {
            title: c.title,
            railColor: COLORS.railConcept,
            rows: [{ label: '', value: c.explanation }],
            fill: false,
        });
    }
};

const writeFormulas = (doc, summary, outlineRoot) => {
    const formulas = Array.isArray(summary.richFormulas) ? summary.richFormulas : [];
    if (!formulas.length) return;
    outlineRoot?.addItem('Formula Sheet');
    writeHeading1(doc, 'Formula Sheet', 'formulas');
    for (const f of formulas) {
        writeCard(doc, {
            title: f.name,
            railColor: COLORS.railFormula,
            rows: [
                f.expression && { label: 'Expression', value: f.expression, mono: true },
                f.variables && { label: 'Variables', value: f.variables },
                f.explanation && { label: 'Explanation', value: f.explanation },
                f.example && { label: 'Example', value: f.example },
                (f.examImportance || f.interviewImportance) && {
                    label: 'Importance',
                    value: `Exam: ${f.examImportance || 'medium'}  ·  Interview: ${
                        f.interviewImportance || 'medium'
                    }`,
                },
            ].filter(Boolean),
        });
    }
};

const writeExamples = (doc, summary, outlineRoot) => {
    const examples = Array.isArray(summary.richExamples) ? summary.richExamples : [];
    if (!examples.length) return;
    outlineRoot?.addItem('Important Examples');
    writeHeading1(doc, 'Important Examples', 'examples');
    for (const e of examples) {
        writeCard(doc, {
            title: e.title,
            railColor: COLORS.railExample,
            rows: [
                e.conceptExample && { label: 'Concept', value: e.conceptExample },
                e.realWorldExample && { label: 'Real-world', value: e.realWorldExample },
                e.examExample && { label: 'Exam variant', value: e.examExample },
                e.interviewExample && {
                    label: 'Interview variant',
                    value: e.interviewExample,
                },
            ].filter(Boolean),
        });
    }
};

const writeExamTips = (doc, summary, outlineRoot) => {
    const tips = Array.isArray(summary.examTips) ? summary.examTips : [];
    if (!tips.length) return;
    outlineRoot?.addItem('Exam Tips');
    writeHeading1(doc, 'Exam Tips', 'tips');
    // Render every tip as a compact one-row card so they line up cleanly.
    for (const tip of tips) {
        writeCard(doc, {
            title: '',
            railColor: COLORS.railTip,
            rows: [{ label: '', value: tip }],
        });
    }
};

const writeMindMap = (doc, summary, outlineRoot) => {
    const mm = summary.mindmap || {};
    if (!mm.mermaid && !mm.outlineMarkdown) return;
    outlineRoot?.addItem('Mind Map');
    writeHeading1(doc, 'Mind Map', 'mindmap');

    if (mm.outlineMarkdown) {
        writeMarkdownBody(doc, mm.outlineMarkdown);
        doc.moveDown(0.4);
    }

    if (mm.mermaid) {
        doc.fillColor(COLORS.muted)
            .font('Helvetica-Oblique')
            .fontSize(BODY_FONT_SIZE - 1)
            .text(
                'Mermaid source (paste into any Mermaid-compatible viewer for the interactive diagram):',
                { width: contentWidth(doc) }
            );
        doc.moveDown(0.3);
        writeCodeBlock(doc, mm.mermaid, { title: 'Mermaid mindmap' });
    }
};

const writeFlashcardsSection = (doc, summary, outlineRoot) => {
    const cards = Array.isArray(summary.flashcards) ? summary.flashcards : [];
    if (!cards.length) return;
    outlineRoot?.addItem('Flashcards');
    writeHeading1(doc, 'Flashcards', 'flashcards');
    for (const fc of cards) {
        writeCard(doc, {
            title: fc.question,
            railColor: COLORS.railDefinition,
            rows: [
                { label: 'Answer', value: fc.answer },
                fc.difficulty && {
                    label: 'Difficulty',
                    value: fc.difficulty.toUpperCase(),
                },
            ].filter(Boolean),
        });
    }
};

const writeQuizSection = (doc, summary, outlineRoot) => {
    const quiz = Array.isArray(summary.quiz) ? summary.quiz : [];
    if (!quiz.length) return;
    outlineRoot?.addItem('Quiz');
    writeHeading1(doc, 'Practice Quiz', 'quiz');
    quiz.forEach((q, idx) => {
        const optionRows = (q.options || []).map((opt, i) => {
            const marker = i === q.correctIndex ? '✔' : ' ';
            return { label: `Option ${String.fromCharCode(65 + i)} ${marker}`, value: opt };
        });
        writeCard(doc, {
            title: `Q${idx + 1}. ${q.question}`,
            railColor: COLORS.railExample,
            rows: [
                ...optionRows,
                q.explanation && { label: 'Why', value: q.explanation },
            ].filter(Boolean),
        });
    });
};

const writeVivaSection = (doc, summary, outlineRoot) => {
    const viva = Array.isArray(summary.vivaQuestions) ? summary.vivaQuestions : [];
    if (!viva.length) return;
    outlineRoot?.addItem('Viva Questions');
    writeHeading1(doc, 'Viva Questions', 'viva');
    viva.forEach((v, idx) => {
        writeCard(doc, {
            title: `Q${idx + 1}. ${v.question}`,
            railColor: COLORS.railTip,
            rows: [
                v.expectedAnswer && { label: 'Expected answer', value: v.expectedAnswer },
                v.difficulty && {
                    label: 'Difficulty',
                    value: v.difficulty.toUpperCase(),
                },
            ].filter(Boolean),
        });
    });
};

// ─── Table of Contents (clickable) ──────────────────────────────────────────

const writeTableOfContents = (doc, entries, outlineRoot) => {
    if (!entries?.length) return;
    outlineRoot?.addItem('Table of Contents');
    writeHeading1(doc, 'Table of Contents', 'toc');
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(BODY_FONT_SIZE);
    entries.forEach((entry, idx) => {
        const labelLine = `${idx + 1}.  ${entry.title}`;
        // pdfkit's `goTo` makes the text a clickable link that jumps to the
        // named destination. We register destinations at each section's
        // heading via `addNamedDestination` in writeHeading1.
        const x = PAGE_MARGIN;
        doc.x = x;
        doc.fillColor(COLORS.link).font('Helvetica-Bold');
        doc.text(labelLine, x, doc.y, {
            width: contentWidth(doc),
            link: undefined,
            goTo: entry.anchor || slugify(entry.title),
            underline: false,
        });
        doc.moveDown(0.15);
    });
    doc.fillColor(COLORS.text).font('Helvetica');
};

// ─── cover + footer ─────────────────────────────────────────────────────────

const writeCover = (doc, summary) => {
    doc.save().rect(0, 0, doc.page.width, 130).fill(COLORS.primary).restore();

    doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('AI Document Intelligence', PAGE_MARGIN, 40, {
            width: doc.page.width - PAGE_MARGIN * 2,
        });
    doc.fillColor('rgba(255,255,255,0.85)')
        .font('Helvetica')
        .fontSize(12)
        .text('Generated study summary', PAGE_MARGIN, 70);

    doc.y = 170;
    doc.fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(26)
        .text(summary.sourceTitle || 'Untitled', {
            width: doc.page.width - PAGE_MARGIN * 2,
        });

    doc.moveDown(0.6);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11);
    if (summary.sourceFileName) doc.text(`Source file: ${summary.sourceFileName}`);
    const created = (summary.createdAt || new Date()).toString().slice(0, 24);
    doc.text(`Generated: ${created}`);

    // Insights chips
    doc.moveDown(1.2);
    const insights = summary.insights || {};
    const chips = [
        ['Chapters', insights.chapterCount ?? 0],
        ['Definitions', insights.definitionCount ?? 0],
        ['Formulas', insights.formulaCount ?? 0],
        ['Examples', summary.richExamples?.length ?? 0],
        ['Flashcards', insights.flashcardCount ?? summary.flashcards?.length ?? 0],
        ['Quiz', insights.quizCount ?? summary.quiz?.length ?? 0],
        ['Viva', insights.vivaCount ?? summary.vivaQuestions?.length ?? 0],
        ['Reading time', `${insights.estimatedReadingTime ?? 0} min`],
        ['Difficulty', insights.difficulty || 'medium'],
    ];

    const chipHeight = 26;
    const chipPaddingX = 12;
    const chipGap = 8;
    let chipX = PAGE_MARGIN;
    let chipY = doc.y;
    const maxX = doc.page.width - PAGE_MARGIN;

    for (const [label, value] of chips) {
        const text = `${label}: ${value}`;
        doc.font('Helvetica-Bold').fontSize(10);
        const textWidth = doc.widthOfString(text);
        const chipWidth = textWidth + chipPaddingX * 2;
        if (chipX + chipWidth > maxX) {
            chipX = PAGE_MARGIN;
            chipY += chipHeight + chipGap;
        }
        doc.save()
            .roundedRect(chipX, chipY, chipWidth, chipHeight, 13)
            .fill(COLORS.chip)
            .restore();
        doc.fillColor(COLORS.chipText).text(text, chipX + chipPaddingX, chipY + 8, {
            lineBreak: false,
        });
        chipX += chipWidth + chipGap;
    }
    doc.y = chipY + chipHeight + 20;
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(BODY_FONT_SIZE);

    doc.addPage();
};

const drawAllFooters = (doc) => {
    // Called after all content is laid out. Iterating buffered pages here
    // is the canonical pdfkit pattern; doing this in a `pageAdded` listener
    // is unsafe because emitting text on the new page can itself trigger
    // another `pageAdded` and the call stack explodes.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const pageNumber = i - range.start + 1;
        doc.save()
            .fillColor(COLORS.muted)
            .font('Helvetica')
            .fontSize(9);
        doc.text(
            'MeetMind AI · AI Document Intelligence',
            PAGE_MARGIN,
            doc.page.height - 30,
            { lineBreak: false, width: doc.page.width - PAGE_MARGIN * 2 }
        );
        doc.text(`Page ${pageNumber}`, PAGE_MARGIN, doc.page.height - 30, {
            lineBreak: false,
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'right',
        });
        doc.restore();
    }
};

// ─── public entrypoint ──────────────────────────────────────────────────────

/**
 * Render an AISummary document to a PDF buffer.
 *
 * Decides at runtime whether to use the V2 rich-data writers or the V1
 * sections-walker fallback, based on which fields are populated on the
 * summary. This keeps the function backwards-compatible with AISummary
 * documents created before V2 — they only have `sections[]` populated,
 * so we render them the V1 way and they look identical to before.
 */
export const renderSummaryPdf = (summary) =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: PAGE_MARGIN,
                    bottom: PAGE_MARGIN + 20,
                    left: PAGE_MARGIN,
                    right: PAGE_MARGIN,
                },
                bufferPages: true,
                info: {
                    Title: summary.sourceTitle || 'AI Generated Summary',
                    Author: 'MeetMind AI · AI Document Intelligence',
                    Subject: 'AI-generated study summary',
                    Creator: 'MeetMind AI',
                },
            });

            const chunks = [];
            doc.on('data', (b) => chunks.push(b));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            writeCover(doc, summary);

            // Cleanly choose render path based on populated fields. We
            // consider the doc V2 if ANY of the rich shapes is non-empty,
            // since the orchestrator populates them all at once.
            const isV2 =
                (summary.chapters && summary.chapters.length) ||
                (summary.richDefinitions && summary.richDefinitions.length) ||
                (summary.richFormulas && summary.richFormulas.length) ||
                (summary.richExamples && summary.richExamples.length) ||
                (summary.flashcards && summary.flashcards.length) ||
                (summary.quiz && summary.quiz.length) ||
                (summary.vivaQuestions && summary.vivaQuestions.length);

            const outlineRoot = doc.outline;

            if (isV2) {
                // Build TOC entries from whatever rich sections are present.
                const toc = [];
                if (summary.tableOfContents?.length) {
                    toc.push(...summary.tableOfContents);
                } else if (summary.chapters?.length) {
                    summary.chapters.forEach((c) => {
                        toc.push({
                            anchor: c.anchor || slugify(c.title),
                            title: c.title,
                            depth: 1,
                        });
                    });
                }
                // Append entries for the non-chapter sections.
                const addTocEntry = (cond, anchor, title) => {
                    if (cond) toc.push({ anchor, title, depth: 1 });
                };
                addTocEntry(summary.richDefinitions?.length, 'definitions', 'Important Definitions');
                addTocEntry(summary.keyConcepts?.length, 'concepts', 'Key Concepts');
                addTocEntry(summary.richFormulas?.length, 'formulas', 'Formula Sheet');
                addTocEntry(summary.richExamples?.length, 'examples', 'Important Examples');
                addTocEntry(summary.examTips?.length, 'tips', 'Exam Tips');
                addTocEntry(summary.mindmap?.outlineMarkdown || summary.mindmap?.mermaid, 'mindmap', 'Mind Map');
                addTocEntry(summary.flashcards?.length, 'flashcards', 'Flashcards');
                addTocEntry(summary.quiz?.length, 'quiz', 'Practice Quiz');
                addTocEntry(summary.vivaQuestions?.length, 'viva', 'Viva Questions');

                writeTableOfContents(doc, toc, outlineRoot);

                // Group chapter outline items under a single branch.
                const chaptersBranch = outlineRoot.addItem('Chapters');
                writeChapters(doc, summary, chaptersBranch);

                writeDefinitions(doc, summary, outlineRoot);
                writeKeyConcepts(doc, summary, outlineRoot);
                writeFormulas(doc, summary, outlineRoot);
                writeExamples(doc, summary, outlineRoot);
                writeExamTips(doc, summary, outlineRoot);
                writeMindMap(doc, summary, outlineRoot);
                writeFlashcardsSection(doc, summary, outlineRoot);
                writeQuizSection(doc, summary, outlineRoot);
                writeVivaSection(doc, summary, outlineRoot);
            } else {
                // V1 fallback: walk the sections[] array exactly like before.
                const sections = summary.sections || [];
                for (let i = 0; i < sections.length; i++) {
                    const s = sections[i];
                    writeHeading1(doc, s.title || 'Section', s.anchor);
                    outlineRoot.addItem(s.title || 'Section');
                    writeMarkdownBody(doc, s.content || '');
                    if (i < sections.length - 1) doc.moveDown(0.6);
                }
            }

            drawAllFooters(doc);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });

/**
 * Estimate the rendered page count without actually rendering the PDF.
 *
 * V2: scales cards/formulas/examples count alongside section words because
 * a richly-populated summary takes substantially more pages than its raw
 * word count would suggest (every card has padding + side rail + label rows).
 */
export const estimateSummaryPageCount = (summary) => {
    const sections = summary.sections || [];
    const totalWords = sections.reduce((acc, s) => {
        const words = (s.content || '').split(/\s+/).filter(Boolean).length;
        return acc + words + 6; // section heading "tax"
    }, 0);

    let pages = Math.ceil(totalWords / 280) + 1; // cover

    // V2: cards take more vertical space than markdown alone would.
    const cards =
        (summary.richDefinitions?.length || 0) +
        (summary.richFormulas?.length || 0) +
        (summary.richExamples?.length || 0) +
        (summary.examTips?.length || 0) +
        (summary.flashcards?.length || 0) +
        (summary.quiz?.length || 0) +
        (summary.vivaQuestions?.length || 0);
    pages += Math.ceil(cards / 5); // ~5 cards per page

    if (summary.tableOfContents?.length) pages += 1;
    if (summary.mindmap?.mermaid) pages += 1;

    return Math.max(1, pages);
};
