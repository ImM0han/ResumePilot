const { normalize, tokenize } = require('./textUtils');

// Curated dictionary of known technical & soft skill terms.
// This lets us extract meaningful keywords deterministically (no AI required),
// while multi-word terms are matched as phrases.
const KNOWN_SKILLS = [
  // Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'php',
  'ruby', 'kotlin', 'swift', 'scala', 'r', 'matlab', 'sql', 'html', 'css', 'bash', 'shell',
  // Frontend
  'react', 'react.js', 'redux', 'vue', 'vue.js', 'angular', 'next.js', 'nextjs', 'nuxt',
  'svelte', 'tailwind', 'tailwind css', 'bootstrap', 'sass', 'webpack', 'vite', 'framer motion',
  // Backend
  'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring',
  'spring boot', '.net', 'asp.net', 'laravel', 'ruby on rails', 'graphql', 'rest api', 'grpc',
  // Databases
  'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'dynamodb',
  'firebase', 'cassandra', 'oracle', 'mariadb', 'supabase',
  // Cloud / DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'jenkins',
  'ci/cd', 'github actions', 'gitlab ci', 'ansible', 'nginx', 'linux', 'cloudformation',
  // Data / AI
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
  'pandas', 'numpy', 'nlp', 'computer vision', 'data science', 'data analysis', 'openai',
  'llm', 'generative ai', 'artificial intelligence', 'power bi', 'tableau', 'excel',
  // Tools
  'git', 'github', 'jira', 'confluence', 'figma', 'postman', 'slack', 'notion', 'agile',
  'scrum', 'kanban', 'microservices', 'api development', 'unit testing', 'jest', 'cypress',
  'selenium', 'ci', 'cd',
  // Soft skills
  'communication', 'leadership', 'teamwork', 'problem solving', 'problem-solving',
  'collaboration', 'time management', 'critical thinking', 'adaptability', 'creativity',
  'project management', 'stakeholder management', 'mentoring', 'analytical skills',
  'attention to detail', 'decision making', 'conflict resolution', 'presentation skills',
];

// Sort longest-first so multi-word phrases are matched before their sub-words
const SORTED_SKILLS = [...KNOWN_SKILLS].sort((a, b) => b.length - a.length);

// Generic words that show up constantly in job descriptions but carry no real
// ATS keyword signal on their own. These are excluded from frequency-based
// keyword extraction so the "missing keyword" list stays meaningful instead
// of being padded with filler that makes the score look artificially high.
const JD_BOILERPLATE = new Set([
  'experience', 'experienced', 'role', 'roles', 'team', 'teams', 'work', 'working', 'worked',
  'years', 'year', 'ability', 'able', 'strong', 'knowledge', 'including', 'environment',
  'company', 'job', 'position', 'candidate', 'candidates', 'looking', 'skills', 'skill',
  'required', 'requirements', 'requirement', 'preferred', 'responsibilities', 'responsible',
  'qualifications', 'qualification', 'plus', 'good', 'excellent', 'strongly', 'must', 'ideal',
  'related', 'across', 'various', 'multiple', 'new', 'high', 'level', 'levels', 'day', 'days',
  'help', 'helping', 'support', 'supporting', 'business', 'businesses', 'client', 'clients',
  'someone', 'people', 'person', 'individual', 'opportunity', 'opportunities', 'growing',
  'growth', 'fast', 'paced', 'passion', 'passionate', 'benefits', 'salary', 'location',
  'employment', 'apply', 'application', 'join', 'joining', 'love', 'like', 'want', 'wanted',
]);

function standardizeText(text = '') {
  let norm = ` ${normalize(text)} `;
  const replacements = [
    [/ front[- ]end /g, ' frontend '],
    [/ back[- ]end /g, ' backend '],
    [/ full[- ]stack /g, ' fullstack '],
    [/ ci[-/ ]cd /g, ' cicd '],
    [/ react\.?js /g, ' react '],
    [/ node\.?js /g, ' node '],
    [/ express\.?js /g, ' express '],
    [/ next\.?js /g, ' next '],
    [/ vue\.?js /g, ' vue '],
    [/ github actions /g, ' githubactions '],
    [/ google cloud( platform)? /g, ' gcp '],
    [/ amazon web services /g, ' aws '],
    [/ artificial intelligence /g, ' ai '],
    [/ machine learning /g, ' ml '],
    [/ deep learning /g, ' dl '],
    [/ natural language processing /g, ' nlp '],
    [/ quality assurance /g, ' qa '],
    [/ postgres(ql)? /g, ' postgresql '],
  ];
  replacements.forEach(([regex, repl]) => {
    norm = norm.replace(regex, repl);
  });
  return norm;
}

