const { detectSections } = require('./resumeParser');
const {
  extractJDKeywords,
  extractKnownSkills,
  analyzeKeywordMatch,
  keywordDensity,
} = require('../utils/keywordExtractor');
const {
  countWords,
  estimateReadability,
  findRepeatedWords,
  findWeakVerbs,
  findStrongVerbs,
  findBuzzwords,
  basicGrammarIssues,
} = require('../utils/textUtils');

// Weights exactly as specified in the product spec
const WEIGHTS = {
  keywordMatch: 30,
  skillsMatch: 20,
  experience: 15,
  projects: 10,
  formatting: 10,
  grammar: 5,
  education: 5,
  achievements: 3,
  actionVerbs: 2,
};

function pct(part, whole) {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/** Splits resume text into bullet-point lines (the unit real ATS/recruiter review happens at). */
function getBullets(resumeText = '') {
  const lines = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const explicitBullets = lines.filter((l) => /^[•\-*▪‣◦]/.test(l));
  if (explicitBullets.length >= 2) return explicitBullets;

  // Fallback for resumes that don't use bullet characters at all — but
  // exclude contact lines, section headers, and pipe-separated title lines
  // so they don't get miscounted as "un-quantified, weak-verb bullets".
  return lines.filter((l) => {
    if (l.length < 25 || l.length > 250) return false;
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(l)) return false; // contains an email
    if ((l.match(/\|/g) || []).length >= 2) return false; // pipe-separated header/contact line
    if (/^[A-Z\s&/-]{4,}$/.test(l)) return false; // ALL-CAPS section header
    return true;
  });
}

function scoreKeywordMatch(resumeText, jdText) {
  if (!jdText || !jdText.trim()) {
    // No JD provided -> can't measure true match. Award a modest, honest
    // baseline rather than a generous one, since there's nothing to match against.
    return {
      score: 50,
      matched: [],
      missing: [],
      matchedCritical: [],
      missingCritical: [],
      totalKeywords: 0,
    };
  }
  const jdKeywords = extractJDKeywords(jdText);
  const analysis = analyzeKeywordMatch(jdKeywords, resumeText);
  return { ...analysis, jdKeywordCount: analysis.totalKeywords };
}

function scoreSkillsMatch(resumeText, jdText) {
  const resumeSkills = extractKnownSkills(resumeText);
  if (!jdText || !jdText.trim()) {
    // No JD: reward a reasonable, realistic breadth of recognized skills —
    // capped well below 100 since there's no target to actually validate against.
    const score = Math.min(70, resumeSkills.length * 6);
    return { score, matchedSkills: resumeSkills, missingSkills: [], resumeSkills };
  }
  const jdSkills = extractKnownSkills(jdText);
  const matchedSkills = jdSkills.filter((s) => resumeSkills.includes(s));
  const missingSkills = jdSkills.filter((s) => !resumeSkills.includes(s));
  const score = pct(matchedSkills.length, jdSkills.length || 1);
  return { score, matchedSkills, missingSkills, resumeSkills };
}

function scoreExperience(resumeText, sections) {
  if (!sections.experience) return { score: 0, hasBullets: false, quantifiedRatio: 0, hasDateRanges: false };

  const bullets = getBullets(resumeText);
  let score = 30; // base credit just for having a real experience section

  const hasBullets = bullets.length >= 2;
  if (hasBullets) score += 15;

  // Ratio-based quantification check — one lucky number in the whole resume
  // used to be enough for full credit. Now we require a meaningful share of
  // bullets to actually carry a measurable result.
  const quantifiedBullets = bullets.filter((b) => /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/.test(b));
  const quantifiedRatio = bullets.length ? quantifiedBullets.length / bullets.length : 0;
  score += Math.round(quantifiedRatio * 35); // up to 35 pts, scaled by actual ratio

  const hasDateRanges = /\b(19|20)\d{2}\b\s*(-|–|to)\s*(present|current|(19|20)\d{2})/i.test(resumeText);
  if (hasDateRanges) score += 10;

  // Penalize very short experience sections (a couple of one-line entries
  // shouldn't score the same as a fully fleshed-out section).
  if (bullets.length < 3) score -= 10;

  return { score: Math.max(0, Math.min(100, score)), hasBullets, quantifiedRatio, hasDateRanges };
}

