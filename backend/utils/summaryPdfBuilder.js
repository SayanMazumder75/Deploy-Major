// ─────────────────────────────────────────────────────────────────────────────
// summaryPdfBuilder
//
// Renders an `AISummary` document into a clean, branded PDF using pdfkit.
//
// pdfkit was chosen because:
//   - it is pure-JS (no native binaries, no headless Chromium) and works on
//     Render's standard Node container without extra setup;
//   - it streams output, so we can collect the buffer in-memory without ever
//     touching the filesystem (important on Render where `/tmp` is wiped
//     between requests);
//   - it gives us per-page numbering + custom headers + per-section spacing,
//     which is essential for the "X pages" stat displayed on the results
//     dashboard to actually match the rendered PDF.
//
// The renderer walks `sections` (the structured representation stored on
// the AISummary) and uses a very small markdown-ish parser for `**bold**`,
// `_italic_`, and lines that start with `- ` (bullets) or `## ` (subheadings).
// We deliberately do NOT pull in a full markdown→PDF library — the upstream
// summarizer emits a small, well-known subset so a 60-line parser is more
// reliable here.
// ─────────────────────────────────────────────────────────────────────────────

import PDFDocument from 'pdfkit';

// Brand palette (mirrors the frontend purple→pink glassmorphism theme).
const COLORS = {
    primary: '#7c3aed',     // violet-600
    accent: '#ec4899',      // pink-500
    text: '#1e1b4b',        // indigo-950
    muted: '#64748b',       // slate-500
    rule: '#e9d5ff',        // purple-200
    chip: '#f5f3ff',        // violet-50
    chipText: '#6d28d9',    // violet-700
};

const PAGE_MARGIN = 56;
const BODY_FONT_SIZE = 11;
const HEADING_FONT_SIZE = 18;
const SUBHEADING_FONT_SIZE = 14;

// ─── tiny inline-markdown writer ─────────────────────────────────────────────
// Splits a line into {text, bold, italic} runs based on **bold** and _italic_
// markers, then writes each run with the correct font. Keeps it minimal —
// nested/overlapping markers fall back to the raw characters.
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
        // Match `_italic_` but NOT inside words like `snake_case`.
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

    // Now actually emit. pdfkit lets us chain calls in continued mode so the
    // whole logical line wraps as one paragraph.
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

// ─── content-block writers ───────────────────────────────────────────────────

