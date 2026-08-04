const { detectSections } = require('./resumeParser');

const {
    extractJDKeywords,
    extractKnownSkills,
    analyzeKeywordMatch,
    keywordDensity,
} = require('../utils/keywordExtractor')

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
 * ResumePilot ATS Engine v2
 * ============================================================
 *
 * The score is deterministic.
 *
 * Same resume + same JD = same score.
 *
 * AI is NOT used to calculate the score.
 *
 * ============================================================
 */

const WEIGHTS = {
    keywordMatch: 20,
    skillsMatch: 30,
    experience: 15,
    responsibilities: 10,
    jobTitle: 5,
    sections: 5,
    parseability: 10,
    quality: 5,
};
/*
 * Safe percentage helper.
 */
function pct(part, whole) {
    if (!whole) return 0;

    return Math.max(
        0,
        Math.min(
            100,
            Math.round((part / whole) * 100)
        )
    );
}

/*
 * Resume bullet extraction.
 */
function getBullets(resumeText = '') {
    const lines = String(resumeText)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const explicitBullets = lines.filter((line) =>
        /^[•\-*▪‣◦]\s*/.test(line)
    );

    if (explicitBullets.length >= 2) {
        return explicitBullets;
    }

    return lines.filter((line) => {
        if (line.length < 25 || line.length > 250) {
            return false;
        }

        if (
            /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(line)
        ) {
            return false;
        }

        if ((line.match(/\|/g) || []).length >= 2) {
            return false;
        }

        if (/^[A-Z\s&/-]{4,}$/.test(line)) {
            return false;
        }

        return true;
    });
}

/*
 * ============================================================
 * 1. KEYWORD MATCH
 * ============================================================
 */

function scoreKeywordMatch(resumeText, jdText) {
    if (!jdText || !jdText.trim()) {
        return {
            score: 0,
            matched: [],
            missing: [],
            matchedCritical: [],
            missingCritical: [],
            matchedSecondary: [],
            missingSecondary: [],
            totalKeywords: 0,
            jdKeywordCount: 0,
        };
    }

    const jdKeywords =
        extractJDKeywords(jdText);

    const analysis =
        analyzeKeywordMatch(
            jdKeywords,
            resumeText
        );

    return {
        ...analysis,
        jdKeywordCount: analysis.totalKeywords || 0,
    };
}

/*
 * ============================================================
 * 2. SKILL MATCH
 * ============================================================
 */

function scoreSkillsMatch(resumeText, jdText) {
    const resumeSkills =
        extractKnownSkills(resumeText);

    if (!jdText || !jdText.trim()) {
        return {
            score: 0,
            matchedSkills: [],
            missingSkills: [],
            resumeSkills,
        };
    }

    const jdSkills =
        extractKnownSkills(jdText);

    if (!jdSkills.length) {
        return {
            score: 0,
            matchedSkills: [],
            missingSkills: [],
            resumeSkills,
        };
    }

    const resumeSet = new Set(
        resumeSkills.map((x) =>
            x.toLowerCase()
        )
    );

    const matchedSkills =
        jdSkills.filter((skill) =>
            resumeSet.has(
                skill.toLowerCase()
            )
        );

    const missingSkills =
        jdSkills.filter(
            (skill) =>
            !resumeSet.has(
                skill.toLowerCase()
            )
        );

    return {
        score: pct(
            matchedSkills.length,
            jdSkills.length
        ),

        matchedSkills,
        missingSkills,
        resumeSkills,
    };
}

/*
 * ============================================================
 * 3. EXPERIENCE QUALITY
 * ============================================================
 */

