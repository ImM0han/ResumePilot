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
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

module.exports = { extractTextFromFile, detectSections, cleanExtractedText };