const writeHeading1 = (doc, text) => {
    // Reserve space; force a new page only if there isn't enough room for the
    // heading + at least 2 body lines (avoids orphaned chapter titles).
    if (doc.y > doc.page.height - PAGE_MARGIN - 80) doc.addPage();
    doc
        .moveDown(0.4)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .fontSize(HEADING_FONT_SIZE)
        .text(text, { align: 'left' });

    // Underline rule.
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
    if (doc.y > doc.page.height - PAGE_MARGIN - 60) doc.addPage();
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
    doc.x = x; // restore left margin for next line
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

// Walk a markdown-ish content string line-by-line and emit the right block.
const writeContent = (doc, content) => {
    if (!content) return;
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let inBlankRun = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/, '');

        if (!line.trim()) {
            // Collapse multiple blank lines into a single paragraph break.
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

// ─── cover + footer ──────────────────────────────────────────────────────────

const writeCover = (doc, summary) => {
    const s = summary;
    // Big purple title band at the top of the cover page.
    doc
        .save()
        .rect(0, 0, doc.page.width, 130)
        .fill(COLORS.primary)
        .restore();

    doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('AI Document Intelligence', PAGE_MARGIN, 40, { width: doc.page.width - PAGE_MARGIN * 2 });
    doc
        .fillColor('rgba(255,255,255,0.85)')
        .font('Helvetica')
        .fontSize(12)
        .text('Generated study summary', PAGE_MARGIN, 70);

    doc.y = 170;
    doc
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .fontSize(26)
        .text(s.sourceTitle || 'Untitled', { width: doc.page.width - PAGE_MARGIN * 2 });

    doc.moveDown(0.6);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11);
    if (s.sourceFileName) doc.text(`Source file: ${s.sourceFileName}`);
    const created = (s.createdAt || new Date()).toString().slice(0, 24);
    doc.text(`Generated: ${created}`);

    // Insights chips.
    doc.moveDown(1.2);
    const insights = s.insights || {};
    const chips = [
        ['Chapters', insights.chapterCount ?? 0],
        ['Definitions', insights.definitionCount ?? 0],
        ['Formulas', insights.formulaCount ?? 0],
        ['Diagrams', insights.diagramCount ?? 0],
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
        doc
            .save()
            .roundedRect(chipX, chipY, chipWidth, chipHeight, 13)
            .fill(COLORS.chip)
            .restore();
        doc
            .fillColor(COLORS.chipText)
            .text(text, chipX + chipPaddingX, chipY + 8, { lineBreak: false });
        chipX += chipWidth + chipGap;
    }
    doc.y = chipY + chipHeight + 20;
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(BODY_FONT_SIZE);

    doc.addPage();
};

const drawAllFooters = (doc) => {
    // Called once after ALL content has been written. Iterating buffered pages
    // here is the canonical pdfkit pattern; doing it in a `pageAdded` listener
    // is unsafe because emitting text on the new page can itself trigger
    // another `pageAdded` and the call stack explodes (we hit that during
    // initial smoke-testing).
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const pageNumber = i - range.start + 1;
        // pdfkit's `text` flows from `doc.y`; we want absolute positioning.
        // `save` + `restore` keeps the graphics state isolated so nothing we
        // do here leaks into content writers above.
        doc
            .save()
            .fillColor(COLORS.muted)
            .font('Helvetica')
            .fontSize(9);
        doc.text(
            'MeetMind AI · AI Document Intelligence',
            PAGE_MARGIN,
            doc.page.height - 30,
            { lineBreak: false, width: doc.page.width - PAGE_MARGIN * 2 }
        );
        doc.text(
            `Page ${pageNumber}`,
            PAGE_MARGIN,
            doc.page.height - 30,
            {
                lineBreak: false,
                width: doc.page.width - PAGE_MARGIN * 2,
                align: 'right',
            }
        );
        doc.restore();
    }
};

// ─── public entrypoint ───────────────────────────────────────────────────────

/**
 * Render an AISummary document to a PDF buffer.
 *
 * @param {Object} summary - A populated AISummary document (Mongoose or plain).
 * @returns {Promise<Buffer>}
 */
export const renderSummaryPdf = (summary) =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: PAGE_MARGIN,
                    bottom: PAGE_MARGIN + 20, // leave room for footer
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

            // Body — walk every section and emit a heading + content block.
            const sections = summary.sections || [];
            for (let i = 0; i < sections.length; i++) {
                const s = sections[i];
                writeHeading1(doc, s.title || 'Section');
                writeContent(doc, s.content || '');
                if (i < sections.length - 1) doc.moveDown(0.6);
            }

            // Footers must be drawn AFTER all content is laid out so we can
            // safely walk every buffered page without re-triggering layout.
            drawAllFooters(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });

/**
 * Estimate the rendered page count for an AISummary without actually rendering
 * the PDF. Used to populate `summaryPageCount` for the "X pages" stat on the
 * results dashboard before the user has clicked anything.
 *
 * Calibration: ~280 words fit on a standard A4 page with the layout above
 * (headings + bullets eat some space).
 *
 * @param {Object} summary
 * @returns {number}
 */
export const estimateSummaryPageCount = (summary) => {
    const sections = summary.sections || [];
    const totalWords = sections.reduce((acc, s) => {
        const words = (s.content || '').split(/\s+/).filter(Boolean).length;
        return acc + words + 6; // +6 word "tax" per section heading
    }, 0);
    return Math.max(1, Math.ceil(totalWords / 280) + 1 /* cover */);
};
