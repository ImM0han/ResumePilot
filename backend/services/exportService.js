const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TabStopType, TabStopPosition } = require('docx');

// Jake's Resume / LaTeX ATS section titles (Title Case), plus legacy ALL-CAPS.
const SECTION_HEADERS = [
  'PROFESSIONAL SUMMARY',
  'TECHNICAL SKILLS',
  'SUMMARY',
  'SKILLS',
  'EXPERIENCE',
  'PROJECTS',
  'CERTIFICATIONS',
  'EDUCATION',
  'ACHIEVEMENTS',
  'LANGUAGES',
];

function normalizeHeader(line) {
  return line.trim().toUpperCase().replace(/\s+/g, ' ');
}

function isSectionHeader(line) {
  const trimmed = normalizeHeader(line);
  return SECTION_HEADERS.some((h) => trimmed === h);
}

/**
 * Header block = name + tagline + contact/links before the first blank line.
 */
function getHeaderBlockLineCount(lines) {
  let count = 0;
  for (const line of lines) {
    if (!line.trim()) break;
    count += 1;
  }
  return count;
}

function isBullet(line) {
  return /^[•\-\*]\s+/.test(line.trim());
}

/**
 * Split "Left | Right" for Jake two-column rows (title/dates, company/location).
 * Skill category lines and project tech stacks stay single-line.
 */
function splitTwoColumn(line, currentSection) {
  const section = normalizeHeader(currentSection || '');
  if (
    section.includes('SKILL') ||
    section === 'PROFESSIONAL SUMMARY' ||
    section === 'SUMMARY'
  ) {
    return null;
  }

  if (isBullet(line)) return null;

  const idx = line.lastIndexOf(' | ');
  if (idx === -1) return null;

  const left = line.slice(0, idx).trim();
  const right = line.slice(idx + 3).trim();
  if (!left || !right) return null;

  // Project headings keep name | tech on one visual line (left-aligned bold).
  if (section === 'PROJECTS') return null;

  return { left, right };
}

function skillLabelSplit(line) {
  const m = line.match(/^([A-Za-z0-9 /&+.-]+):\s*(.+)$/);
  if (!m) return null;
  return { label: m[1].trim(), value: m[2].trim() };
}