function scoreExperience(
    resumeText,
    sections
) {
    if (!sections.experience) {
        return {
            score: 0,
            hasBullets: false,
            quantifiedRatio: 0,
            hasDateRanges: false,
        };
    }

    const bullets =
        getBullets(resumeText);

    let score = 45;

    if (bullets.length >= 2) {
        score += 15;
    }

    const quantified =
        bullets.filter((bullet) =>
            /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/
            .test(bullet)
        );

    const quantifiedRatio =
        bullets.length ?
        quantified.length / bullets.length :
        0;

    score += Math.round(
        quantifiedRatio * 20
    );

    const hasDateRanges =
        /\b(19|20)\d{2}\s*(-|–|to)\s*(present|current|(19|20)\d{2})/i
        .test(resumeText);

    if (hasDateRanges) {
        score += 15;
    }

    if (bullets.length < 2) {
        score -= 15;
    }

    return {
        score: Math.max(
            0,
            Math.min(100, score)
        ),

        hasBullets: bullets.length >= 2,

        quantifiedRatio,
        hasDateRanges,
    };
}

/*
 * ============================================================
 * 4. RESPONSIBILITY MATCH
 * ============================================================
 *
 * We use deterministic phrase overlap.
 *
 * This is NOT pretending to be an LLM semantic model.
 * It provides a stable signal for responsibilities.
 */

function tokenizeForMatch(text = '') {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9+#.\-/ ]/g, ' ')
        .split(/\s+/)
        .filter(
            (word) =>
            word.length >= 4
        );
}

function extractResponsibilityTerms(jdText = '') {
    const stopWords = new Set([
        'about',
        'this',
        'that',
        'with',
        'from',
        'will',
        'your',
        'their',
        'they',
        'have',
        'been',
        'being',
        'into',
        'using',
        'used',
        'work',
        'working',
        'team',
        'teams',
        'role',
        'roles',
        'must',
        'should',
        'would',
        'could',
        'able',
        'looking',
        'candidate',
        'candidates',
        'experience',
        'responsibilities',
        'requirements',
        'requirement',
        'need',
        'needs',
        'developer',
        'developer',
        'engineer',
        'intern',
        'analyst',
        'scientist',
        'manager',
        'with',
        'and',
        'the',
        'for',
        'you',
        'are',
        'our',
        'who',
        'can',
        'to',
        'of',
        'in',
        'on',
        'a',
        'an',
    ]);

    const words = tokenizeForMatch(jdText);

    const counts = {};

    words.forEach((word) => {
        if (stopWords.has(word)) {
            return;
        }

        /*
         * Skip known technical skills.
         * Skills are handled by scoreSkillsMatch().
         */
        const knownSkill =
            extractKnownSkills(word).length > 0;

        if (knownSkill) {
            return;
        }

        counts[word] =
            (counts[word] || 0) + 1;
    });

    return Object.entries(counts)
        .filter(([, count]) => count >= 1)
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, 20)
        .map(([word]) => word);
}

function scoreResponsibilities(
    resumeText,
    jdText
) {
    if (!jdText || !jdText.trim()) {
        return {
            score: 0,
            matched: [],
            missing: [],
        };
    }

    const terms =
        extractResponsibilityTerms(
            jdText
        );

    if (!terms.length) {
        return {
            score: 0,
            matched: [],
            missing: [],
        };
    }

    const resume =
        String(resumeText)
        .toLowerCase();

    const matched =
        terms.filter((term) =>
            resume.includes(term)
        );

    const missing =
        terms.filter(
            (term) =>
            !resume.includes(term)
        );

    return {
        score: pct(
            matched.length,
            terms.length
        ),

        matched,
        missing,
    };
}

/*
 * ============================================================
 * 5. JOB TITLE MATCH
 * ============================================================
 */

function extractJobTitle(jdText = '') {
    const lines =
        String(jdText)
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);

    const titlePatterns = [
        /^(?:job\s*)?title\s*:\s*(.+)$/i,
        /^position\s*:\s*(.+)$/i,
        /^role\s*:\s*(.+)$/i,
    ];

    for (const line of lines) {
        for (const pattern of titlePatterns) {
            const match =
                line.match(pattern);

            if (match) {
                return match[1].trim();
            }
        }
    }

    /*
     * If no explicit title exists, inspect
     * the first few lines for common title forms.
     */
    const titleLine =
        lines
        .slice(0, 8)
        .find((line) =>
            /(intern|engineer|developer|analyst|scientist|manager|designer|consultant|specialist)/i
            .test(line)
        );

    return titleLine || '';
}

