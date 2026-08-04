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

/*
 * ============================================================
 * ResumePilot ATS Engine
 * ============================================================
 * Deterministic — same resume + same JD always produces the
 * same score. AI is never used to calculate the score.
 *
 * Weighted categories (must sum to 100):
 *   Keyword Match   20%
 *   Skills Match    30%
 *   Experience      20%
 *   Projects        20%
 *   Education        5%
 *   Formatting       3%
 *   Grammar          2%
 *
 * Action verbs, achievements, and buzzwords are still analyzed
 * and returned for the UI (Action Verb Analyzer, heatmap, etc.)
 * but are informational only — they no longer carry scoring
 * weight, per the simplified rubric above.
 * ============================================================
 */
const WEIGHTS = {
    keywordMatch: 20,
    skillsMatch: 30,
    experience: 20,
    projects: 20,
    education: 5,
    formatting: 3,
    grammar: 2,
};

const SECTION_HEADER_NAMES = [
    'summary', 'skills', 'experience', 'projects',
    'education', 'certifications', 'achievements', 'languages',
];

function pct(part, whole) {
    if (!whole) return 0;
    return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

/** Splits resume text into bullet-point lines (the unit real ATS/recruiter review happens at). */
function getBullets(text = '') {
    const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);

    const explicitBullets = lines.filter((l) => /^[•\-*▪‣◦]/.test(l));
    if (explicitBullets.length >= 2) return explicitBullets;

    // Fallback for resumes that don't use bullet characters at all — but
    // exclude contact lines, section headers, and pipe-separated title lines
    // so they don't get miscounted as "un-quantified, weak-verb bullets".
    return lines.filter((l) => {
        if (l.length < 25 || l.length > 250) return false;
        if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(l)) return false;
        if ((l.match(/\|/g) || []).length >= 2) return false;
        if (/^[A-Z\s&/-]{4,}$/.test(l)) return false;
        return true;
    });
}

/**
 * Isolates the text belonging to one named section (from its header line
 * until the next recognized section header or end of document). Used so
 * Experience/Projects scoring measures relevance and quality WITHIN that
 * section specifically, instead of the whole resume bleeding together.
 */
function extractSectionBlock(resumeText = '', sectionName) {
    const lines = String(resumeText).split('\n');
    const headerRegex = new RegExp(`^${sectionName}\\s*$`, 'i');
    const anyHeaderRegex = new RegExp(`^(${SECTION_HEADER_NAMES.join('|')})\\b`, 'i');

    const startIdx = lines.findIndex((l) => headerRegex.test(l.trim()) || new RegExp(`^${sectionName}\\b`, 'i').test(l.trim()));
    if (startIdx === -1) return '';

    const rest = lines.slice(startIdx + 1);
    const endOffset = rest.findIndex((l) => anyHeaderRegex.test(l.trim()));
    const block = endOffset === -1 ? rest : rest.slice(0, endOffset);
    return block.join('\n');
}

/** Ratio of a JD's keyword vocabulary that genuinely appears within a given text block. */
function relevanceRatio(block, jdKeywords) {
    const all = [...(jdKeywords.critical || []), ...(jdKeywords.secondary || [])];
    if (!all.length || !block) return 0;
    const normalized = ` ${block.toLowerCase()} `;
    const cappedTotal = Math.min(all.length, 12); // don't demand matching an enormous vocabulary to hit full credit
    let matched = 0;
    for (const kw of all) {
        const pattern = ` ${kw.toLowerCase()} `;
        if (normalized.includes(pattern)) matched += 1;
        if (matched >= cappedTotal) break;
    }
    return Math.min(1, matched / cappedTotal);
}

// ---------------------------------------------------------------
// 1. KEYWORD MATCH (20%)
// ---------------------------------------------------------------
function scoreKeywordMatch(resumeText, jdText) {
    if (!jdText || !jdText.trim()) {
        return { score: 50, matched: [], missing: [], matchedCritical: [], missingCritical: [], totalKeywords: 0 };
    }
    const jdKeywords = extractJDKeywords(jdText);
    const analysis = analyzeKeywordMatch(jdKeywords, resumeText);
    return {...analysis, jdKeywordCount: analysis.totalKeywords, jdKeywords };
}