async function generatePDF(resumeText) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Margins inspired by the Jake LaTeX template (tight one-page layout).
  const marginX = 42;
  const marginY = 40;
  const pageWidth = 612;
  const pageHeight = 792;
  const fontSize = 10;
  const lineHeight = 13;
  const maxWidth = pageWidth - marginX * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginY;
  let currentSection = '';

  const lines = resumeText.split('\n');
  const headerBlockCount = getHeaderBlockLineCount(lines);

  const addNewPageIfNeeded = (needed = lineHeight) => {
    if (y < marginY + needed) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginY;
    }
  };

  const wrapText = (text, useFont, size, width = maxWidth) => {
    const words = text.split(' ');
    const wrapped = [];
    let current = '';
    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (useFont.widthOfTextAtSize(test, size) > width && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) wrapped.push(current);
    return wrapped.length ? wrapped : [''];
  };

  const drawCentered = (text, { useFont, size, color }) => {
    wrapText(text, useFont, size).forEach((wLine) => {
      addNewPageIfNeeded();
      const width = useFont.widthOfTextAtSize(wLine, size);
      const x = Math.max(marginX, (pageWidth - width) / 2);
      page.drawText(wLine, { x, y, size, font: useFont, color });
      y -= lineHeight;
    });
  };

  const drawTwoColumn = (left, right, { leftFont, rightFont, size, leftItalic = false }) => {
    addNewPageIfNeeded();
    const rightWidth = rightFont.widthOfTextAtSize(right, size);
    const leftMax = maxWidth - rightWidth - 12;
    const leftLines = wrapText(left, leftFont, size, Math.max(80, leftMax));

    leftLines.forEach((wLine, i) => {
      addNewPageIfNeeded();
      page.drawText(wLine, {
        x: marginX,
        y,
        size,
        font: leftItalic ? italicFont : leftFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      if (i === 0) {
        page.drawText(right, {
          x: pageWidth - marginX - rightWidth,
          y,
          size,
          font: rightFont,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
      y -= lineHeight;
    });
  };

  const drawBodyLine = (line) => {
    const columns = splitTwoColumn(line, currentSection);
    if (columns) {
      // Title|Dates → bold left; Company|Location → italic left
      const looksLikeDates = /\d{4}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(
        columns.right
      );
      drawTwoColumn(columns.left, columns.right, {
        leftFont: looksLikeDates ? boldFont : italicFont,
        rightFont: looksLikeDates ? font : italicFont,
        size: fontSize,
        leftItalic: !looksLikeDates,
      });
      return;
    }

    const section = normalizeHeader(currentSection || '');
    if (section.includes('SKILL')) {
      const parts = skillLabelSplit(line);
      if (parts) {
        addNewPageIfNeeded();
        const label = `${parts.label}: `;
        page.drawText(label, {
          x: marginX,
          y,
          size: fontSize,
          font: boldFont,
          color: rgb(0.08, 0.08, 0.08),
        });
        const labelW = boldFont.widthOfTextAtSize(label, fontSize);
        const valueLines = wrapText(parts.value, font, fontSize, maxWidth - labelW);
        valueLines.forEach((vl, i) => {
          addNewPageIfNeeded();
          page.drawText(vl, {
            x: i === 0 ? marginX + labelW : marginX,
            y,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight;
        });
        return;
      }
    }

    if (section === 'PROJECTS' && !isBullet(line) && line.includes(' | ')) {
      const idx = line.indexOf(' | ');
      const name = line.slice(0, idx).trim();
      const tech = line.slice(idx + 3).trim();
      addNewPageIfNeeded();
      const nameText = name;
      const barTech = ` | ${tech}`;
      page.drawText(nameText, {
        x: marginX,
        y,
        size: fontSize,
        font: boldFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      const nw = boldFont.widthOfTextAtSize(nameText, fontSize);
      const techLines = wrapText(barTech, font, fontSize, maxWidth - nw);
      techLines.forEach((tl, i) => {
        addNewPageIfNeeded();
        page.drawText(tl, {
          x: i === 0 ? marginX + nw : marginX,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
      });
      return;
    }

    const bullet = isBullet(line);
    const text = bullet ? line.trim().replace(/^[•\-\*]\s+/, '') : line;
    const prefix = bullet ? '• ' : '';
    const indent = bullet ? 14 : 0;
    const wrapped = wrapText(prefix + text, font, fontSize, maxWidth - indent);
    wrapped.forEach((wLine, i) => {
      addNewPageIfNeeded();
      page.drawText(wLine, {
        x: marginX + indent,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/\t/g, '    ');
    if (!line.trim()) {
      y -= lineHeight * 0.45;
      addNewPageIfNeeded();
      return;
    }

    const inHeaderBlock = idx < headerBlockCount;
    const header = isSectionHeader(line);
    const isName = idx === 0;

    if (inHeaderBlock) {
      drawCentered(line.trim(), {
        useFont: isName ? boldFont : font,
        size: isName ? fontSize + 8 : fontSize,
        color: rgb(0.05, 0.05, 0.05),
      });
      return;
    }

    if (header) {
      currentSection = line.trim();
      y -= 2;
      addNewPageIfNeeded(lineHeight + 8);
      page.drawText(line.trim(), {
        x: marginX,
        y,
        size: fontSize + 1.5,
        font: boldFont,
        color: rgb(0.08, 0.08, 0.08),
      });
      y -= 4;
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.8,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineHeight - 2;
      return;
    }

    drawBodyLine(line);
  });

  return pdfDoc.save();
}

async function generateDOCX(resumeText) {
  const lines = resumeText.split('\n');
  const headerBlockCount = getHeaderBlockLineCount(lines);
  let currentSection = '';

  const paragraphs = [];

  lines.forEach((line, idx) => {
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      return;
    }

    const inHeaderBlock = idx < headerBlockCount;
    const isName = idx === 0;

    if (inHeaderBlock) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: isName ? 60 : 40 },
          children: [
            new TextRun({
              text: line.trim(),
              bold: isName,
              size: isName ? 36 : 20,
              allCaps: isName,
            }),
          ],
        })
      );
      return;
    }

    if (isSectionHeader(line)) {
      currentSection = line.trim();
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 40 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: '222222' },
          },
          children: [new TextRun({ text: line.trim(), bold: true, size: 22 })],
        })
      );
      return;
    }

    const columns = splitTwoColumn(line, currentSection);
    if (columns) {
      const looksLikeDates = /\d{4}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(
        columns.right
      );
      paragraphs.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: columns.left,
              bold: looksLikeDates,
              italics: !looksLikeDates,
              size: 20,
            }),
            new TextRun({ text: '\t' }),
            new TextRun({
              text: columns.right,
              italics: !looksLikeDates,
              size: 20,
            }),
          ],
        })
      );
      return;
    }

    const section = normalizeHeader(currentSection || '');
    if (section.includes('SKILL')) {
      const parts = skillLabelSplit(line);
      if (parts) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${parts.label}: `, bold: true, size: 20 }),
              new TextRun({ text: parts.value, size: 20 }),
            ],
          })
        );
        return;
      }
    }

    if (section === 'PROJECTS' && !isBullet(line) && line.includes(' | ')) {
      const pIdx = line.indexOf(' | ');
      paragraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          children: [
            new TextRun({ text: line.slice(0, pIdx).trim(), bold: true, size: 20 }),
            new TextRun({ text: ` | ${line.slice(pIdx + 3).trim()}`, size: 20 }),
          ],
        })
      );
      return;
    }

    const bullet = isBullet(line);
    paragraphs.push(
      new Paragraph({
        spacing: { after: 40 },
        indent: bullet ? { left: 220 } : undefined,
        children: [
          new TextRun({
            text: bullet ? `• ${line.trim().replace(/^[•\-\*]\s+/, '')}` : line,
            size: 20,
          }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 540, bottom: 540, left: 540, right: 540 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function generateTXT(resumeText) {
  return Buffer.from(resumeText, 'utf-8');
}

module.exports = { generatePDF, generateDOCX, generateTXT, SECTION_HEADERS };