function scoreJobTitle(
    resumeText,
    jdText
) {
    const jdTitle =
        extractJobTitle(jdText);

    if (!jdTitle) {
        return {
            score: 50,
            title: '',
            matchedTerms: [],
            missingTerms: [],
        };
    }

    const titleWords =
        tokenizeForMatch(jdTitle)
        .filter(
            (word) =>
            ![
                'intern',
                'junior',
                'senior',
                'lead',
                'associate',
                'the',
                'and',
            ].includes(word)
        );

    if (!titleWords.length) {
        return {
            score: 50,
            title: jdTitle,
            matchedTerms: [],
            missingTerms: [],
        };
    }

    const resume =
        String(resumeText)
        .toLowerCase();

    const matched =
        titleWords.filter((word) =>
            resume.includes(word)
        );

    const missing =
        titleWords.filter(
            (word) =>
            !resume.includes(word)
        );

    return {
        score: pct(
            matched.length,
            titleWords.length
        ),

        title: jdTitle,
        matchedTerms: matched,
        missingTerms: missing,
    };
}

/*
 * ============================================================
 * 6. SECTION COMPLETENESS
 * ============================================================
 */

function scoreSections(
    sections,
    resumeText
) {
    const important = [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
    ];

    const present =
        important.filter(
            (section) =>
            sections[section]
        );

    let score =
        pct(
            present.length,
            important.length
        );

    /*
     * Contact information is important
     * for parseability.
     */
    const hasEmail =
        /[\w.+-]+@[\w-]+\.[a-z]{2,}/i
        .test(resumeText);

    const hasPhone =
        /(\+?\d[\d\s().-]{7,}\d)/
        .test(resumeText);

    if (hasEmail) score += 5;
    if (hasPhone) score += 5;

    return {
        score: Math.min(
            100,
            score
        ),

        present,
        missing: important.filter(
            (section) =>
            !sections[section]
        ),

        hasEmail,
        hasPhone,
    };
}

/*
 * ============================================================
 * 7. ATS PARSEABILITY
 * ============================================================
 */

function scoreParseability(
    resumeText
) {
    const issues = [];
    let score = 100;

    const text =
        String(resumeText || '');

    if (!text.trim()) {
        return {
            score: 0,
            issues: ['No readable resume text detected.'],
        };
    }

    const wordCount =
        countWords(text);

    if (wordCount < 180) {
        score -= 15;

        issues.push(
            'Very little text was extracted from the resume.'
        );
    }

    /*
     * Possible table/grid extraction.
     */
    const pipeLines =
        text
        .split('\n')
        .filter(
            (line) =>
            (line.match(/\|/g) || [])
            .length >= 2
        ).length;

    if (pipeLines >= 3) {
        score -= 20;

        issues.push(
            'Possible table/grid structure detected.'
        );
    }

    /*
     * Excessive special characters can indicate
     * broken PDF extraction.
     */
    const specialCharacters =
        (text.match(
            /[�□]/g
        ) || []).length;

    if (specialCharacters >= 3) {
        score -= 30;

        issues.push(
            'Possible broken or unreadable characters detected.'
        );
    }

    /*
     * Very long lines can indicate poor extraction.
     */
    const longLines =
        text
        .split('\n')
        .filter(
            (line) =>
            line.length > 400
        ).length;

    if (longLines > 2) {
        score -= 10;

        issues.push(
            'Very long extracted lines detected.'
        );
    }

    return {
        score: Math.max(
            0,
            Math.min(100, score)
        ),

        issues,
    };
}