function extractKnownSkills(text = '') {
  const normalized = standardizeText(text);
  const found = new Set();

  SORTED_SKILLS.forEach((skill) => {
    const stdSkill = standardizeText(skill).trim();
    const pattern = ` ${stdSkill} `;
    if (normalized.includes(pattern)) {
      found.add(skill);
    }
  });

  return Array.from(found);
}

/** Counts how many times each curated skill appears (repetition = importance signal). */
function countSkillOccurrences(text = '') {
  const normalized = standardizeText(text);
  const counts = {};
  SORTED_SKILLS.forEach((skill) => {
    const stdSkill = standardizeText(skill).trim();
    const escaped = stdSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(` ${escaped} `, 'g');
    const matches = normalized.match(regex);
    if (matches) counts[skill] = matches.length;
  });
  return counts;
}

// Extract "significant" keywords beyond the curated list using frequency,
// filtered against the expanded boilerplate list so noise doesn't inflate scores.
function extractFrequentKeywords(text = '', limit = 20) {
  const tokens = tokenize(text);
  const freq = {};
  tokens.forEach((t) => {
    if (t.length < 4) return;
    if (/^\d+$/.test(t)) return; // skip pure numbers
    if (JD_BOILERPLATE.has(t)) return;
    freq[t] = (freq[t] || 0) + 1;
  });

  return Object.entries(freq)
    .filter(([, count]) => count >= 2) // require repetition to count as a real signal
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

// Extract repeated multi-word phrases (bigrams/trigrams) to match cohesive terms
function extractFrequentPhrases(text = '', limit = 15) {
  const tokens = tokenize(text);
  const phrases = {};

  // Bigrams (2-word phrases)
  for (let i = 0; i < tokens.length - 1; i++) {
    const w1 = tokens[i];
    const w2 = tokens[i + 1];
    if (JD_BOILERPLATE.has(w1) || JD_BOILERPLATE.has(w2)) continue;
    if (w1.length < 3 || w2.length < 3) continue;
    const bigram = `${w1} ${w2}`;
    phrases[bigram] = (phrases[bigram] || 0) + 1;
  }

  // Trigrams (3-word phrases)
  for (let i = 0; i < tokens.length - 2; i++) {
    const w1 = tokens[i];
    const w2 = tokens[i + 1];
    const w3 = tokens[i + 2];
    if (JD_BOILERPLATE.has(w1) || JD_BOILERPLATE.has(w3)) continue;
    if (w1.length < 3 || w3.length < 3) continue;
    const trigram = `${w1} ${w2} ${w3}`;
    phrases[trigram] = (phrases[trigram] || 0) + 1;
  }

  return Object.entries(phrases)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase]) => phrase);
}

/**
 * Attempts to locate a "nice to have / preferred / bonus" section within the
 * JD text. Skills mentioned ONLY there are downgraded to secondary — anything
 * else is treated as critical by default, since most real job descriptions
 * list their actual requirements as plain bullets without ever using the
 * literal word "Requirements:".
 */
function extractPreferredSection(jdText = '') {
  const headerRegex = /(nice[-\s]?to[-\s]?have|preferred(?! qualifications)|bonus|good[-\s]?to[-\s]?have|a plus|strongly preferred|is a plus)\s*:?/i;
  const stopRegex = /(requirements?|must[-\s]?have|responsibilit|about (the )?company|benefits|perks|what we offer|compensation|salary|minimum qualifications?)\s*:?/i;

  const lines = jdText.split('\n');
  let capturing = false;
  const captured = [];

  for (const line of lines) {
    if (!capturing) {
      const match = line.match(headerRegex);
      if (match) {
        capturing = true;
        // Common JD style: "Nice to have: GraphQL, TypeScript, Terraform." —
        // header and content share one line, so capture what follows the colon too.
        const afterHeader = line.slice(match.index + match[0].length);
        if (afterHeader.trim()) captured.push(afterHeader);
      }
      continue;
    }
    if (stopRegex.test(line)) {
      capturing = false;
      continue;
    }
    captured.push(line);
  }

  return captured.join('\n');
}

