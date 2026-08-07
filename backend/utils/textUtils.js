const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'to', 'of', 'in', 'on', 'at',
  'by', 'with', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this', 'that',
  'these', 'those', 'it', 'its', 'we', 'you', 'your', 'our', 'their', 'they', 'he', 'she', 'his',
  'her', 'i', 'me', 'my', 'will', 'shall', 'can', 'could', 'should', 'would', 'may', 'might',
  'must', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'yes', 'so', 'than', 'also',
  'into', 'about', 'over', 'under', 'up', 'down', 'out', 'off', 'again', 'further', 'once',
  'etc', 'per', 'via', 'within', 'across', 'through', 'including', 'include', 'includes',
]);

const WEAK_VERBS = [
  'worked', 'helped', 'made', 'did', 'responsible for', 'tasked with', 'in charge of',
  'handled', 'dealt with', 'was involved in', 'participated in', 'assisted with',
];

const STRONG_ACTION_VERBS = [
  'developed', 'implemented', 'engineered', 'optimized', 'designed', 'architected', 'led',
  'launched', 'built', 'delivered', 'increased', 'reduced', 'improved', 'streamlined',
  'automated', 'spearheaded', 'orchestrated', 'accelerated', 'transformed', 'pioneered',
  'executed', 'drove', 'scaled', 'migrated', 'deployed', 'mentored', 'negotiated',
  'analyzed', 'established', 'restructured', 'generated', 'achieved', 'exceeded',
];

const BUZZWORDS = [
  'synergy', 'go-getter', 'team player', 'hard worker', 'detail-oriented', 'results-driven',
  'think outside the box', 'self-starter', 'dynamic', 'proactive', 'passionate', 'guru',
  'ninja', 'rockstar', 'thought leader',
];

function normalize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+./#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function countWords(text = '') {
  return (text.trim().match(/\S+/g) || []).length;
}

function countSentences(text = '') {
  return (text.match(/[.!?]+/g) || []).length || 1;
}

// Very lightweight readability approximation (Flesch Reading Ease-ish, no external NLP deps)
function estimateReadability(text = '') {
  const words = countWords(text);
  const sentences = countSentences(text);
  if (words === 0) return 0;

  const syllableCount = (text.match(/[aeiouyAEIOUY]+/g) || []).length;
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = syllableCount / words;

  let score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

function findRepeatedWords(text = '', minCount = 12) {
  const tokens = tokenize(text);
  const freq = {};
  tokens.forEach((t) => {
    if (t.length < 4) return; // ignore tiny words
    freq[t] = (freq[t] || 0) + 1;
  });
  return Object.entries(freq)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function findWeakVerbs(text = '') {
  const lower = text.toLowerCase();
  return WEAK_VERBS.filter((v) => lower.includes(v));
}

function findStrongVerbs(text = '') {
  const lower = text.toLowerCase();
  return STRONG_ACTION_VERBS.filter((v) => lower.includes(v));
}

function findBuzzwords(text = '') {
  const lower = text.toLowerCase();
  return BUZZWORDS.filter((b) => lower.includes(b));
}

// Very simple grammar heuristic checks (no external API needed) - catches common issues
function basicGrammarIssues(text = '') {
  const issues = [];
  const lines = text.split('\n').filter((l) => l.trim());

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Double spaces — but skip header-style lines using "|" as a separator,
    // since "phone |  location |  email" style double-spacing there is
    // harmless formatting, not a writing error.
    if (/ {2,}/.test(trimmed) && !trimmed.includes('|')) {
      issues.push({ line: idx + 1, issue: 'Multiple consecutive spaces found.' });
    }

    // A line starting lowercase is only a real issue if it's actually the
    // start of a new sentence (i.e. the previous line ended with sentence
    // punctuation). Dense paragraph text extracted from a PDF wraps
    // mid-sentence onto new lines constantly ("...Strong understanding\nof
    // the Software Testing...") — that's normal word-wrap, not a mistake.
    if (/^[a-z]/.test(trimmed) && trimmed.length > 40) {
      const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
      const prevEndsSentence = /[.!?]$/.test(prevLine) || prevLine === '';
      if (prevEndsSentence) {
        issues.push({ line: idx + 1, issue: 'Line starts with a lowercase letter.' });
      }
    }

    // Repeated word e.g. "the the"
    const repeatedWordMatch = trimmed.match(/\b(\w+)\s+\1\b/i);
    if (repeatedWordMatch) {
      issues.push({ line: idx + 1, issue: `Repeated word: "${repeatedWordMatch[1]}"` });
    }
  });

  return issues.slice(0, 15);
}

module.exports = {
  STOP_WORDS,
  WEAK_VERBS,
  STRONG_ACTION_VERBS,
  BUZZWORDS,
  normalize,
  tokenize,
  countWords,
  countSentences,
  estimateReadability,
  findRepeatedWords,
  findWeakVerbs,
  findStrongVerbs,
  findBuzzwords,
  basicGrammarIssues,
};