/*
 * ============================================================
 * 8. RESUME QUALITY
 * ============================================================
 *
 * This is deliberately only 5% of the ATS score.
 *
 * Grammar, verbs and readability should NOT dominate
 * a JD-specific ATS score.
 */

function scoreQuality(resumeText) {
    const issues =
        basicGrammarIssues(
            resumeText
        );

    const readability =
        estimateReadability(
            resumeText
        );

    const repeated =
        findRepeatedWords(
            resumeText
        );

    const buzzwords =
        findBuzzwords(
            resumeText
        );

    const bullets =
        getBullets(resumeText);

    let score = 70;

    if (bullets.length >= 5) {
        score += 10;
    } else if (bullets.length < 3) {
        score -= 10;
    }

    if (readability >= 50) {
        score += 10;
    } else if (readability < 30) {
        score -= 15;
    }

    score -= Math.min(
        15,
        issues.length * 3
    );

    score -= Math.min(
        10,
        repeated.length * 2
    );

    score -= Math.min(
        5,
        buzzwords.length
    );

    return {
        score: Math.max(
            0,
            Math.min(100, score)
        ),

        issues,
        readability,
        repeated,
        buzzwords,
    };
}

/*
 * ============================================================
 * 9. PROJECTS
 * ============================================================
 *
 * Projects are useful, but only when relevant to the JD.
 */

function scoreProjects(
    resumeText,
    sections
) {
    if (!sections.projects) {
        return {
            score: 0,
        };
    }

    const bullets =
        getBullets(resumeText);

    let score = 60;

    if (bullets.length >= 2) {
        score += 15;
    }

    const hasTechStack =
        /(tech stack|technologies used|built with|stack:|tools used)/i
        .test(resumeText);

    if (hasTechStack) {
        score += 10;
    }

    const quantified =
        bullets.filter((bullet) =>
            /\d+%|\$\d+|\b\d+(\.\d+)?[kKmM]?\+?\b/
            .test(bullet)
        );

    if (bullets.length) {
        score += Math.round(
            (quantified.length /
                bullets.length) *
            15
        );
    }

    return {
        score: Math.min(
            100,
            score
        ),
    };
}

/*
 * ============================================================
 * 10. GRAMMAR / VERBS
 * ============================================================
 */

function scoreGrammar(resumeText) {
    const issues =
        basicGrammarIssues(
            resumeText
        );

    const readability =
        estimateReadability(
            resumeText
        );

    const repeated =
        findRepeatedWords(
            resumeText
        );

    const buzzwords =
        findBuzzwords(
            resumeText
        );

    let score = 100;

    score -= Math.min(
        45,
        issues.length * 7
    );

    score -= Math.min(
        25,
        repeated.length * 4
    );

    score -= Math.min(
        15,
        buzzwords.length * 5
    );

    if (readability < 30) {
        score -= 15;
    } else if (readability < 45) {
        score -= 8;
    }

    return {
        score: Math.max(
            0,
            Math.min(100, score)
        ),

        issues,
        readability,
        repeated,
    };
}

function scoreActionVerbs(
    resumeText
) {
    const bullets =
        getBullets(resumeText);

    const strong =
        findStrongVerbs(
            resumeText
        );

    const weak = findWeakVerbs(resumeText);

    if (!bullets.length) {
        return {
            score: 0,
            strongVerbsFound: strong,
            weakVerbsFound: weak,
        };
    }

    const strongOpeners = bullets.filter((bullet) => {
        const firstWord = bullet
            .replace(/^[•\-*▪‣◦]\s*/, '')
            .split(/\s+/)[0]
            .toLowerCase()
            .replace(/[^a-z]/g, '');

        if (!firstWord) {
            return false;
        }

        return strong.some(
            (verb) =>
            verb.startsWith(firstWord) ||
            firstWord === verb
        );
    });
    let score =
        Math.round(
            (strongOpeners.length /
                bullets.length) *
            100
        );

    score -=
        Math.min(
            30,
            weak.length * 5
        );

    return {
        score: Math.max(
            0,
            Math.min(100, score)
        ),

        strongVerbsFound: strong,
        weakVerbsFound: weak,
    };
}