/**
 * Builds a weighted keyword profile from a job description:
 * - `critical`  — every recognized skill/keyword, UNLESS it only appears inside
 *                 an explicit "nice to have / preferred / bonus" section
 * - `secondary` — nice-to-have-only skills, plus generic frequent terms
 * Critical keywords count double toward the match score, since missing a
 * genuine requirement is a much bigger ATS/recruiter red flag than missing
 * something explicitly framed as optional.
 */
function extractJDKeywords(jdText = '') {
  if (!jdText || !jdText.trim()) {
    return { critical: [], secondary: [], all: [] };
  }

  const allSkills = extractKnownSkills(jdText);
  const totalOccurrences = countSkillOccurrences(jdText);
  const preferredText = extractPreferredSection(jdText);
  const preferredOccurrences = countSkillOccurrences(preferredText);

  const critical = new Set();
  const secondary = new Set();

  allSkills.forEach((skill) => {
    const total = totalOccurrences[skill] || 0;
    const withinPreferred = preferredOccurrences[skill] || 0;
    // If the skill is mentioned anywhere OUTSIDE the nice-to-have section,
    // it's a genuine requirement. Only downgrade it when every mention of
    // it lives inside the nice-to-have block.
    if (withinPreferred > 0 && withinPreferred >= total) {
      secondary.add(skill);
    } else {
      critical.add(skill);
    }
  });

  // Frequency-derived generic keywords are treated as secondary signals only —
  // they're a useful hint but too noisy to be scored as "must-have".
  extractFrequentKeywords(jdText, 15).forEach(({ word }) => {
    if (!critical.has(word) && !secondary.has(word)) secondary.add(word);
  });

  // Extract frequent phrases (N-grams) and add them as secondary signals
  extractFrequentPhrases(jdText, 15).forEach((phrase) => {
    let alreadyCovered = false;
    critical.forEach((c) => { if (c.toLowerCase().includes(phrase) || phrase.includes(c.toLowerCase())) alreadyCovered = true; });
    secondary.forEach((s) => { if (s.toLowerCase().includes(phrase) || phrase.includes(s.toLowerCase())) alreadyCovered = true; });

    if (!alreadyCovered) {
      secondary.add(phrase);
    }
  });

  return {
    critical: Array.from(critical),
    secondary: Array.from(secondary),
    all: Array.from(new Set([...critical, ...secondary])),
  };
}

/**
 * Compares a weighted JD keyword profile against resume text.
 * Returns matched/missing for both tiers plus a 0-100 score where critical
 * keywords are weighted twice as heavily as secondary ones.
 */
function analyzeKeywordMatch(jdKeywords, resumeText = '') {
  const normalizedResume = standardizeText(resumeText);

  const isPresent = (kw) => {
    const stdKw = standardizeText(kw).trim();
    const escaped = stdKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(` ${escaped} `).test(normalizedResume);
  };

  const critical = jdKeywords.critical || [];
  const secondary = jdKeywords.secondary || [];

  const matchedCritical = critical.filter(isPresent);
  const missingCritical = critical.filter((k) => !isPresent(k));
  const matchedSecondary = secondary.filter(isPresent);
  const missingSecondary = secondary.filter((k) => !isPresent(k));

  const criticalWeight = 2;
  const secondaryWeight = 1;
  const totalWeight = critical.length * criticalWeight + secondary.length * secondaryWeight;
  const earnedWeight = matchedCritical.length * criticalWeight + matchedSecondary.length * secondaryWeight;

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 60; // neutral baseline if no JD signal at all

  return {
    score,
    matchedCritical,
    missingCritical,
    matchedSecondary,
    missingSecondary,
    matched: [...matchedCritical, ...matchedSecondary],
    missing: [...missingCritical, ...missingSecondary],
    totalKeywords: critical.length + secondary.length,
  };
}

function keywordDensity(text = '', keywords = []) {
  const totalWords = tokenize(text).length || 1;
  const normalizedText = standardizeText(text);
  let keywordHits = 0;

  keywords.forEach((kw) => {
    const stdKw = standardizeText(kw).trim();
    const escaped = stdKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(` ${escaped} `, 'g');
    const matches = normalizedText.match(regex);
    if (matches) keywordHits += matches.length;
  });

  return Math.round((keywordHits / totalWords) * 1000) / 10; // percentage w/ 1 decimal
}

module.exports = {
  KNOWN_SKILLS,
  JD_BOILERPLATE,
  extractKnownSkills,
  countSkillOccurrences,
  extractFrequentKeywords,
  extractFrequentPhrases,
  standardizeText,
  extractPreferredSection,
  extractJDKeywords,
  analyzeKeywordMatch,
  keywordDensity,
};