function scoreProjects(resumeText, sections) {
  if (!sections.projects) return { score: 0 };

  let score = 35;
  const hasTechStackMention = /(tech stack|technologies used|built with|stack:|tools used)/i.test(resumeText);
  if (hasTechStackMention) score += 20;

  const bullets = getBullets(resumeText);
  const hasBullets = bullets.length >= 2;
  if (hasBullets) score += 15;

  const quantified = bullets.filter((b) => /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/.test(b));
  const ratio = bullets.length ? quantified.length / bullets.length : 0;
  score += Math.round(ratio * 30);

  return { score: Math.min(100, score) };
}

function scoreFormatting(resumeText) {
  let score = 100;
  const issues = [];

  // Only flag as a possible table if MULTIPLE lines use a pipe-grid pattern —
  // a single "email | phone | location" contact line is standard formatting,
  // not a table, and shouldn't be penalized.
  const pipeGridLines = resumeText.split('\n').filter((l) => (l.match(/\|/g) || []).length >= 2).length;
  if (pipeGridLines >= 3) {
    score -= 25;
    issues.push('Possible table structure detected — tables can break ATS parsing.');
  }

  const wordCount = countWords(resumeText);
  if (wordCount < 250) {
    score -= 30;
    issues.push('Resume content is too short for a complete, ATS-competitive resume (aim for 400–700 words).');
  } else if (wordCount < 400) {
    score -= 12;
    issues.push('Resume is on the shorter side — consider adding more detail to experience/projects.');
  } else if (wordCount > 1100) {
    score -= 15;
    issues.push('Resume is quite long — consider tightening to 1–2 pages.');
  }

  const hasEmail = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(resumeText);
  if (!hasEmail) {
    score -= 20;
    issues.push('No email address detected — contact info may be missing or unreadable.');
  }

  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  if (!hasPhone) {
    score -= 12;
    issues.push('No phone number detected.');
  }

  const longParagraphs = resumeText.split('\n').some((line) => line.length > 350);
  if (longParagraphs) {
    score -= 15;
    issues.push('Long, dense paragraphs detected — break into concise bullet points.');
  }

  const bullets = getBullets(resumeText);
  if (bullets.length < 4) {
    score -= 15;
    issues.push('Very few bullet points detected — ATS and recruiters both favor scannable bullet-point structure.');
  }

  // First-person pronouns ("I", "my") are a common resume-writing weakness
  // that real ATS/recruiter reviews penalize — resumes should use implied-subject phrasing.
  const pronounMatches = resumeText.match(/\b(I|my|me)\b/g) || [];
  if (pronounMatches.length > 3) {
    score -= 10;
    issues.push('Frequent first-person pronouns ("I", "my") detected — resumes read stronger without them.');
  }

  // LinkedIn profile link check
  const hasLinkedIn = /linkedin\.com\/in\/[\w-]+/i.test(resumeText);
  if (!hasLinkedIn) {
    score -= 5;
    issues.push('No LinkedIn profile URL detected — modern recruiters expect a link to your professional profile.');
  }

  // GitHub profile link check for tech positions
  const hasGitHub = /github\.com\/[\w-]+/i.test(resumeText);
  const isTechProfile = /(developer|engineer|programmer|coder|software|tech|data|web|backend|frontend|fullstack|cloud)/i.test(resumeText);
  if (!hasGitHub && isTechProfile) {
    score -= 5;
    issues.push('No GitHub profile link detected — technical resumes benefit heavily from linking to public projects.');
  }

  return { score: Math.max(0, Math.round(score)), issues, hasEmail, hasPhone, wordCount };
}

function scoreGrammar(resumeText) {
  const issues = basicGrammarIssues(resumeText);
  const readability = estimateReadability(resumeText);
  const repeated = findRepeatedWords(resumeText);
  const buzzwords = findBuzzwords(resumeText);

  let score = 100;
  score -= Math.min(45, issues.length * 7);
  score -= Math.min(25, repeated.length * 4);
  score -= Math.min(15, buzzwords.length * 5);
  if (readability < 30) score -= 15;
  else if (readability < 45) score -= 8;

  return { score: Math.max(0, Math.round(score)), issues, readability, repeated };
}