/*
 * ============================================================
 * 11. MASTER ATS SCORE
 * ============================================================
 */

function calculateATSScore(
    resumeText = '',
    jdText = ''
) {
    const resume =
        String(resumeText || '').trim();

    const jd =
        String(jdText || '').trim();

    const sections =
        detectSections(resume);

    /*
     * No JD = no true ATS match score.
     *
     * We still return a deterministic resume quality score,
     * but we do NOT pretend it is a JD match.
     */
    if (!jd) {
        const parseability =
            scoreParseability(resume);

        const quality =
            scoreQuality(resume);

        const grammar =
            scoreGrammar(resume);

        const formatting =
            scoreParseability;

        const resumeQuality =
            Math.round(
                quality.score * 0.6 +
                parseability.score * 0.4
            );

        return {
            overallScore: null,

            atsScore: null,

            resumeQualityScore: resumeQuality,

            quality: resumeQuality >= 85 ?
                'Excellent' : resumeQuality >= 70 ?
                'Good' : resumeQuality >= 50 ?
                'Fair' : 'Needs Work',

            confidence: 0,

            scoreType: 'RESUME_QUALITY_ONLY',

            message: 'Add a job description to calculate a job-specific ATS match score.',

            interviewChance: null,

            breakdown: {
                keywordMatch: {
                    score: 0,
                    weight: WEIGHTS.keywordMatch,
                },

                skillsMatch: {
                    score: 0,
                    weight: WEIGHTS.skillsMatch,
                },

                experience: {
                    score: scoreExperience(
                        resume,
                        sections
                    ).score,
                    weight: WEIGHTS.experience,
                },

                responsibilities: {
                    score: 0,
                    weight: WEIGHTS.responsibilities,
                },

                jobTitle: {
                    score: 0,
                    weight: WEIGHTS.jobTitle,
                },

                sections: {
                    score: scoreSections(
                        sections,
                        resume
                    ).score,
                    weight: WEIGHTS.sections,
                },

                parseability: {
                    score: parseability.score,
                    weight: WEIGHTS.parseability,
                },

                quality: {
                    score: quality.score,
                    weight: WEIGHTS.quality,
                },
            },

            keywordAnalysis: {
                matched: [],
                missing: [],
                criticalMissing: [],
                criticalMatched: [],
                density: 0,
                totalJDKeywords: 0,
            },

            skillsAnalysis: {
                matched: [],
                missing: [],
            },

            sections,

            formattingIssues: parseability.issues,

            grammarIssues: grammar.issues,

            readabilityScore: grammar.readability,

            repeatedWords: grammar.repeated,

            actionVerbs: scoreActionVerbs(resume),

            buzzwords: quality.buzzwords,

            wordCount: countWords(resume),
        };
    }

    /*
     * Calculate all deterministic components.
     */
    const keyword =
        scoreKeywordMatch(
            resume,
            jd
        );

    const skills =
        scoreSkillsMatch(
            resume,
            jd
        );

    const experience =
        scoreExperience(
            resume,
            sections
        );

    const responsibilities =
        scoreResponsibilities(
            resume,
            jd
        );

    const jobTitle =
        scoreJobTitle(
            resume,
            jd
        );

    const sectionScore =
        scoreSections(
            sections,
            resume
        );

    const parseability =
        scoreParseability(
            resume
        );

    const quality =
        scoreQuality(
            resume
        );

    const grammar =
        scoreGrammar(
            resume
        );

    const actionVerbs =
        scoreActionVerbs(
            resume
        );

    const projects =
        scoreProjects(
            resume,
            sections
        );

    /*
     * ========================================================
     * WEIGHTED SCORE
     * ========================================================
     */

    const weightedTotal =
        keyword.score *
        WEIGHTS.keywordMatch +

        skills.score *
        WEIGHTS.skillsMatch +

        experience.score *
        WEIGHTS.experience +

        responsibilities.score *
        WEIGHTS.responsibilities +

        jobTitle.score *
        WEIGHTS.jobTitle +

        sectionScore.score *
        WEIGHTS.sections +

        parseability.score *
        WEIGHTS.parseability +

        quality.score *
        WEIGHTS.quality;

    const overallScore =
        Math.round(
            weightedTotal / 100
        );

    /*
     * ========================================================
     * CONFIDENCE
     * ========================================================
     *
     * Confidence is NOT the ATS score.
     *
     * It tells us how much usable signal the engine found.
     */

    const signalCount = [
        keyword.totalKeywords > 0,
        skills.matchedSkills.length +
        skills.missingSkills.length >
        0,
        sections.experience,
        sections.skills,
        sections.education,
        sections.projects,
        resume.length >= 300,
    ].filter(Boolean).length;

    const confidence =
        Math.round(
            (signalCount / 7) * 100
        );

    /*
     * Interview chance remains an estimate,
     * not a probability of actually getting an interview.
     */
    const interviewChance =
        Math.round(
            overallScore * 0.5 +
            skills.score * 0.25 +
            experience.score * 0.15 +
            parseability.score * 0.10
        );

    const qualityLabel =
        overallScore >= 85 ?
        'Excellent' :
        overallScore >= 70 ?
        'Good' :
        overallScore >= 50 ?
        'Fair' :
        'Needs Work';

    /*
     * Keyword density.
     */
    const density =
        keywordDensity(
            resume, [
                ...(skills.matchedSkills || []),
                ...(keyword.matched || []),
            ]
        );

    /*
     * ========================================================
     * FINAL RESPONSE
     * ========================================================
     */

    return {
        overallScore,

        /*
         * New explicit field.
         */
        atsScore: overallScore,

        quality: qualityLabel,

        confidence,

        scoreType: 'JD_MATCH',

        interviewChance: Math.max(
            0,
            Math.min(
                100,
                interviewChance
            )
        ),

        breakdown: {
            keywordMatch: {
                score: keyword.score,
                weight: WEIGHTS.keywordMatch,
            },

            skillsMatch: {
                score: skills.score,
                weight: WEIGHTS.skillsMatch,
            },

            experience: {
                score: experience.score,
                weight: WEIGHTS.experience,
            },

            responsibilities: {
                score: responsibilities.score,
                weight: WEIGHTS.responsibilities,
            },

            jobTitle: {
                score: jobTitle.score,
                weight: WEIGHTS.jobTitle,
            },

            sections: {
                score: sectionScore.score,
                weight: WEIGHTS.sections,
            },

            parseability: {
                score: parseability.score,
                weight: WEIGHTS.parseability,
            },

            quality: {
                score: quality.score,
                weight: WEIGHTS.quality,
            },

            /*
             * Keep these for existing UI compatibility.
             */
            projects: {
                score: projects.score,
                weight: 0,
            },

            formatting: {
                score: parseability.score,
                weight: 0,
            },

            grammar: {
                score: grammar.score,
                weight: 0,
            },

            education: {
                score: sections.education ?
                    100 : 0,
                weight: 0,
            },

            achievements: {
                score: sections.achievements ?
                    100 : 0,
                weight: 0,
            },

            actionVerbs: {
                score: actionVerbs.score,
                weight: 0,
            },
        },

        keywordAnalysis: {
            matched: keyword.matched || [],

            missing: keyword.missing || [],

            criticalMissing: keyword.missingCritical || [],

            criticalMatched: keyword.matchedCritical || [],

            secondaryMissing: keyword.missingSecondary || [],

            secondaryMatched: keyword.matchedSecondary || [],

            density,

            totalJDKeywords: keyword.jdKeywordCount || 0,

            criticalKeywordCount: keyword.criticalCount || 0,

            secondaryKeywordCount: keyword.secondaryCount || 0,
        },

        skillsAnalysis: {
            matched: skills.matchedSkills || [],

            missing: skills.missingSkills || [],

            total: skills.matchedSkills.length +
                skills.missingSkills.length,
        },

        responsibilityAnalysis: responsibilities,

        jobTitleAnalysis: jobTitle,

        sectionAnalysis: sectionScore,

        parseabilityAnalysis: parseability,

        sections,

        formattingIssues: parseability.issues,

        grammarIssues: grammar.issues,

        readabilityScore: grammar.readability,

        repeatedWords: grammar.repeated,

        actionVerbs: {
            strong: actionVerbs.strongVerbsFound,

            weak: actionVerbs.weakVerbsFound,
        },

        buzzwords: quality.buzzwords,

        wordCount: countWords(resume),
    };
}