// ---------------------------------------------------------------
// 2. SKILLS MATCH (30%) — the single biggest lever, so it gets the
// same critical/secondary weighting as keyword match, but restricted
// to genuine recognized skill terms rather than generic JD vocabulary.
// ---------------------------------------------------------------
function scoreSkillsMatch(resumeText, jdText, jdKeywordProfile) {
    const resumeSkills = new Set(extractKnownSkills(resumeText).map((s) => s.toLowerCase()));

    if (!jdText || !jdText.trim()) {
        const breadth = Math.min(65, resumeSkills.size * 6);
        return { score: breadth, matchedSkills: Array.from(resumeSkills), missingSkills: [] };
    }

    const jdSkills = extractKnownSkills(jdText);
    if (!jdSkills.length) {
        return { score: 40, matchedSkills: [], missingSkills: [] };
    }

    const jdSkillSet = new Set(jdSkills.map((s) => s.toLowerCase()));
    const criticalSkills = (jdKeywordProfile ?.critical || []).filter((k) => jdSkillSet.has(k.toLowerCase()));
    const secondarySkills = (jdKeywordProfile ?.secondary || []).filter((k) => jdSkillSet.has(k.toLowerCase()));

    // Any JD skill not captured by the critical/secondary split (edge case) still counts as secondary.
    const classified = new Set([...criticalSkills, ...secondarySkills].map((s) => s.toLowerCase()));
    const unclassified = jdSkills.filter((s) => !classified.has(s.toLowerCase()));
    const secondaryAll = [...secondarySkills, ...unclassified];

    const matchedCritical = criticalSkills.filter((s) => resumeSkills.has(s.toLowerCase()));
    const matchedSecondary = secondaryAll.filter((s) => resumeSkills.has(s.toLowerCase()));
    const missingCritical = criticalSkills.filter((s) => !resumeSkills.has(s.toLowerCase()));
    const missingSecondary = secondaryAll.filter((s) => !resumeSkills.has(s.toLowerCase()));

    const criticalWeight = 2;
    const secondaryWeight = 1;
    const totalWeight = criticalSkills.length * criticalWeight + secondaryAll.length * secondaryWeight;
    const earnedWeight = matchedCritical.length * criticalWeight + matchedSecondary.length * secondaryWeight;
    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 40;

    return {
        score,
        matchedSkills: [...matchedCritical, ...matchedSecondary],
        missingSkills: [...missingCritical, ...missingSecondary],
        missingCriticalSkills: missingCritical,
    };
}

// ---------------------------------------------------------------
// 3. EXPERIENCE (20%) — blends writing quality (bullets, quantification,
// dates) with genuine relevance to THIS job description's vocabulary,
// measured specifically within the Experience section text.
// ---------------------------------------------------------------
function scoreExperience(resumeText, sections, jdKeywords) {
    if (!sections.experience) return { score: 0, quantifiedRatio: 0, hasDateRanges: false, relevance: 0 };

    const block = extractSectionBlock(resumeText, 'experience') || resumeText;
    const bullets = getBullets(block);

    let score = 20; // base credit for a genuine experience section

    if (bullets.length >= 2) score += 10;

    const quantified = bullets.filter((b) => /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/.test(b));
    const quantifiedRatio = bullets.length ? quantified.length / bullets.length : 0;
    score += Math.round(quantifiedRatio * 20);

    const hasDateRanges = /\b(19|20)\d{2}\b\s*(-|–|to)\s*(present|current|(19|20)\d{2})/i.test(resumeText);
    if (hasDateRanges) score += 10;

    // Relevance to the specific JD is the strongest signal of whether this
    // experience will actually help the candidate get shortlisted.
    const relevance = relevanceRatio(block, jdKeywords);
    score += Math.round(relevance * 35);

    if (bullets.length < 3) score -= 10; // thin section penalty

    return { score: Math.max(0, Math.min(100, score)), quantifiedRatio, hasDateRanges, relevance };
}

// ---------------------------------------------------------------
// 4. PROJECTS (20%) — same philosophy as Experience: quality + relevance,
// but relevance is weighted even more heavily since projects are the
// most direct, controllable way a candidate demonstrates fit for a role.
// ---------------------------------------------------------------
function scoreProjects(resumeText, sections, jdKeywords) {
    if (!sections.projects) return { score: 0, relevance: 0 };

    const block = extractSectionBlock(resumeText, 'projects') || resumeText;
    const bullets = getBullets(block);

    let score = 15;

    const hasTechStackMention = /(tech stack|technologies used|built with|stack:|tools used)/i.test(block);
    if (hasTechStackMention) score += 10;

    if (bullets.length >= 2) score += 10;

    const quantified = bullets.filter((b) => /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/.test(b));
    const ratio = bullets.length ? quantified.length / bullets.length : 0;
    score += Math.round(ratio * 15);

    const relevance = relevanceRatio(block, jdKeywords);
    score += Math.round(relevance * 50);

    return { score: Math.min(100, score), relevance };
}

