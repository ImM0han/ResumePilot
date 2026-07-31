const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');

// Order matches a proven, widely-used single-page ATS resume structure:
// header block, then Summary leads, Skills, Experience, Projects,
// Certifications, Education, with Achievements/Languages as optional extras.
const SECTION_HEADERS = [
  'SUMMARY', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'CERTIFICATIONS',
  'EDUCATION', 'ACHIEVEMENTS', 'LANGUAGES',
];

function isSectionHeader(line) {
  const trimmed = line.trim().toUpperCase();
  return SECTION_HEADERS.some((h) => trimmed === h || trimmed.startsWith(h));
}

/**
 * The header block is the name + tagline + contact/links lines at the very
 * top, before the first blank line. Everything in it is centered, mirroring
 * the classic centered-header ATS resume format.
 */
function getHeaderBlockLineCount(lines) {
  let count = 0;
  for (const line of lines) {
    if (!line.trim()) break;
    count += 1;
  }
  return count;
}

async function generatePDF(resumeText) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const fontSize = 10.5;
  const lineHeight = 14;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const lines = resumeText.split('\n');
  const headerBlockCount = getHeaderBlockLineCount(lines);

  const addNewPageIfNeeded = () => {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const wrapText = (text, useFont, size) => {
    const words = text.split(' ');
    const wrapped = [];
    let current = '';
    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      const width = useFont.widthOfTextAtSize(test, size);
      if (width > maxWidth && current) {
        wrapped.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) wrapped.push(current);
    return wrapped;
  };

  const drawLine = (text, { useFont, size, centered, color }) => {
    const wrapped = wrapText(text, useFont, size);
    wrapped.forEach((wLine) => {
      addNewPageIfNeeded();
      const width = useFont.widthOfTextAtSize(wLine, size);
      const x = centered ? Math.max(margin, (pageWidth - width) / 2) : margin;
      page.drawText(wLine, { x, y, size, font: useFont, color });
      y -= lineHeight;
    });
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/\t/g, '    ');
    if (!line.trim()) {
      y -= lineHeight * 0.6;
      addNewPageIfNeeded();
      return;
    }

    const inHeaderBlock = idx < headerBlockCount;
    const header = isSectionHeader(line);
    const isName = idx === 0;

    if (inHeaderBlock) {
      drawLine(line.trim(), {
        useFont: isName ? boldFont : font,
        size: isName ? fontSize + 6 : fontSize,
        centered: true,
        color: rgb(0.05, 0.05, 0.05),
      });
      return;
    }

    const useFont = header ? boldFont : font;
    const size = header ? fontSize + 1 : fontSize;
    drawLine(line, { useFont, size, centered: false, color: rgb(0.1, 0.1, 0.1) });

    if (header) {
      // Underline rule beneath the section header, matching a classic
      // single-page ATS template's visual structure.
      addNewPageIfNeeded();
      page.drawLine({
        start: { x: margin, y: y + 4 },
        end: { x: pageWidth - margin, y: y + 4 },
        thickness: 0.75,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 4;
    }
  });

  return pdfDoc.save();
}

async function generateDOCX(resumeText) {
  const lines = resumeText.split('\n');
  const headerBlockCount = getHeaderBlockLineCount(lines);

  const paragraphs = lines.map((line, idx) => {
    if (!line.trim()) {
      return new Paragraph({ text: '' });
    }

    const inHeaderBlock = idx < headerBlockCount;
    const isName = idx === 0;

    if (inHeaderBlock) {
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: isName ? 60 : 40 },
        children: [
          new TextRun({
            text: line.trim(),
            bold: isName,
            size: isName ? 32 : 20, // half-points: 16pt name, 10pt contact lines
          }),
        ],
      });
    }

    if (isSectionHeader(line)) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 60 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, space: 2, color: '333333' },
        },
        children: [new TextRun({ text: line.trim(), bold: true })],
      });
    }

    return new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: line })],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
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
