const { extractTextFromFile } = require('../services/resumeParser');
const {
  calculateATSScore,
  buildSectionHeatmap,
  buildTopImprovements,
  reconcileSkillsCoverage,
} = require('../services/atsScoring');
const aiService = require('../services/aiService');
const exportService = require('../services/exportService');

function requireField(value, name) {
  if (!value || !String(value).trim()) {
    const err = new Error(`${name} is required.`);
    err.statusCode = 400;
    throw err;
  }
}

// POST /api/extract-resume  (upload only -> returns raw text)
async function extractResume(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Please attach a PDF or DOCX resume.');
      err.statusCode = 400;
      throw err;
    }
    const text = await extractTextFromFile(req.file.buffer, req.file.originalname);
    if (!text || text.length < 20) {
      const err = new Error('The uploaded file appears to be empty or unreadable.');
      err.statusCode = 400;
      throw err;
    }
    res.json({ success: true, data: { resumeText: text } });
  } catch (err) {
    next(err);
  }
}

// POST /api/build-resume  (JSON body: jobDescription + profile fields)
async function buildResume(req, res, next) {
  try {
    const { jobDescription, ...profile } = req.body;
    requireField(profile.name, 'Name');
    requireField(profile.email, 'Email');

    let resumeText = await aiService.generateResume({ jobDescription: jobDescription || '', profile });

    // Self-optimization pass: if a JD-required skill was genuinely provided
    // by the user (e.g. mentioned in Experience) but didn't surface in the
    // generated Skills section, reconcile it in — never inventing anything new.
    resumeText = reconcileSkillsCoverage(resumeText, profile, jobDescription || '');

    const atsResult = calculateATSScore(resumeText, jobDescription || '');
    const heatmap = buildSectionHeatmap(atsResult);
    const topImprovements = buildTopImprovements(atsResult);

    // If the user left Experience/Projects blank, we never fabricate content
    // for it — but we do make sure they know that's the single biggest lever
    // on their real ATS score, with a concrete, honest suggestion of what to add.
    const gapNudges = [];
    if (!profile.experience?.trim() && !profile.projects?.trim()) {
      gapNudges.push({
        impact: 'High',
        area: 'Missing Sections',
        suggestion:
          'No Experience or Projects were provided, so those sections were left out rather than invented. Adding even one real project — ideally using technologies mentioned in the job description — will meaningfully raise your ATS score and shortlisting chances.',
      });
    } else if (!profile.projects?.trim()) {
      gapNudges.push({
        impact: 'Medium',
        area: 'Missing Sections',
        suggestion:
          'No Projects were provided, so that section was left out rather than invented. A real project demonstrating the job description\'s key skills can meaningfully strengthen this resume.',
      });
    } else if (!profile.experience?.trim()) {
      gapNudges.push({
        impact: 'Medium',
        area: 'Missing Sections',
        suggestion:
          'No Experience was provided, so that section was left out rather than invented. If you have any internships, freelance work, or volunteering, adding it will strengthen this resume.',
      });
    }

    res.json({
      success: true,
      data: {
        resumeText,
        atsPreview: {
          score: atsResult.overallScore,
          quality: atsResult.quality,
          breakdown: atsResult.breakdown,
          keywordAnalysis: atsResult.keywordAnalysis,
          heatmap,
          topImprovements: [...gapNudges, ...topImprovements],
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/optimize-resume  (multipart: file + jobDescription) OR JSON: resumeText + jobDescription
async function optimizeResume(req, res, next) {
  try {
    let resumeText = req.body.resumeText;
    if (req.file) {
      resumeText = await extractTextFromFile(req.file.buffer, req.file.originalname);
    }
    requireField(resumeText, 'Resume');
    requireField(req.body.jobDescription, 'Job description');

    const result = await aiService.optimizeResume({ resumeText, jobDescription: req.body.jobDescription });
    const beforeScore = calculateATSScore(resumeText, req.body.jobDescription);
    const afterScore = calculateATSScore(result.optimizedResume || resumeText, req.body.jobDescription);

    res.json({
      success: true,
      data: {
        original: resumeText,
        ...result,
        scoreComparison: { before: beforeScore.overallScore, after: afterScore.overallScore },
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/check-ats  (multipart: file + jobDescription) OR JSON: resumeText + jobDescription
async function checkATS(req, res, next) {
  try {
    let resumeText = req.body.resumeText;
    if (req.file) {
      resumeText = await extractTextFromFile(req.file.buffer, req.file.originalname);
    }
    requireField(resumeText, 'Resume');

    const jobDescription = req.body.jobDescription || '';
    const atsResult = calculateATSScore(resumeText, jobDescription);
    const heatmap = buildSectionHeatmap(atsResult);
    const topImprovements = buildTopImprovements(atsResult);

    res.json({ success: true, data: { resumeText, ...atsResult, heatmap, topImprovements } });
  } catch (err) {
    next(err);
  }
}

// POST /api/recruiter-dashboard  (multipart: file + jobDescription, candidateName, targetRole)
async function recruiterDashboard(req, res, next) {
  try {
    let resumeText = req.body.resumeText;
    if (req.file) {
      resumeText = await extractTextFromFile(req.file.buffer, req.file.originalname);
    }
    requireField(resumeText, 'Resume');

    const jobDescription = req.body.jobDescription || '';
    const atsResult = calculateATSScore(resumeText, jobDescription);
    const heatmap = buildSectionHeatmap(atsResult);
    const topImprovements = buildTopImprovements(atsResult);
    const recruiterFeedback = await aiService.generateRecruiterFeedback({ resumeText, jobDescription, atsResult });

    res.json({
      success: true,
      data: {
        candidateName: req.body.candidateName || 'Candidate',
        targetRole: req.body.targetRole || 'Target Role',
        lastUpdated: new Date().toISOString(),
        resumeText,
        ...atsResult,
        heatmap,
        topImprovements,
        recruiterFeedback,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/cover-letter  (JSON: resumeText, jobDescription, company, role)
async function coverLetter(req, res, next) {
  try {
    const { resumeText, jobDescription, company, role } = req.body;
    requireField(resumeText, 'Resume');
    requireField(jobDescription, 'Job description');

    const letter = await aiService.generateCoverLetter({ resumeText, jobDescription, company, role });
    res.json({ success: true, data: { coverLetter: letter } });
  } catch (err) {
    next(err);
  }
}

// POST /api/interview  (JSON: resumeText, jobDescription, company, role)
async function interviewPrep(req, res, next) {
  try {
    const { resumeText, jobDescription, company, role } = req.body;
    requireField(resumeText, 'Resume');
    requireField(jobDescription, 'Job description');

    const questions = await aiService.generateInterviewQuestions({ resumeText, jobDescription, company, role });
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
}

// POST /api/export  (JSON: resumeText, format)
async function exportResume(req, res, next) {
  try {
    const { resumeText, format } = req.body;
    requireField(resumeText, 'Resume text');
    requireField(format, 'Export format');

    let buffer;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'pdf':
        buffer = await exportService.generatePDF(resumeText);
        contentType = 'application/pdf';
        filename = 'resume.pdf';
        break;
      case 'docx':
        buffer = await exportService.generateDOCX(resumeText);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = 'resume.docx';
        break;
      case 'txt':
        buffer = exportService.generateTXT(resumeText);
        contentType = 'text/plain';
        filename = 'resume.txt';
        break;
      default: {
        const err = new Error('Invalid export format. Use pdf, docx, or txt.');
        err.statusCode = 400;
        throw err;
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  extractResume,
  buildResume,
  optimizeResume,
  checkATS,
  recruiterDashboard,
  coverLetter,
  interviewPrep,
  exportResume,
};