/*
 * ============================================================
 * HEATMAP
 * ============================================================
 */

function buildSectionHeatmap(
    atsResult
) {
    const rate = (
        present,
        score
    ) => {
        if (!present) {
            return 'red';
        }

        if (score >= 75) {
            return 'green';
        }

        if (score >= 45) {
            return 'yellow';
        }

        return 'red';
    };

    const {
        sections,
        breakdown,
    } = atsResult;

    return {
        summary: rate(
            sections.summary,
            breakdown.quality.score
        ),

        experience: rate(
            sections.experience,
            breakdown.experience.score
        ),

        projects: rate(
            sections.projects,
            breakdown.projects.score
        ),

        skills: rate(
            sections.skills,
            breakdown.skillsMatch.score
        ),

        education: rate(
            sections.education,
            breakdown.sections.score
        ),

        achievements: sections.achievements ?
            'green' : 'yellow',

        certifications: sections.certifications ?
            'green' : 'yellow',
    };
}

/*
 * ============================================================
 * TOP IMPROVEMENTS
 * ============================================================
 */

function buildTopImprovements(
    atsResult
) {
    const {
        breakdown,
        keywordAnalysis,
        skillsAnalysis,
        responsibilityAnalysis,
        jobTitleAnalysis,
        parseabilityAnalysis,
    } = atsResult;

    const suggestions = [];

    /*
     * Critical missing skills.
     */
    if (
        keywordAnalysis.criticalMissing &&
        keywordAnalysis.criticalMissing.length > 0
    ) {
        suggestions.push({
            impact: 'High',
            area: 'Critical Skills',
            suggestion: `Missing JD requirements: ${keywordAnalysis.criticalMissing
            .slice(0, 6)
            .join(', ')}.`,
        });
    }

    /*
     * Skill coverage.
     */
    if (
        breakdown.skillsMatch.score < 70 &&
        skillsAnalysis.missing &&
        skillsAnalysis.missing.length > 0
    ) {
        suggestions.push({
            impact: 'High',
            area: 'Skills Match',
            suggestion: `Add only the skills you genuinely possess: ${skillsAnalysis.missing
            .slice(0, 6)
            .join(', ')}.`,
        });
    }
    /*
     * Responsibility alignment.
     */
    if (
        breakdown.responsibilities.score < 65
    ) {
        suggestions.push({
            impact: 'High',
            area: 'Job Responsibilities',
            suggestion: 'Rewrite relevant experience/project bullets so they clearly demonstrate responsibilities described in the job description.',
        });
    }

    /*
     * Job title.
     */
    if (
        breakdown.jobTitle.score < 60
    ) {
        suggestions.push({
            impact: 'Medium',
            area: 'Job Title Alignment',
            suggestion: `Use the target role terminology naturally in your summary or relevant experience where truthful. Target: ${jobTitleAnalysis.title || 'job title'}.`,
        });
    }

    /*
     * Parseability.
     */
    if (
        breakdown.parseability.score < 85
    ) {
        suggestions.push({
            impact: 'High',
            area: 'ATS Parseability',
            suggestion: parseabilityAnalysis.issues[0] ||
                'Simplify the resume structure so text can be extracted cleanly by ATS software.',
        });
    }

    /*
     * Experience.
     */
    if (
        breakdown.experience.score < 65
    ) {
        suggestions.push({
            impact: 'Medium',
            area: 'Experience',
            suggestion: 'Strengthen relevant experience bullets with clear actions, technologies and measurable outcomes.',
        });
    }

    /*
     * Sections.
     */
    if (
        breakdown.sections.score < 80
    ) {
        suggestions.push({
            impact: 'Medium',
            area: 'Sections',
            suggestion: 'Use standard ATS-friendly sections such as Skills, Experience, Education and Projects where applicable.',
        });
    }

    /*
     * Quality.
     */
    if (
        breakdown.quality.score < 65
    ) {
        suggestions.push({
            impact: 'Low',
            area: 'Resume Quality',
            suggestion: 'Improve readability, bullet structure and remove unnecessary repetition.',
        });
    }

    if (!suggestions.length) {
        suggestions.push({
            impact: 'Low',
            area: 'General',
            suggestion: 'Your resume is strongly aligned with this job description. Continue tailoring only where the changes are truthful.',
        });
    }

    const order = {
        High: 0,
        Medium: 1,
        Low: 2,
    };

    return suggestions.sort(
        (a, b) =>
        order[a.impact] -
        order[b.impact]
    );
}

