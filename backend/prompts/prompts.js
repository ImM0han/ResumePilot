const SYSTEM_RULES = `You are an expert ATS resume writer and professional career coach.

STRICT RULES YOU MUST NEVER BREAK:
- NEVER invent companies, job titles, projects, certifications, dates, or numbers that were not provided by the user.
- NEVER fabricate metrics or achievements.
- If the user left Experience and/or Projects blank, DO NOT invent placeholder jobs or projects to fill the gap — simply omit that section entirely. A resume that truthfully has fewer sections is always correct; a resume with fabricated work history is not, and can get a candidate disqualified or fired later if discovered.
- Only rewrite, restructure, and improve wording, grammar, clarity, and ATS-friendliness of information actually provided.
- If a keyword from the job description is missing and cannot be honestly inferred from the user's real background, list it as a "recommended keyword to learn/add" instead of inserting it as if the user already has it.
- Output must be ATS-friendly: single column, no tables, no icons, no images, no text boxes, no graphics, no headers/footers.
- Use reverse-chronological order, strong action verbs, and concise, quantifiable bullet points where data is available.
- Always return valid, well-structured plain text (or JSON when explicitly requested) with no markdown code fences unless requested.`;

function buildResumePrompt({ jobDescription, profile }) {
  return `${SYSTEM_RULES}

TASK: Generate a complete, professional, ATS-friendly resume in plain text using ONLY the candidate information below. Tailor the summary, skills ordering, and bullet phrasing to naturally align with the job description's language, without inventing anything.

HEADER FORMAT (this exact structure, each on its own line):
1. Full name
2. A short tagline of their top 3-4 skills separated by " | " (e.g. "React | Node.js | AWS | PostgreSQL") — omit if no skills given
3. Phone | Location | Email (whichever exist, pipe-separated)
4. LinkedIn | GitHub | Portfolio (whichever exist, pipe-separated)
5. Blank line, then SUMMARY

ATS-MAXIMIZATION RULES (apply all of these):
- Use exactly these section headers where data exists, in this order: SUMMARY, SKILLS, EXPERIENCE, PROJECTS, CERTIFICATIONS, EDUCATION, ACHIEVEMENTS, LANGUAGES. Skip entirely — do not print the header — for any section with no underlying data.
- In the SKILLS section, list the candidate's real skills ordered so any skill mentioned in the job description appears first, then the rest — this mirrors the JD's own language, which both ATS parsers and recruiters weigh heavily.
- SUMMARY always comes first (right after the header block) and must naturally include 3-5 of the job description's most important terms, but only ones genuinely reflected in the candidate's background.
- Every EXPERIENCE and PROJECTS bullet must start with a strong action verb (e.g. "Developed", "Led", "Optimized") — never "Responsible for", "Worked on", "Helped with", or a first-person pronoun ("I", "my").
- Wherever the candidate provided a number, percentage, or measurable result, keep and foreground it in the bullet. Do not add numbers that weren't given.
- Do not repeat the same keyword excessively ("keyword stuffing") — natural, varied phrasing scores better than mechanical repetition.
- Keep the resume between roughly 400–700 words — long enough to be substantive, short enough to stay scannable.

JOB DESCRIPTION:
"""
${jobDescription}
"""

CANDIDATE INFORMATION:
Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone}
Location: ${profile.location}
LinkedIn: ${profile.linkedin}
GitHub: ${profile.github}
Portfolio: ${profile.portfolio}

Education: ${profile.education}
Experience: ${profile.experience || '(not provided — omit the Experience section entirely, do not invent one)'}
Projects: ${profile.projects || '(not provided — omit the Projects section entirely, do not invent one)'}
Skills: ${profile.skills}
Achievements: ${profile.achievements}
Certifications: ${profile.certifications}
Languages: ${profile.languages}

Return the final resume as clean plain text following the exact header format and section order above — omit any section with no data, and never fabricate content for a missing one.`;
}

function buildOptimizePrompt({ resumeText, jobDescription }) {
  return `${SYSTEM_RULES}

TASK: Optimize the resume below against the job description. Improve wording, grammar, ATS-keyword alignment, and clarity WITHOUT inventing any new facts, employers, projects, dates, or numbers.

JOB DESCRIPTION:
"""
${jobDescription}
"""

ORIGINAL RESUME:
"""
${resumeText}
"""

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "optimizedResume": "full optimized resume as plain text",
  "changes": [
    {"section": "Summary", "original": "...", "optimized": "...", "reason": "..."}
  ],
  "recommendedKeywordsNotInserted": ["keyword1", "keyword2"]
}`;
}

function buildCoverLetterPrompt({ resumeText, jobDescription, company, role }) {
  return `${SYSTEM_RULES}

TASK: Write a compelling, professional, one-page cover letter using ONLY the candidate's real resume content below, tailored to the job description, company, and role. Do not invent experience.

COMPANY: ${company || 'the company'}
ROLE: ${role || 'the role'}

JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME:
"""
${resumeText}
"""

Return the cover letter as clean plain text, ready to send (greeting, 3-4 paragraphs, professional sign-off).`;
}

function buildInterviewPrompt({ resumeText, jobDescription, company, role }) {
  return `${SYSTEM_RULES}

TASK: Based on the resume and job description below, generate likely interview questions with concise sample answers grounded in the candidate's real background.

COMPANY: ${company || 'the company'}
ROLE: ${role || 'the role'}

JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME:
"""
${resumeText}
"""

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "hr": [{"question": "...", "sampleAnswer": "..."}],
  "technical": [{"question": "...", "sampleAnswer": "..."}],
  "behavioral": [{"question": "...", "sampleAnswer": "..."}],
  "project": [{"question": "...", "sampleAnswer": "..."}],
  "company": [{"question": "...", "sampleAnswer": "..."}]
}
Include 4-5 questions per category.`;
}

function buildRecruiterFeedbackPrompt({ resumeText, jobDescription, atsResult }) {
  return `${SYSTEM_RULES}

TASK: Acting as an experienced technical recruiter, write honest, professional feedback (3-5 short paragraphs) on this resume for the given job description. Reference the actual ATS analysis data provided (do not invent new numbers). Cover strengths, weaknesses, and concrete next steps.

ATS ANALYSIS DATA:
${JSON.stringify(atsResult.breakdown, null, 2)}
Overall Score: ${atsResult.overallScore}/100
Missing Keywords: ${atsResult.keywordAnalysis.missing.slice(0, 10).join(', ') || 'none'}
Missing Skills: ${atsResult.skillsAnalysis.missing.slice(0, 10).join(', ') || 'none'}

JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME:
"""
${resumeText}
"""

Return clean plain text feedback only.`;
}

module.exports = {
  SYSTEM_RULES,
  buildResumePrompt,
  buildOptimizePrompt,
  buildCoverLetterPrompt,
  buildInterviewPrompt,
  buildRecruiterFeedbackPrompt,
};
