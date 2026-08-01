const { extractTextFromFile } = require('../services/resumeParser');

const {
    calculateATSScore,
    buildSectionHeatmap,
    buildTopImprovements,
    reconcileSkillsCoverage,
} = require('../services/atsScoring');

const aiService = require('../services/aiService');
const exportService = require('../services/exportService');


// ============================================================
// HELPERS
// ============================================================

function requireField(value, name) {
    if (!value || !String(value).trim()) {
        const err = new Error(`${name} is required.`);
        err.statusCode = 400;
        throw err;
    }
}

function clean(value) {
    if (value === undefined || value === null) {
        return '';
    }

    return String(value).trim();
}

function hasObjectData(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    return Object.values(obj).some(
        (value) => clean(value).length > 0
    );
}


// ============================================================
// NORMALIZE NEW BUILDER DATA
// ============================================================

function normalizeBuilderProfile(body = {}) {
    const personal = body.personalInformation || {};

    // --------------------------------------------------------
    // SKILLS
    // --------------------------------------------------------

    const skills = body.skills || {};

    const skillGroups = [
        [
            'Programming Languages',
            skills.programmingLanguages,
        ],
        [
            'Frontend',
            skills.frontend,
        ],
        [
            'Backend',
            skills.backend,
        ],
        [
            'Databases',
            skills.databases,
        ],
        [
            'Data / AI / Machine Learning',
            skills.dataAI,
        ],
        [
            'Cloud / DevOps',
            skills.cloudDevOps,
        ],
        [
            'Tools',
            skills.tools,
        ],
    ];

    const skillsText = skillGroups
        .filter(([, value]) => clean(value))
        .map(
            ([label, value]) =>
            `${label}: ${clean(value)}`
        )
        .join('\n');


    // --------------------------------------------------------
    // EDUCATION
    // --------------------------------------------------------

    const educationText = Array.isArray(body.education) ?
        body.education
        .filter(hasObjectData)
        .map((edu) => {
            const parts = [];

            if (clean(edu.degree)) {
                parts.push(
                    `Degree: ${clean(edu.degree)}`
                );
            }

            if (clean(edu.institution)) {
                parts.push(
                    `Institution: ${clean(edu.institution)}`
                );
            }

            if (clean(edu.location)) {
                parts.push(
                    `Location: ${clean(edu.location)}`
                );
            }

            if (
                clean(edu.startDate) ||
                clean(edu.endDate)
            ) {
                parts.push(
                    `Dates: ${clean(
                            edu.startDate
                        )} - ${clean(edu.endDate)}`
                );
            }

            if (clean(edu.score)) {
                parts.push(
                    `CGPA/Percentage: ${clean(
                            edu.score
                        )}`
                );
            }

            if (clean(edu.coursework)) {
                parts.push(
                    `Relevant Coursework: ${clean(
                            edu.coursework
                        )}`
                );
            }

            return parts.join('\n');
        })
        .filter(Boolean)
        .join('\n\n') :
        clean(body.education);


    // --------------------------------------------------------
    // EXPERIENCE
    // --------------------------------------------------------

    const experienceText = Array.isArray(body.experience) ?
        body.experience
        .filter(hasObjectData)
        .map((exp) => {
            const parts = [];

            if (clean(exp.jobTitle)) {
                parts.push(
                    `Job Title: ${clean(
                            exp.jobTitle
                        )}`
                );
            }

            if (clean(exp.company)) {
                parts.push(
                    `Company: ${clean(exp.company)}`
                );
            }

            if (clean(exp.location)) {
                parts.push(
                    `Location: ${clean(exp.location)}`
                );
            }

            if (
                clean(exp.startDate) ||
                clean(exp.endDate)
            ) {
                parts.push(
                    `Dates: ${clean(
                            exp.startDate
                        )} - ${clean(exp.endDate)}`
                );
            }

            if (clean(exp.description)) {
                parts.push(
                    `Responsibilities and Achievements:\n${clean(
                            exp.description
                        )}`
                );
            }

            return parts.join('\n');
        })
        .filter(Boolean)
        .join('\n\n') :
        clean(body.experience);


    // --------------------------------------------------------
    // PROJECTS
    // --------------------------------------------------------

    const projectsText = Array.isArray(body.projects) ?
        body.projects
        .filter(hasObjectData)
        .map((project) => {
            const parts = [];

            if (clean(project.name)) {
                parts.push(
                    `Project Name: ${clean(
                            project.name
                        )}`
                );
            }

            if (clean(project.type)) {
                parts.push(
                    `Project Type: ${clean(
                            project.type
                        )}`
                );
            }

            if (clean(project.technologies)) {
                parts.push(
                    `Technologies: ${clean(
                            project.technologies
                        )}`
                );
            }

            if (clean(project.github)) {
                parts.push(
                    `GitHub: ${clean(
                            project.github
                        )}`
                );
            }

            if (clean(project.liveDemo)) {
                parts.push(
                    `Live Demo: ${clean(
                            project.liveDemo
                        )}`
                );
            }

            if (clean(project.description)) {
                parts.push(
                    `Description:\n${clean(
                            project.description
                        )}`
                );
            }

            return parts.join('\n');
        })
        .filter(Boolean)
        .join('\n\n') :
        clean(body.projects);


    // --------------------------------------------------------
    // CERTIFICATIONS
    // --------------------------------------------------------

    const certificationsText =
        Array.isArray(body.certifications) ?
        body.certifications
        .filter(hasObjectData)
        .map((cert) => {
            const parts = [];

            if (clean(cert.name)) {
                parts.push(
                    `Certification: ${clean(
                                cert.name
                            )}`
                );
            }

            if (clean(cert.organization)) {
                parts.push(
                    `Organization: ${clean(
                                cert.organization
                            )}`
                );
            }

            if (clean(cert.date)) {
                parts.push(
                    `Date: ${clean(cert.date)}`
                );
            }

            return parts.join('\n');
        })
        .filter(Boolean)
        .join('\n\n') :
        clean(body.certifications);


    // --------------------------------------------------------
    // RETURN NORMALIZED PROFILE
    // --------------------------------------------------------

    return {
        name: clean(
            personal.name || body.name
        ),

        email: clean(
            personal.email || body.email
        ),

        phone: clean(
            personal.phone || body.phone
        ),

        location: clean(
            personal.location || body.location
        ),

        linkedin: clean(
            personal.linkedin || body.linkedin
        ),

        github: clean(
            personal.github || body.github
        ),

        portfolio: clean(
            personal.portfolio || body.portfolio
        ),

        targetRole: clean(
            body.targetRole
        ),

        summary: clean(
            body.summary
        ),

        skills: skillsText,

        education: educationText,

        experience: experienceText,

        projects: projectsText,

        certifications: certificationsText,

        achievements: clean(
            body.achievements
        ),

        languages: clean(
            body.languages
        ),

        optimization: body.optimization || {},
    };
}