// ---------------------------------------------------------------
// 5. EDUCATION (5%)
// ---------------------------------------------------------------
function scoreEducation(sections, resumeText) {
    if (!sections.education) return { score: 0 };
    const block = extractSectionBlock(resumeText, 'education') || resumeText;

    let score = 60;
    const hasDegreeKeyword = /(bachelor|master|b\.?tech|m\.?tech|b\.?sc|m\.?sc|phd|associate degree|diploma|b\.?e\.?)/i.test(block);
    if (hasDegreeKeyword) score += 25;
    const hasYear = /\b(19|20)\d{2}\b/.test(block);
    if (hasYear) score += 15;
    return { score: Math.min(100, score) };
}

// ---------------------------------------------------------------
// 6. FORMATTING (3%)
// ---------------------------------------------------------------
function scoreFormatting(resumeText) {
    let score = 100;
    const issues = [];

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

    const pronounMatches = resumeText.match(/\b(I|my|me)\b/g) || [];
    if (pronounMatches.length > 3) {
        score -= 10;
        issues.push('Frequent first-person pronouns ("I", "my") detected — resumes read stronger without them.');
    }

    return { score: Math.max(0, Math.round(score)), issues, hasEmail, hasPhone, wordCount };
}

// ---------------------------------------------------------------
// 7. GRAMMAR (2%)
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Informational only (not weighted): action verbs
// ---------------------------------------------------------------
function analyzeActionVerbs(resumeText) {
    const bullets = getBullets(resumeText);
    const strong = findStrongVerbs(resumeText);
    const weak = findWeakVerbs(resumeText);
    if (!bullets.length) return { score: 0, strongVerbsFound: strong, weakVerbsFound: weak };

    const strongOpeners = bullets.filter((b) => {
        const firstWord = b.replace(/^[•\-*▪‣◦]\s*/, '').split(/\s+/)[0] ?.toLowerCase().replace(/[^a-z]/g, '');
        return strong.some((v) => v.startsWith(firstWord) || firstWord === v);
    });

    let score = Math.round((strongOpeners.length / bullets.length) * 100);
    score -= weak.length * 12;
    return { score: Math.max(0, Math.min(100, score)), strongVerbsFound: strong, weakVerbsFound: weak };
}

/**
 * Master scoring function. Deterministic — no randomness, no AI.
 */
function calculateATSScore(resumeText, jdText = '') {
    const sections = detectSections(resumeText);
    const keyword = scoreKeywordMatch(resumeText, jdText);
    const jdKeywords = keyword.jdKeywords || { critical: [], secondary: [] };

    const skills = scoreSkillsMatch(resumeText, jdText, jdKeywords);
    const experience = scoreExperience(resumeText, sections, jdKeywords);
    const projects = scoreProjects(resumeText, sections, jdKeywords);
    const education = scoreEducation(sections, resumeText);
    const formatting = scoreFormatting(resumeText);
    const grammar = scoreGrammar(resumeText);
    const actionVerbs = analyzeActionVerbs(resumeText);

    const weightedTotal =
        (keyword.score * WEIGHTS.keywordMatch +
            skills.score * WEIGHTS.skillsMatch +
            experience.score * WEIGHTS.experience +
            projects.score * WEIGHTS.projects +
            education.score * WEIGHTS.education +
            formatting.score * WEIGHTS.formatting +
            grammar.score * WEIGHTS.grammar) /
        100;

    const overallScore = Math.round(weightedTotal);
    const density = keywordDensity(resumeText, [...(skills.matchedSkills || []), ...keyword.matched]);

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
            education: { score: education.score, weight: WEIGHTS.education },
            formatting: { score: formatting.score, weight: WEIGHTS.formatting },
            grammar: { score: grammar.score, weight: WEIGHTS.grammar },
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
            criticalMissing: skills.missingCriticalSkills || [],
        },
        sections,
        formattingIssues: formatting.issues,
        grammarIssues: grammar.issues,
        readabilityScore: grammar.readability,
        repeatedWords: grammar.repeated,
        actionVerbs: { strong: actionVerbs.strongVerbsFound, weak: actionVerbs.weakVerbsFound, score: actionVerbs.score },
        buzzwords: findBuzzwords(resumeText),
        wordCount: formatting.wordCount,
        relevance: { experience: experience.relevance || 0, projects: projects.relevance || 0 },
    };
}