function scoreEducation(sections, resumeText) {
  if (!sections.education) return { score: 0 };
  let score = 70;
  const hasDegreeKeyword = /(bachelor|master|b\.?tech|m\.?tech|b\.?sc|m\.?sc|phd|associate degree|diploma)/i.test(resumeText);
  if (hasDegreeKeyword) score += 20;
  const hasYear = /\b(19|20)\d{2}\b/.test(resumeText);
  if (hasYear) score += 10;
  return { score: Math.min(100, score) };
}

function scoreAchievements(sections, resumeText) {
  if (!sections.achievements) return { score: 0 };

  // Only count numbers/metrics that actually appear near the achievements
  // section, not just "anywhere in the resume" — otherwise an unrelated
  // quantified bullet in Experience was inflating this score for free.
  const lines = resumeText.split('\n');
  const startIdx = lines.findIndex((l) => /\b(achievements?|awards|honors)\b/i.test(l));
  const achievementsBlock = startIdx >= 0 ? lines.slice(startIdx, startIdx + 8).join('\n') : '';

  let score = 45;
  const hasQuantified = /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/.test(achievementsBlock);
  if (hasQuantified) score += 40;
  const bulletCount = (achievementsBlock.match(/^[•\-*▪‣◦]/gm) || []).length;
  if (bulletCount >= 2) score += 15;

  return { score: Math.min(100, score) };
}

function scoreActionVerbs(resumeText) {
  const bullets = getBullets(resumeText);
  const strong = findStrongVerbs(resumeText);
  const weak = findWeakVerbs(resumeText);

  if (!bullets.length) return { score: 0, strongVerbsFound: strong, weakVerbsFound: weak };

  // Ratio-based: what share of bullets actually *open* with a strong action verb,
  // rather than just "does the word appear anywhere in the whole document".
  const strongOpeners = bullets.filter((b) => {
    const firstWord = b.replace(/^[•\-*▪‣◦]\s*/, '').split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    if (!firstWord) return false;
    return strong.some((v) => v.startsWith(firstWord) || firstWord === v);
  });

  let score = Math.round((strongOpeners.length / bullets.length) * 100);
  score -= weak.length * 12;

  return { score: Math.max(0, Math.min(100, score)), strongVerbsFound: strong, weakVerbsFound: weak };
}

/**
 * Master scoring function — combines all sub-scores using the fixed weight table.
 * Deterministic: same input always yields the same output (no randomness).
 * Sub-scores are ratio/quality-based rather than simple "checkbox" presence
 * checks, so the overall score tracks a resume's real ATS competitiveness
 * much more closely instead of running consistently high.
 */
