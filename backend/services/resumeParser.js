const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts plain text from an uploaded resume file (PDF or DOCX).
 * @param {Buffer} buffer - file buffer (from multer memoryStorage)
 * @param {string} originalName - original file name, used to detect type
 * @returns {Promise<string>} extracted plain text
 */
async function extractTextFromFile(buffer, originalName = '') {
  const ext = originalName.toLowerCase().split('.').pop();

  try {
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      return cleanExtractedText(data.text);
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return cleanExtractedText(result.value);
    }

    throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
  } catch (err) {
    if (err.message.includes('Unsupported')) throw err;
    const parseError = new Error(
      `Could not read the uploaded file. It may be corrupted, password-protected, or a scanned image without selectable text. (${err.message})`
    );
    parseError.statusCode = 400;
    throw parseError;
  }
}

function cleanExtractedText(text = '') {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n');

  cleaned = mergeBulletMarkerLines(cleaned);
  cleaned = fixGluedNumbers(cleaned);

  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Some PDF exports place the bullet glyph (•, -, *, etc.) on its own line,
 * separate from the bullet's actual text on the next line — this is a very
 * common layout artifact (bullet glyph and text are separate objects in the
 * PDF's internal structure). Left alone, every downstream bullet-based check
 * (quantification, action verbs, bullet count) silently operates on empty
 * "•" bullets instead of the real content, badly understating the score.
 */
function mergeBulletMarkerLines(text) {
  const lines = text.split('\n');
  const merged = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^[•\-*▪‣◦]$/.test(trimmed) && i + 1 < lines.length && lines[i + 1].trim()) {
      merged.push(`${trimmed} ${lines[i + 1].trim()}`);
      i += 1; // skip the next line, its content was just consumed
    } else {
      merged.push(lines[i]);
    }
  }
  return merged.join('\n');
}

/**
 * PDF extraction sometimes drops the space between adjacent text runs that
 * are positioned right next to each other in the layout but are separate
 * objects internally — most commonly a CGPA/score immediately followed by a
 * graduation year, e.g. "7.812023" instead of "7.81 2023". Left unfixed,
 * this breaks year/date detection used for education & experience scoring.
 * Deliberately narrow (only decimal-number-immediately-followed-by-a-year)
 * so it can't accidentally insert spaces into legitimate text elsewhere.
 */
function fixGluedNumbers(text) {
  return text.replace(/(\d+\.\d+)((?:19|20)\d{2})/g, '$1 $2');
}

/** Rough "is this actually a job description, or just noise/a stray word" check. */
function hasMeaningfulContent(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const wordCount = (trimmed.match(/\S+/g) || []).length;
  return trimmed.length >= 30 && wordCount >= 6;
}

/**
 * Very lightweight resume section detector based on common headers.
 * Used to check "section completeness" for ATS scoring & the heatmap.
 */
const SECTION_PATTERNS = {
  summary: /\b(summary|profile|objective|about me)\b/i,
  experience: /\b(experience|employment|work history)\b/i,
  education: /\b(education|academic)\b/i,
  skills: /\b(skills|technical skills|core competencies)\b/i,
  projects: /\b(projects|personal projects)\b/i,
  achievements: /\b(achievements|awards|honors)\b/i,
  certifications: /\b(certifications?|licenses)\b/i,
};

function detectSections(text = '') {
  const found = {};
  Object.entries(SECTION_PATTERNS).forEach(([key, pattern]) => {
    found[key] = pattern.test(text);
  });
  return found;
}

module.exports = { extractTextFromFile, detectSections, cleanExtractedText, hasMeaningfulContent };