/** Per-section quality rating (green/yellow/red) for the heatmap UI. */
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
        achievements: sections.achievements ? 'green' : 'yellow',
        certifications: sections.certifications ? 'green' : 'yellow',
    };
}

/** Ranked, honest improvement suggestions driven by the actual score breakdown. */
function buildTopImprovements(atsResult) {
    const { breakdown, keywordAnalysis, skillsAnalysis, formattingIssues, actionVerbs, relevance } = atsResult;
    const suggestions = [];

    if (skillsAnalysis.criticalMissing ?.length) {
        suggestions.push({
            impact: 'High',
            area: 'Critical Skills',
            suggestion: `These skills appear to be required by the job description and weren't found in your resume: ${skillsAnalysis.criticalMissing.slice(0, 6).join(', ')}. Only add them if you genuinely have this experience.`,
        });
    }
    if (keywordAnalysis.criticalMissing ?.length) {
        suggestions.push({
            impact: 'High',
            area: 'Critical Keywords',
            suggestion: `Frequently mentioned in the job description but missing from your resume: ${keywordAnalysis.criticalMissing.slice(0, 6).join(', ')}.`,
        });
    }
    if (breakdown.experience.score < 60 && relevance ?.experience < 0.4) {
        suggestions.push({
            impact: 'High',
            area: 'Experience Relevance',
            suggestion: 'Your experience section doesn\'t closely match this job description\'s key terms yet. Emphasize the parts of your real experience that are most related to this specific role.',
        });
    }
    if (breakdown.projects.score < 55 && relevance ?.projects < 0.4) {
        suggestions.push({
            impact: 'High',
            area: 'Project Relevance',
            suggestion: 'Add or highlight a real project that uses technologies/skills mentioned in this job description — relevance to the specific JD is one of the strongest ATS signals.',
        });
    }
    if (actionVerbs ?.score < 60) {
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
    if (keywordAnalysis.missing ?.length && breakdown.keywordMatch.score < 80) {
        const secondaryMissing = keywordAnalysis.missing.filter((k) => !keywordAnalysis.criticalMissing.includes(k));
        if (secondaryMissing.length) {
            suggestions.push({
                impact: 'Low',
                area: 'Additional Keywords',
                suggestion: `Consider naturally incorporating: ${secondaryMissing.slice(0, 5).join(', ')}.`,
            });
        }
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
            suggestion: 'Your resume is well optimized for this job description. Consider tailoring the summary further for each specific role.',
        });
    }

    const order = { High: 0, Medium: 1, Low: 2 };
    return suggestions.sort((a, b) => order[a.impact] - order[b.impact]);
}

/**
 * Self-optimization pass for the Resume Builder: if the JD requires a skill
 * the user genuinely mentioned somewhere in their own submitted profile but
 * it didn't make it into the generated resume text, surface it in the
 * Skills section. Never invents anything — only reconciles what the user
 * already told us against what the resume actually displays.
 */
function reconcileSkillsCoverage(resumeText, profile = {}, jobDescription = '') {
    if (!jobDescription || !jobDescription.trim()) return resumeText;

    const initialScore = calculateATSScore(resumeText, jobDescription);
    const missingCritical = initialScore.keywordAnalysis.criticalMissing || [];
    if (!missingCritical.length) return resumeText;

    const rawCombined = [
        profile.skills, profile.experience, profile.projects,
        profile.achievements, profile.certifications, profile.languages,
    ].filter(Boolean).join(' \n ').toLowerCase();
    const paddedRaw = ` ${rawCombined} `;

    const genuineAdditions = missingCritical.filter((kw) => paddedRaw.includes(` ${kw.toLowerCase()} `));
    if (!genuineAdditions.length) return resumeText;

    const lines = resumeText.split('\n');
    const skillsIdx = lines.findIndex((l) => /^SKILLS\s*$/i.test(l.trim()));
    if (skillsIdx === -1 || skillsIdx + 1 >= lines.length) return resumeText;

    const skillsLineIdx = skillsIdx + 1;
    const existingLine = lines[skillsLineIdx] || '';
    const existingLower = existingLine.toLowerCase();
    const toAdd = genuineAdditions.filter((kw) => !existingLower.includes(kw.toLowerCase()));
    if (!toAdd.length) return resumeText;

    lines[skillsLineIdx] = `${existingLine.replace(/\s*$/, '')}${existingLine.trim() ? ', ' : ''}${toAdd.join(', ')}`;
    return lines.join('\n');
}

module.exports = { calculateATSScore, buildSectionHeatmap, buildTopImprovements, reconcileSkillsCoverage, WEIGHTS };