// ============================================================
// EXTRACT RESUME
// ============================================================

// POST /api/extract-resume
async function extractResume(req, res, next) {
    try {
        if (!req.file) {
            const err = new Error(
                'No file uploaded. Please attach a PDF or DOCX resume.'
            );

            err.statusCode = 400;
            throw err;
        }

        const text = await extractTextFromFile(
            req.file.buffer,
            req.file.originalname
        );

        if (!text || text.length < 20) {
            const err = new Error(
                'The uploaded file appears to be empty or unreadable.'
            );

            err.statusCode = 400;
            throw err;
        }

        res.json({
            success: true,
            data: {
                resumeText: text,
            },
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// BUILD RESUME
// ============================================================

// POST /api/build-resume
async function buildResume(req, res, next) {
    try {
        const body = req.body || {};

        const jobDescription = clean(
            body.jobDescription
        );

        requireField(
            jobDescription,
            'Job description'
        );

        const profile =
            normalizeBuilderProfile(body);

        requireField(
            profile.name,
            'Name'
        );

        requireField(
            profile.email,
            'Email'
        );


        // ----------------------------------------------------
        // AI GENERATION
        // ----------------------------------------------------

        let resumeText =
            await aiService.generateResume({
                jobDescription,
                profile,
            });


        if (!resumeText || !String(resumeText).trim()) {
            throw new Error(
                'Resume generation returned empty content.'
            );
        }


        // ----------------------------------------------------
        // SAFETY / KEYWORD COVERAGE
        // ----------------------------------------------------

        resumeText =
            reconcileSkillsCoverage(
                resumeText,
                profile,
                jobDescription
            );


        // ----------------------------------------------------
        // ATS ANALYSIS
        // ----------------------------------------------------

        const atsResult =
            calculateATSScore(
                resumeText,
                jobDescription
            );

        const heatmap =
            buildSectionHeatmap(
                atsResult
            );

        const topImprovements =
            buildTopImprovements(
                atsResult
            );


        // ----------------------------------------------------
        // DATA GAP WARNINGS
        // ----------------------------------------------------

        const gapNudges = [];

        if (!profile.experience.trim() &&
            !profile.projects.trim()
        ) {
            gapNudges.push({
                impact: 'High',

                area: 'Missing Sections',

                suggestion: 'No Experience or Projects were provided. The builder did not invent them. Add genuine experience or relevant projects to strengthen the resume.',
            });
        } else if (!profile.projects.trim()) {
            gapNudges.push({
                impact: 'Medium',

                area: 'Projects',

                suggestion: 'No Projects were provided. Add a genuine project demonstrating technologies relevant to the target role.',
            });
        } else if (!profile.experience.trim()) {
            gapNudges.push({
                impact: 'Medium',

                area: 'Experience',

                suggestion: 'No Experience was provided. Add internships, freelance work, research, volunteering, or other genuine practical experience if applicable.',
            });
        }


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        const skillsAnalysis =
            atsResult.skillsAnalysis || {};

        const keywordAnalysis =
            atsResult.keywordAnalysis || {};

        res.json({
            success: true,

            data: {
                resumeText,

                atsPreview: {
                    score: atsResult.overallScore,

                    quality: atsResult.quality,

                    breakdown: atsResult.breakdown,

                    keywordAnalysis,

                    skillsAnalysis,

                    heatmap,

                    topImprovements: [
                        ...gapNudges,
                        ...topImprovements,
                    ],
                },

                targetRole: profile.targetRole,

                matchedSkills: skillsAnalysis.matched || [],

                missingSkills: skillsAnalysis.missing || [],

                matchedKeywords: keywordAnalysis.matched || [],

                missingKeywords: keywordAnalysis.missing || [],
            },
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// OPTIMIZE EXISTING RESUME
// ============================================================

// POST /api/optimize-resume
async function optimizeResume(req, res, next) {
    try {
        let resumeText =
            req.body.resumeText;

        if (req.file) {
            resumeText =
                await extractTextFromFile(
                    req.file.buffer,
                    req.file.originalname
                );
        }

        requireField(
            resumeText,
            'Resume'
        );

        requireField(
            req.body.jobDescription,
            'Job description'
        );

        const result =
            await aiService.optimizeResume({
                resumeText,
                jobDescription: req.body.jobDescription,
            });

        const beforeScore =
            calculateATSScore(
                resumeText,
                req.body.jobDescription
            );

        const optimizedText =
            result.optimizedResume ||
            result.resumeText ||
            resumeText;

        const afterScore =
            calculateATSScore(
                optimizedText,
                req.body.jobDescription
            );

        res.json({
            success: true,

            data: {
                original: resumeText,

                result,

                scoreComparison: {
                    before: beforeScore.overallScore,

                    after: afterScore.overallScore,
                },
            },
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// CHECK ATS
// ============================================================

// POST /api/check-ats
async function checkATS(req, res, next) {
    try {
        let resumeText =
            req.body.resumeText;

        if (req.file) {
            resumeText =
                await extractTextFromFile(
                    req.file.buffer,
                    req.file.originalname
                );
        }

        requireField(
            resumeText,
            'Resume'
        );

        const jobDescription =
            clean(
                req.body.jobDescription
            );

        const atsResult =
            calculateATSScore(
                resumeText,
                jobDescription
            );

        const heatmap =
            buildSectionHeatmap(
                atsResult
            );

        const topImprovements =
            buildTopImprovements(
                atsResult
            );

        res.json({
            success: true,

            data: {
                resumeText,

                ...atsResult,

                heatmap,

                topImprovements,
            },
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// RECRUITER DASHBOARD
// ============================================================

// POST /api/recruiter-dashboard
async function recruiterDashboard(
    req,
    res,
    next
) {
    try {
        let resumeText =
            req.body.resumeText;

        if (req.file) {
            resumeText =
                await extractTextFromFile(
                    req.file.buffer,
                    req.file.originalname
                );
        }

        requireField(
            resumeText,
            'Resume'
        );

        const jobDescription =
            clean(
                req.body.jobDescription
            );

        const atsResult =
            calculateATSScore(
                resumeText,
                jobDescription
            );

        const heatmap =
            buildSectionHeatmap(
                atsResult
            );

        const topImprovements =
            buildTopImprovements(
                atsResult
            );

        const recruiterFeedback =
            await aiService.generateRecruiterFeedback({
                resumeText,
                jobDescription,
                atsResult,
            });

        res.json({
            success: true,

            data: {
                candidateName: req.body.candidateName ||
                    'Candidate',

                targetRole: req.body.targetRole ||
                    'Target Role',

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


// ============================================================
// COVER LETTER
// ============================================================

// POST /api/cover-letter
async function coverLetter(
    req,
    res,
    next
) {
    try {
        const {
            resumeText,
            jobDescription,
            company,
            role,
        } = req.body;

        requireField(
            resumeText,
            'Resume'
        );

        requireField(
            jobDescription,
            'Job description'
        );

        const letter =
            await aiService.generateCoverLetter({
                resumeText,
                jobDescription,
                company,
                role,
            });

        res.json({
            success: true,

            data: {
                coverLetter: letter,
            },
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// INTERVIEW PREPARATION
// ============================================================

// POST /api/interview
async function interviewPrep(
    req,
    res,
    next
) {
    try {
        const {
            resumeText,
            jobDescription,
            company,
            role,
        } = req.body;

        requireField(
            resumeText,
            'Resume'
        );

        requireField(
            jobDescription,
            'Job description'
        );

        const questions =
            await aiService.generateInterviewQuestions({
                resumeText,
                jobDescription,
                company,
                role,
            });

        res.json({
            success: true,

            data: questions,
        });
    } catch (err) {
        next(err);
    }
}


// ============================================================
// EXPORT RESUME
// ============================================================

// POST /api/export
async function exportResume(
    req,
    res,
    next
) {
    try {
        const {
            resumeText,
            format,
        } = req.body;

        requireField(
            resumeText,
            'Resume text'
        );

        requireField(
            format,
            'Export format'
        );

        let buffer;
        let contentType;
        let filename;

        switch (
            String(format).toLowerCase()
        ) {
            case 'pdf':
                buffer =
                    await exportService.generatePDF(
                        resumeText
                    );

                contentType =
                    'application/pdf';

                filename =
                    'resume.pdf';

                break;

            case 'docx':
                buffer =
                    await exportService.generateDOCX(
                        resumeText
                    );

                contentType =
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

                filename =
                    'resume.docx';

                break;

            case 'txt':
                buffer =
                    exportService.generateTXT(
                        resumeText
                    );

                contentType =
                    'text/plain';

                filename =
                    'resume.txt';

                break;

            default:
                {
                    const err = new Error(
                        'Invalid export format. Use pdf, docx, or txt.'
                    );

                    err.statusCode = 400;

                    throw err;
                }
        }

        res.setHeader(
            'Content-Type',
            contentType
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`
        );

        res.send(
            Buffer.from(buffer)
        );
    } catch (err) {
        next(err);
    }
}


// ============================================================
// EXPORTS
// ============================================================

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