/*
 * ============================================================
 * SKILL RECONCILIATION
 * ============================================================
 */

function reconcileSkillsCoverage(
    resumeText,
    profile = {},
    jobDescription = ''
) {
    if (!jobDescription ||
        !jobDescription.trim()
    ) {
        return resumeText;
    }

    const initialScore =
        calculateATSScore(
            resumeText,
            jobDescription
        );

    const missingCritical =
        initialScore.keywordAnalysis
        .criticalMissing || [];

    if (!missingCritical.length) {
        return resumeText;
    }

    const rawCombined = [
            profile.skills,
            profile.experience,
            profile.projects,
            profile.achievements,
            profile.certifications,
            profile.languages,
        ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();

    const genuineAdditions =
        missingCritical.filter(
            (keyword) =>
            rawCombined.includes(
                keyword.toLowerCase()
            )
        );

    if (!genuineAdditions.length) {
        return resumeText;
    }

    const lines =
        resumeText.split('\n');

    const skillsIdx =
        lines.findIndex((line) =>
            /^(technical\s+)?skills\s*$/i
            .test(line.trim())
        );

    if (
        skillsIdx === -1 ||
        skillsIdx + 1 >= lines.length
    ) {
        return resumeText;
    }

    let skillsLineIdx =
        skillsIdx + 1;

    while (
        skillsLineIdx <
        lines.length &&
        !lines[
            skillsLineIdx
        ].trim()
    ) {
        skillsLineIdx++;
    }

    if (
        skillsLineIdx >= lines.length
    ) {
        return resumeText;
    }

    const existing =
        lines[skillsLineIdx] || '';

    const sectionLower =
        lines
        .slice(
            skillsIdx,
            skillsIdx + 12
        )
        .join('\n')
        .toLowerCase();

    const toAdd =
        genuineAdditions.filter(
            (keyword) =>
            !sectionLower.includes(
                keyword.toLowerCase()
            )
        );

    if (!toAdd.length) {
        return resumeText;
    }

    lines[skillsLineIdx] =
        `${existing.trim()}${
      existing.trim()
        ? ', '
        : ''
    }${toAdd.join(', ')}`;

    return lines.join('\n');
}

module.exports = {
    calculateATSScore,
    buildSectionHeatmap,
    buildTopImprovements,
    reconcileSkillsCoverage,
    WEIGHTS,
};