function calculateATSScore(resumeText, jdText = '') {
  const sections = detectSections(resumeText);

  const keyword = scoreKeywordMatch(resumeText, jdText);
  const skills = scoreSkillsMatch(resumeText, jdText);
  const experience = scoreExperience(resumeText, sections);
  const projects = scoreProjects(resumeText, sections);
  const formatting = scoreFormatting(resumeText);
  const grammar = scoreGrammar(resumeText);
  const education = scoreEducation(sections, resumeText);
  const achievements = scoreAchievements(sections, resumeText);
  const actionVerbs = scoreActionVerbs(resumeText);

  const weightedTotal =
    (keyword.score * WEIGHTS.keywordMatch +
      skills.score * WEIGHTS.skillsMatch +
      experience.score * WEIGHTS.experience +
      projects.score * WEIGHTS.projects +
      formatting.score * WEIGHTS.formatting +
      grammar.score * WEIGHTS.grammar +
      education.score * WEIGHTS.education +
      achievements.score * WEIGHTS.achievements +
      actionVerbs.score * WEIGHTS.actionVerbs) /
    100;

  const overallScore = Math.round(weightedTotal);

  const density = keywordDensity(resumeText, [...(skills.resumeSkills || []), ...keyword.matched]);

  // Estimated interview chance — clearly an estimate, derived only from
  // ATS score, keyword match, experience relevance & formatting (per spec)
  const interviewChance = Math.round(
    overallScore * 0.4 + keyword.score * 0.3 + experience.score * 0.2 + formatting.score * 0.1
  );

  const quality =
    overallScore >= 85 ? 'Excellent' : overallScore >= 70 ? 'Good' : overallScore >= 50 ? 'Fair' : 'Needs Work';

  return {
    overallScore,
    quality,
    interviewChance: Math.max(0, Math.min(100, interviewChance)),
    breakdown: {
      keywordMatch: { score: keyword.score, weight: WEIGHTS.keywordMatch },
      skillsMatch: { score: skills.score, weight: WEIGHTS.skillsMatch },
      experience: { score: experience.score, weight: WEIGHTS.experience },
      projects: { score: projects.score, weight: WEIGHTS.projects },
      formatting: { score: formatting.score, weight: WEIGHTS.formatting },
      grammar: { score: grammar.score, weight: WEIGHTS.grammar },
      education: { score: education.score, weight: WEIGHTS.education },
      achievements: { score: achievements.score, weight: WEIGHTS.achievements },
      actionVerbs: { score: actionVerbs.score, weight: WEIGHTS.actionVerbs },
    },
    keywordAnalysis: {
      matched: keyword.matched,
      missing: keyword.missing,
      criticalMissing: keyword.missingCritical || [],
      criticalMatched: keyword.matchedCritical || [],
      density,
      totalJDKeywords: keyword.jdKeywordCount || 0,
    },
    skillsAnalysis: {
      matched: skills.matchedSkills || [],
      missing: skills.missingSkills || [],
    },
    sections,
    formattingIssues: formatting.issues,
    grammarIssues: grammar.issues,
    readabilityScore: grammar.readability,
    repeatedWords: grammar.repeated,
    actionVerbs: {
      strong: actionVerbs.strongVerbsFound,
      weak: actionVerbs.weakVerbsFound,
    },
    buzzwords: findBuzzwords(resumeText),
    wordCount: formatting.wordCount,
  };
}

/**
 * Builds the heatmap: per-section quality rating (green/yellow/red)
 */
function buildSectionHeatmap(atsResult) {
  const rate = (present, subScore) => {
    if (!present) return 'red';
    if (subScore >= 75) return 'green';
    if (subScore >= 45) return 'yellow';
    return 'red';
  };

  const { sections, breakdown } = atsResult;

  return {
    summary: sections.summary ? (breakdown.grammar.score >= 60 ? 'green' : 'yellow') : 'red',
    experience: rate(sections.experience, breakdown.experience.score),
    projects: rate(sections.projects, breakdown.projects.score),
    skills: rate(sections.skills, breakdown.skillsMatch.score),
    education: rate(sections.education, breakdown.education.score),
    achievements: rate(sections.achievements, breakdown.achievements.score),
    certifications: sections.certifications ? 'green' : 'yellow',
  };
}

/**
 * Ranks improvement suggestions by impact, derived from the actual score breakdown.
 * Critical missing keywords are surfaced first and separately from
 * secondary/nice-to-have ones, since that's the single biggest lever on a real ATS score.
 */
