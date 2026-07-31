const OpenAI = require('openai');
const {
  buildResumePrompt,
  buildOptimizePrompt,
  buildCoverLetterPrompt,
  buildInterviewPrompt,
  buildRecruiterFeedbackPrompt,
} = require('../prompts/prompts');
const { extractJDKeywords, analyzeKeywordMatch } = require('../utils/keywordExtractor');
const { findWeakVerbs } = require('../utils/textUtils');

const isAIEnabled = () => Boolean(process.env.OPENAI_API_KEY);

let client = null;
function getClient() {
  if (!client && isAIEnabled()) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

async function chatComplete(prompt, { json = false } = {}) {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });
  return completion.choices[0]?.message?.content || '';
}

function safeJsonParse(str, fallback) {
  try {
    const cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
}

// ---------- FEATURE: Build Resume ----------
async function generateResume({ jobDescription, profile }) {
  if (isAIEnabled()) {
    const prompt = buildResumePrompt({ jobDescription, profile });
    return chatComplete(prompt);
  }
  return fallbackBuildResume({ jobDescription, profile });
}

/** Sorts a user's skill list so JD-relevant skills appear first — mirroring
 * the job description's language improves how both ATS parsers and human
 * reviewers weigh the Skills section, without adding anything untrue. */
function reorderSkillsForJD(skillsList, jobDescription) {
  if (!jobDescription || !jobDescription.trim() || !skillsList.length) return skillsList;
  const jdKeywords = extractJDKeywords(jobDescription);
  const priority = new Map();
  (jdKeywords.critical || []).forEach((k) => priority.set(k.toLowerCase(), 2));
  (jdKeywords.secondary || []).forEach((k) => {
    if (!priority.has(k.toLowerCase())) priority.set(k.toLowerCase(), 1);
  });

  return [...skillsList].sort((a, b) => (priority.get(b.toLowerCase()) || 0) - (priority.get(a.toLowerCase()) || 0));
}

function fallbackBuildResume({ jobDescription, profile }) {
  const jdKeywords = jobDescription ? extractJDKeywords(jobDescription) : { critical: [], secondary: [], all: [] };
  const topJDTerms = [...jdKeywords.critical, ...jdKeywords.secondary].slice(0, 6);
  const rawSkillsList = (profile.skills || '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const skillsList = reorderSkillsForJD(rawSkillsList, jobDescription);

  const lines = [];
  lines.push(profile.name || 'Your Name');

  // Tagline: a short role/top-skills line under the name, mirroring the
  // classic "Role | Skill | Skill | Skill" header style of proven ATS templates.
  const tagline = skillsList.slice(0, 4).join(' | ');
  if (tagline) lines.push(tagline);

  const contactLine = [profile.phone, profile.location, profile.email].filter(Boolean).join(' | ');
  if (contactLine) lines.push(contactLine);

  const linksLine = [profile.linkedin, profile.github, profile.portfolio].filter(Boolean).join(' | ');
  if (linksLine) lines.push(linksLine);

  lines.push('');

  // SUMMARY always leads the resume — this is the section both ATS keyword
  // scanners and human reviewers read first.
  lines.push('SUMMARY');
  const topSkills = skillsList.slice(0, 4).join(', ');
  lines.push(
    `Motivated professional with hands-on experience in ${topSkills || 'relevant technologies'}. ` +
      `${topJDTerms.length ? `Skilled in ${topJDTerms.slice(0, 5).join(', ')}, ` : ''}` +
      `focused on delivering measurable results and driving impact in fast-paced environments.`
  );
  lines.push('');

  if (skillsList.length) {
    lines.push('SKILLS');
    lines.push(skillsList.join(', '));
    lines.push('');
  }

  // Experience and Projects are only ever included if the user actually
  // provided them — never fabricated, even if that means the section is
  // simply omitted. A resume claiming work or projects that didn't happen
  // isn't a shortcut to getting shortlisted, it's misrepresentation.
  if (profile.experience) {
    lines.push('EXPERIENCE');
    lines.push(reformatAsBullets(profile.experience));
    lines.push('');
  }

  if (profile.projects) {
    lines.push('PROJECTS');
    lines.push(reformatAsBullets(profile.projects));
    lines.push('');
  }

  if (profile.certifications) {
    lines.push('CERTIFICATIONS');
    lines.push(profile.certifications);
    lines.push('');
  }

  if (profile.education) {
    lines.push('EDUCATION');
    lines.push(profile.education);
    lines.push('');
  }

  if (profile.achievements) {
    lines.push('ACHIEVEMENTS');
    lines.push(reformatAsBullets(profile.achievements));
    lines.push('');
  }

  if (profile.languages) {
    lines.push('LANGUAGES');
    lines.push(profile.languages);
  }

  return lines.join('\n').trim();
}

function reformatAsBullets(rawText = '') {
  return rawText
    .split(/\n|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('-') || s.startsWith('•') ? s : `• ${s}`))
    .join('\n');
}

// ---------- FEATURE: Optimize Resume ----------
async function optimizeResume({ resumeText, jobDescription }) {
  if (isAIEnabled()) {
    const prompt = buildOptimizePrompt({ resumeText, jobDescription });
    const raw = await chatComplete(prompt, { json: true });
    return safeJsonParse(raw, fallbackOptimizeResume({ resumeText, jobDescription }));
  }
  return fallbackOptimizeResume({ resumeText, jobDescription });
}

function fallbackOptimizeResume({ resumeText, jobDescription }) {
  const weakVerbs = findWeakVerbs(resumeText);
  let optimized = resumeText;
  const changes = [];

  const replacements = {
    worked: 'developed',
    helped: 'supported',
    made: 'created',
    'responsible for': 'led',
  };

  weakVerbs.forEach((weak) => {
    const strong = replacements[weak] || 'delivered';
    const regex = new RegExp(`\\b${weak}\\b`, 'gi');
    if (regex.test(optimized)) {
      optimized = optimized.replace(regex, strong);
      changes.push({
        section: 'General',
        original: weak,
        optimized: strong,
        reason: `Replaced weak phrase "${weak}" with a stronger action verb "${strong}" to improve ATS impact.`,
      });
    }
  });

  const jdKeywords = jobDescription ? extractJDKeywords(jobDescription) : { critical: [], secondary: [], all: [] };
  const analysis = analyzeKeywordMatch(jdKeywords, optimized);

  return {
    optimizedResume: optimized,
    changes,
    recommendedKeywordsNotInserted: analysis.missing.slice(0, 15),
    note: 'Generated using the built-in rule-based optimizer (no OPENAI_API_KEY configured). Add an API key for deeper AI rewriting.',
  };
}

// ---------- FEATURE: Cover Letter ----------
async function generateCoverLetter({ resumeText, jobDescription, company, role }) {
  if (isAIEnabled()) {
    const prompt = buildCoverLetterPrompt({ resumeText, jobDescription, company, role });
    return chatComplete(prompt);
  }
  return fallbackCoverLetter({ resumeText, jobDescription, company, role });
}

function fallbackCoverLetter({ resumeText, company, role }) {
  const firstLine = resumeText.split('\n').find((l) => l.trim()) || 'Candidate';
  return `Dear Hiring Manager,

I am writing to express my interest in the ${role || 'advertised'} position at ${company || 'your company'}. With a strong background reflected in my resume, I am confident I can contribute meaningfully to your team.

Throughout my career, I have developed practical, hands-on experience that aligns closely with what this role requires. I take pride in delivering high-quality work, collaborating effectively with teams, and continuously improving my skills to meet evolving business needs.

I would welcome the opportunity to discuss how my background and skills can add value to ${company || 'your organization'}. Thank you for considering my application.

Sincerely,
${firstLine}

(Note: this cover letter was generated using the built-in rule-based engine. Configure OPENAI_API_KEY for a more tailored, AI-personalized letter.)`;
}

// ---------- FEATURE: Interview Prep ----------
async function generateInterviewQuestions({ resumeText, jobDescription, company, role }) {
  if (isAIEnabled()) {
    const prompt = buildInterviewPrompt({ resumeText, jobDescription, company, role });
    const raw = await chatComplete(prompt, { json: true });
    return safeJsonParse(raw, fallbackInterviewQuestions());
  }
  return fallbackInterviewQuestions({ company, role });
}

function fallbackInterviewQuestions({ company, role } = {}) {
  return {
    hr: [
      { question: 'Tell me about yourself.', sampleAnswer: 'Summarize your background, key skills, and what draws you to this role, keeping it concise and relevant.' },
      { question: 'Why do you want to work here?', sampleAnswer: `Connect your goals with ${company || 'the company'}'s mission and the impact of the ${role || 'role'}.` },
      { question: 'What are your strengths and weaknesses?', sampleAnswer: 'Choose a genuine strength relevant to the role, and a weakness paired with how you are actively improving it.' },
      { question: 'Where do you see yourself in 5 years?', sampleAnswer: 'Describe realistic growth aligned with the career path this role offers.' },
    ],
    technical: [
      { question: 'Walk me through a technical project from your resume.', sampleAnswer: 'Describe the problem, your specific contribution, tools used, and the outcome.' },
      { question: 'How do you approach debugging a complex issue?', sampleAnswer: 'Explain a structured approach: reproduce, isolate, hypothesize, test, and verify the fix.' },
      { question: 'How do you keep your technical skills up to date?', sampleAnswer: 'Mention specific resources, courses, or projects you use to stay current.' },
    ],
    behavioral: [
      { question: 'Describe a time you faced conflict on a team.', sampleAnswer: 'Use the STAR method: Situation, Task, Action, Result.' },
      { question: 'Tell me about a time you missed a deadline.', sampleAnswer: 'Focus on accountability and the process improvement that followed.' },
    ],
    project: [
      { question: 'What was the most challenging project you worked on?', sampleAnswer: 'Highlight the technical or organizational challenge and how you solved it.' },
    ],
    company: [
      { question: `What do you know about ${company || 'our company'}?`, sampleAnswer: `Research recent news, products, and values of ${company || 'the company'} before the interview.` },
    ],
    note: 'Generated using the built-in rule-based engine. Configure OPENAI_API_KEY for questions tailored specifically to your resume and this JD.',
  };
}

// ---------- FEATURE: Recruiter Feedback ----------
async function generateRecruiterFeedback({ resumeText, jobDescription, atsResult }) {
  if (isAIEnabled()) {
    const prompt = buildRecruiterFeedbackPrompt({ resumeText, jobDescription, atsResult });
    return chatComplete(prompt);
  }
  return fallbackRecruiterFeedback(atsResult);
}

function fallbackRecruiterFeedback(atsResult) {
  const { overallScore, quality, keywordAnalysis, skillsAnalysis, breakdown } = atsResult;
  const strengths = [];
  const weaknesses = [];

  if (breakdown.keywordMatch.score >= 70) strengths.push('strong alignment with job description keywords');
  else weaknesses.push('limited alignment with job description keywords');

  if (breakdown.experience.score >= 70) strengths.push('well-structured, quantified experience section');
  else weaknesses.push('experience section could use more measurable outcomes');

  if (breakdown.formatting.score >= 80) strengths.push('clean, ATS-friendly formatting');
  else weaknesses.push('formatting issues that may affect ATS parsing');

  return `Overall, this resume scores ${overallScore}/100 (${quality}) against the target role.

Strengths: ${strengths.join('; ') || 'a reasonably solid overall structure'}.

Areas to improve: ${weaknesses.join('; ') || 'minor refinements to wording and keyword coverage'}.

${keywordAnalysis.missing.length ? `Consider addressing these missing keywords where genuinely applicable: ${keywordAnalysis.missing.slice(0, 8).join(', ')}.` : ''}
${skillsAnalysis.missing.length ? `Missing skills relative to the JD: ${skillsAnalysis.missing.slice(0, 8).join(', ')}.` : ''}

(This feedback was generated using the built-in rule-based engine. Configure OPENAI_API_KEY for deeper, more nuanced recruiter-style feedback.)`;
}

module.exports = {
  isAIEnabled,
  generateResume,
  optimizeResume,
  generateCoverLetter,
  generateInterviewQuestions,
  generateRecruiterFeedback,
};