function buildTopImprovements(atsResult) {
  const { breakdown, keywordAnalysis, skillsAnalysis, formattingIssues, actionVerbs } = atsResult;
  const suggestions = [];

  if (keywordAnalysis.criticalMissing?.length) {
    suggestions.push({
      impact: 'High',
      area: 'Critical Keywords',
      suggestion: `These appear to be required/frequently-mentioned in the job description and are missing from your resume: ${keywordAnalysis.criticalMissing.slice(0, 6).join(', ')}. Only add them if you genuinely have this experience.`,
    });
  }
  if (breakdown.skillsMatch.score < 70 && skillsAnalysis.missing.length) {
    suggestions.push({
      impact: 'High',
      area: 'Skills',
      suggestion: `Highlight or gain experience in missing skills: ${skillsAnalysis.missing.slice(0, 5).join(', ')}.`,
    });
  }
  if (breakdown.experience.score < 65) {
    suggestions.push({
      impact: 'High',
      area: 'Experience',
      suggestion: 'Quantify more of your bullet points with numbers, percentages, or measurable outcomes — aim for most bullets to include a metric.',
    });
  }
  if (breakdown.actionVerbs.score < 60) {
    suggestions.push({
      impact: 'Medium',
      area: 'Action Verbs',
      suggestion: 'Start more bullet points with a strong action verb (e.g. "developed", "led", "optimized") instead of weak phrases like "worked on" or "responsible for".',
    });
  }
  if (breakdown.formatting.score < 80 && formattingIssues.length) {
    suggestions.push({
      impact: 'Medium',
      area: 'Formatting',
      suggestion: formattingIssues[0],
    });
  }
  if (keywordAnalysis.missing?.length && breakdown.keywordMatch.score < 80) {
    const secondaryMissing = keywordAnalysis.missing.filter((k) => !keywordAnalysis.criticalMissing.includes(k));
    if (secondaryMissing.length) {
      suggestions.push({
        impact: 'Low',
        area: 'Additional Keywords',
        suggestion: `Consider naturally incorporating: ${secondaryMissing.slice(0, 5).join(', ')}.`,
      });
    }
  }
  if (breakdown.projects.score < 55) {
    suggestions.push({
      impact: 'Medium',
      area: 'Projects',
      suggestion: 'Add a dedicated Projects section listing technologies used and measurable impact per project.',
    });
  }
  if (breakdown.grammar.score < 80) {
    suggestions.push({
      impact: 'Low',
      area: 'Grammar & Readability',
      suggestion: 'Review for repeated words, buzzwords, and long sentences to improve readability.',
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      impact: 'Low',
      area: 'General',
      suggestion: 'Your resume is well optimized. Consider tailoring the summary further for each specific role.',
    });
  }

  const order = { High: 0, Medium: 1, Low: 2 };
  return suggestions.sort((a, b) => order[a.impact] - order[b.impact]);
}

/**
 * Self-optimization pass for the Resume Builder: if the JD requires a skill
 * that the user genuinely mentioned somewhere in their own submitted profile
 * (skills/experience/projects/achievements/certifications/languages) but it
 * didn't make it into the final generated resume text, surface it in the
 * Skills section. This never invents anything — it only reconciles what the
 * user already told us against what the resume actually displays.
 */
function reconcileSkillsCoverage(resumeText, profile = {}, jobDescription = '') {
  if (!jobDescription || !jobDescription.trim()) return resumeText;

  const initialScore = calculateATSScore(resumeText, jobDescription);
  const missingCritical = initialScore.keywordAnalysis.criticalMissing || [];
  if (!missingCritical.length) return resumeText;

  const rawCombined = [
    profile.skills,
    profile.experience,
    profile.projects,
    profile.achievements,
    profile.certifications,
    profile.languages,
  ]
    .filter(Boolean)
    .join(' \n ')
    .toLowerCase();
  const paddedRaw = ` ${rawCombined} `;

  const genuineAdditions = missingCritical.filter((kw) => paddedRaw.includes(` ${kw.toLowerCase()} `));
  if (!genuineAdditions.length) return resumeText;

  const lines = resumeText.split('\n');
  const skillsIdx = lines.findIndex((l) =>
    /^(TECHNICAL\s+)?SKILLS\s*$/i.test(l.trim())
  );
  if (skillsIdx === -1 || skillsIdx + 1 >= lines.length) return resumeText;

  // Prefer appending to the first non-empty skills content line (supports grouped skills).
  let skillsLineIdx = skillsIdx + 1;
  while (skillsLineIdx < lines.length && !lines[skillsLineIdx].trim()) {
    skillsLineIdx += 1;
  }
  if (skillsLineIdx >= lines.length) return resumeText;

  const existingLine = lines[skillsLineIdx] || '';
  const sectionLower = lines.slice(skillsIdx, skillsIdx + 12).join('\n').toLowerCase();
  const toAdd = genuineAdditions.filter((kw) => !sectionLower.includes(kw.toLowerCase()));
  if (!toAdd.length) return resumeText;

  lines[skillsLineIdx] = `${existingLine.replace(/\s*$/, '')}${existingLine.trim() ? ', ' : ''}${toAdd.join(', ')}`;
  return lines.join('\n');
}

module.exports = { calculateATSScore, buildSectionHeatmap, buildTopImprovements, reconcileSkillsCoverage, WEIGHTS };
