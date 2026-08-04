const { normalize, tokenize } = require('./textUtils');

/*
 * ============================================================
 * ResumePilot ATS Keyword Engine
 * ============================================================
 *
 * Important design rule:
 *
 *     "React", "React.js", "ReactJS"
 *              ↓
 *           react
 *
 *     "Machine Learning", "ML"
 *              ↓
 *        machine_learning
 *
 * Every skill has ONE canonical ID.
 *
 * This prevents aliases from being counted as different skills
 * and makes the ATS score deterministic.
 * ============================================================
 */

const SKILL_GROUPS = {
    javascript: [
        'javascript',
        'js',
        'ecmascript',
    ],

    typescript: [
        'typescript',
        'ts',
    ],

    python: [
        'python',
    ],

    java: [
        'java',
    ],

    cpp: [
        'c++',
        'cpp',
    ],

    csharp: [
        'c#',
        'c sharp',
        'csharp',
    ],

    go: [
        'golang',
        'go language',
    ],

    rust: [
        'rust',
    ],

    php: [
        'php',
    ],

    ruby: [
        'ruby',
    ],

    kotlin: [
        'kotlin',
    ],

    swift: [
        'swift',
    ],

    sql: [
        'sql',
    ],

    html: [
        'html',
        'html5',
    ],

    css: [
        'css',
        'css3',
    ],

    bash: [
        'bash',
        'shell scripting',
        'shell script',
    ],

    react: [
        'react',
        'react.js',
        'reactjs',
    ],

    redux: [
        'redux',
    ],

    vue: [
        'vue',
        'vue.js',
        'vuejs',
    ],

    angular: [
        'angular',
        'angular.js',
        'angularjs',
    ],

    nextjs: [
        'next.js',
        'nextjs',
        'next js',
    ],

    tailwind: [
        'tailwind',
        'tailwind css',
        'tailwindcss',
    ],

    bootstrap: [
        'bootstrap',
    ],

    vite: [
        'vite',
    ],

    webpack: [
        'webpack',
    ],

    nodejs: [
        'node',
        'node.js',
        'nodejs',
    ],

    express: [
        'express',
        'express.js',
        'expressjs',
    ],

    django: [
        'django',
    ],

    flask: [
        'flask',
    ],

    fastapi: [
        'fastapi',
        'fast api',
    ],

    spring: [
        'spring',
    ],

    spring_boot: [
        'spring boot',
        'springboot',
    ],

    dotnet: [
        '.net',
        'dotnet',
        'asp.net',
        'aspnet',
    ],

    laravel: [
        'laravel',
    ],

    graphql: [
        'graphql',
    ],

    rest_api: [
        'rest api',
        'restful api',
        'rest apis',
        'restful apis',
    ],

    grpc: [
        'grpc',
    ],

    mongodb: [
        'mongodb',
        'mongo db',
        'mongo',
    ],

    postgresql: [
        'postgresql',
        'postgres',
        'postgres db',
    ],

    mysql: [
        'mysql',
    ],

    sqlite: [
        'sqlite',
    ],

    redis: [
        'redis',
    ],

    elasticsearch: [
        'elasticsearch',
        'elastic search',
    ],

    dynamodb: [
        'dynamodb',
        'dynamo db',
    ],

    firebase: [
        'firebase',
    ],

    cassandra: [
        'cassandra',
    ],

    oracle: [
        'oracle database',
        'oracle db',
        'oracle',
    ],

    mariadb: [
        'mariadb',
    ],

    supabase: [
        'supabase',
    ],

    aws: [
        'aws',
        'amazon web services',
        'amazon aws',
    ],

    azure: [
        'azure',
        'microsoft azure',
    ],

    gcp: [
        'gcp',
        'google cloud',
        'google cloud platform',
    ],

    docker: [
        'docker',
        'docker containers',
        'containerization',
    ],

    kubernetes: [
        'kubernetes',
        'k8s',
    ],

    terraform: [
        'terraform',
    ],

    jenkins: [
        'jenkins',
    ],

    github_actions: [
        'github actions',
    ],

    gitlab_ci: [
        'gitlab ci',
        'gitlab-ci',
    ],

    ansible: [
        'ansible',
    ],

    nginx: [
        'nginx',
    ],

    linux: [
        'linux',
    ],

    cicd: [
        'ci/cd',
        'ci cd',
        'continuous integration',
        'continuous delivery',
        'continuous deployment',
    ],

    git: [
        'git',
        'git scm',
    ],

    github: [
        'github',
    ],

    jira: [
        'jira',
    ],

    postman: [
        'postman',
    ],

    agile: [
        'agile',
    ],

    scrum: [
        'scrum',
    ],

    microservices: [
        'microservices',
        'microservices architecture',
    ],

    unit_testing: [
        'unit testing',
        'unit tests',
        'unit test',
    ],

    jest: [
        'jest',
    ],

    cypress: [
        'cypress',
    ],

    selenium: [
        'selenium',
    ],

    machine_learning: [
        'machine learning',
        'machine-learning',
        'ml',
    ],

    deep_learning: [
        'deep learning',
        'deep-learning',
        'dl',
    ],

    tensorflow: [
        'tensorflow',
    ],

    pytorch: [
        'pytorch',
    ],

    keras: [
        'keras',
    ],

    scikit_learn: [
        'scikit-learn',
        'scikit learn',
        'sklearn',
    ],

    pandas: [
        'pandas',
    ],

    numpy: [
        'numpy',
    ],

    nlp: [
        'nlp',
        'natural language processing',
    ],

    computer_vision: [
        'computer vision',
        'cv',
    ],

    data_science: [
        'data science',
        'data scientist',
    ],

    data_analysis: [
        'data analysis',
        'data analytics',
        'data analyst',
    ],

    openai: [
        'openai',
    ],

    llm: [
        'llm',
        'large language model',
        'large language models',
    ],

    generative_ai: [
        'generative ai',
        'genai',
        'gen ai',
    ],

    artificial_intelligence: [
        'artificial intelligence',
        'ai',
    ],

    power_bi: [
        'power bi',
        'powerbi',
    ],

    tableau: [
        'tableau',
    ],

    excel: [
        'excel',
        'microsoft excel',
    ],

    communication: [
        'communication',
        'communication skills',
    ],

    leadership: [
        'leadership',
        'leadership skills',
    ],

    teamwork: [
        'teamwork',
        'team work',
    ],

    problem_solving: [
        'problem solving',
        'problem-solving',
    ],

    collaboration: [
        'collaboration',
        'collaborative',
    ],

    project_management: [
        'project management',
    ],

    stakeholder_management: [
        'stakeholder management',
    ],

    mentoring: [
        'mentoring',
        'mentorship',
    ],

    analytical_skills: [
        'analytical skills',
        'analytical thinking',
    ],

    attention_to_detail: [
        'attention to detail',
    ],
};

/*
 * Canonical display names.
 */
const SKILL_LABELS = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    kotlin: 'Kotlin',
    swift: 'Swift',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',

    react: 'React',
    redux: 'Redux',
    vue: 'Vue',
    angular: 'Angular',
    nextjs: 'Next.js',
    tailwind: 'Tailwind CSS',
    bootstrap: 'Bootstrap',
    vite: 'Vite',
    webpack: 'Webpack',

    nodejs: 'Node.js',
    express: 'Express.js',
    django: 'Django',
    flask: 'Flask',
    fastapi: 'FastAPI',
    spring: 'Spring',
    spring_boot: 'Spring Boot',
    dotnet: '.NET',
    laravel: 'Laravel',
    graphql: 'GraphQL',
    rest_api: 'REST API',
    grpc: 'gRPC',

    mongodb: 'MongoDB',
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    sqlite: 'SQLite',
    redis: 'Redis',
    elasticsearch: 'Elasticsearch',
    dynamodb: 'DynamoDB',
    firebase: 'Firebase',
    cassandra: 'Cassandra',
    oracle: 'Oracle',
    mariadb: 'MariaDB',
    supabase: 'Supabase',

    aws: 'AWS',
    azure: 'Azure',
    gcp: 'Google Cloud',
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    terraform: 'Terraform',
    jenkins: 'Jenkins',
    github_actions: 'GitHub Actions',
    gitlab_ci: 'GitLab CI',
    ansible: 'Ansible',
    nginx: 'Nginx',
    linux: 'Linux',
    cicd: 'CI/CD',

    git: 'Git',
    github: 'GitHub',
    jira: 'Jira',
    postman: 'Postman',
    agile: 'Agile',
    scrum: 'Scrum',
    microservices: 'Microservices',
    unit_testing: 'Unit Testing',
    jest: 'Jest',
    cypress: 'Cypress',
    selenium: 'Selenium',

    machine_learning: 'Machine Learning',
    deep_learning: 'Deep Learning',
    tensorflow: 'TensorFlow',
    pytorch: 'PyTorch',
    keras: 'Keras',
    scikit_learn: 'Scikit-learn',
    pandas: 'Pandas',
    numpy: 'NumPy',
    nlp: 'NLP',
    computer_vision: 'Computer Vision',
    data_science: 'Data Science',
    data_analysis: 'Data Analysis',
    openai: 'OpenAI',
    llm: 'LLM',
    generative_ai: 'Generative AI',
    artificial_intelligence: 'Artificial Intelligence',
    power_bi: 'Power BI',
    tableau: 'Tableau',
    excel: 'Excel',

    communication: 'Communication',
    leadership: 'Leadership',
    teamwork: 'Teamwork',
    problem_solving: 'Problem Solving',
    collaboration: 'Collaboration',
    project_management: 'Project Management',
    stakeholder_management: 'Stakeholder Management',
    mentoring: 'Mentoring',
    analytical_skills: 'Analytical Skills',
    attention_to_detail: 'Attention to Detail',
};

/*
 * Build reverse alias lookup.
 */
const ALIAS_TO_CANONICAL = {};

Object.entries(SKILL_GROUPS).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
        ALIAS_TO_CANONICAL[alias] = canonical;
    });
});

function normalizeForMatching(text = '') {
    let value = String(text || '').toLowerCase();

    value = value
        .replace(/[•▪‣◦]/g, ' ')
        .replace(/[–—−]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

    return ` ${value} `;
}

function containsAlias(text, alias) {
    const normalized = normalizeForMatching(text);

    const escaped = alias
        .toLowerCase()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+');

    /*
     * Word boundaries are intentionally avoided for some technologies
     * because "." and "+" have special meanings.
     */
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, 'i')
        .test(normalized);
}

/*
 * Return canonical skill IDs.
 */
function extractCanonicalSkills(text = '') {
    const found = new Set();

    Object.entries(SKILL_GROUPS).forEach(([canonical, aliases]) => {
        if (aliases.some((alias) => containsAlias(text, alias))) {
            found.add(canonical);
        }
    });

    return Array.from(found);
}

/*
 * Return display names instead of IDs.
 */
function extractKnownSkills(text = '') {
    return extractCanonicalSkills(text)
        .map((id) => SKILL_LABELS[id] || id)
        .sort();
}

/*
 * Count canonical skill occurrences.
 */
function countSkillOccurrences(text = '') {
    const counts = {};

    Object.entries(SKILL_GROUPS).forEach(([canonical, aliases]) => {
        let count = 0;

        aliases.forEach((alias) => {
            const normalized = normalizeForMatching(text);
            const escaped = alias
                .toLowerCase()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\s+/g, '\\s+');

            const regex = new RegExp(
                `(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`,
                'gi'
            );

            count += (normalized.match(regex) || []).length;
        });

        if (count > 0) {
            counts[canonical] = count;
        }
    });

    return counts;
}

/*
 * Common JD filler words.
 */
const JD_BOILERPLATE = new Set([
    'experience',
    'experienced',
    'role',
    'roles',
    'team',
    'teams',
    'work',
    'working',
    'worked',
    'years',
    'year',
    'ability',
    'able',
    'strong',
    'knowledge',
    'including',
    'environment',
    'company',
    'job',
    'position',
    'candidate',
    'candidates',
    'looking',
    'skills',
    'skill',
    'required',
    'requirements',
    'requirement',
    'preferred',
    'responsibilities',
    'responsibility',
    'responsible',
    'qualifications',
    'qualification',
    'plus',
    'good',
    'excellent',
    'strongly',
    'must',
    'ideal',
    'related',
    'across',
    'various',
    'multiple',
    'new',
    'high',
    'level',
    'levels',
    'help',
    'helping',
    'support',
    'supporting',
    'business',
    'businesses',
    'client',
    'clients',
    'people',
    'individual',
    'opportunity',
    'opportunities',
    'growing',
    'growth',
    'fast',
    'paced',
    'passion',
    'passionate',
    'benefits',
    'salary',
    'location',
    'employment',
    'apply',
    'application',
    'join',
    'joining',
    'love',
    'like',
    'want',
    'wanted',
]);

function extractFrequentKeywords(text = '', limit = 15) {
    const tokens = tokenize(text);

    const freq = {};

    tokens.forEach((token) => {
        const word = String(token).toLowerCase().trim();

        if (word.length < 4) return;
        if (/^\d+$/.test(word)) return;
        if (JD_BOILERPLATE.has(word)) return;

        freq[word] = (freq[word] || 0) + 1;
    });

    return Object.entries(freq)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit)
        .map(([word, count]) => ({
            word,
            count,
        }));
}

function extractFrequentPhrases(text = '', limit = 15) {
    const tokens = tokenize(text)
        .map((x) => String(x).toLowerCase())
        .filter((x) => x.length >= 3);

    const phrases = {};

    for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];

        if (JD_BOILERPLATE.has(a) || JD_BOILERPLATE.has(b)) {
            continue;
        }

        const phrase = `${a} ${b}`;
        phrases[phrase] = (phrases[phrase] || 0) + 1;
    }

    for (let i = 0; i < tokens.length - 2; i++) {
        const a = tokens[i];
        const b = tokens[i + 1];
        const c = tokens[i + 2];

        if (
            JD_BOILERPLATE.has(a) ||
            JD_BOILERPLATE.has(b) ||
            JD_BOILERPLATE.has(c)
        ) {
            continue;
        }

        const phrase = `${a} ${b} ${c}`;
        phrases[phrase] = (phrases[phrase] || 0) + 1;
    }

    return Object.entries(phrases)
        .filter(([, count]) => count >= 2)
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit)
        .map(([phrase]) => phrase);
}

function extractPreferredSection(jdText = '') {
    const headerRegex =
        /(nice[-\s]?to[-\s]?have|preferred|bonus|good[-\s]?to[-\s]?have|a plus|strongly preferred|is a plus)\s*:?/i;

    const stopRegex =
        /(requirements?|must[-\s]?have|responsibilit|about (the )?company|benefits|perks|what we offer|compensation|salary|minimum qualifications?)\s*:?/i;

    const lines = String(jdText || '').split('\n');

    let capturing = false;
    const captured = [];

    for (const line of lines) {
        if (!capturing) {
            const match = line.match(headerRegex);

            if (match) {
                capturing = true;

                const afterHeader = line
                    .slice(match.index + match[0].length)
                    .trim();

                if (afterHeader) {
                    captured.push(afterHeader);
                }
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

function extractJDKeywords(jdText = '') {
    if (!jdText || !jdText.trim()) {
        return {
            critical: [],
            secondary: [],
            all: [],
            criticalIds: [],
            secondaryIds: [],
        };
    }

    const allSkillIds = extractCanonicalSkills(jdText);

    const totalOccurrences = countSkillOccurrences(jdText);

    const preferredText = extractPreferredSection(jdText);
    const preferredOccurrences = countSkillOccurrences(preferredText);

    const criticalIds = [];
    const secondaryIds = [];

    allSkillIds.forEach((id) => {
        const total = totalOccurrences[id] || 0;
        const preferred = preferredOccurrences[id] || 0;

        if (preferred > 0 && preferred >= total) {
            secondaryIds.push(id);
        } else {
            criticalIds.push(id);
        }
    });

    const critical = criticalIds.map(
        (id) => SKILL_LABELS[id] || id
    );

    const secondary = secondaryIds.map(
        (id) => SKILL_LABELS[id] || id
    );

    /*
     * Generic frequent words are only secondary.
     * They NEVER become critical skills.
     */
    extractFrequentKeywords(jdText, 10).forEach(({ word }) => {
        const alreadyKnown = [...critical, ...secondary]
            .some((x) => x.toLowerCase() === word.toLowerCase());

        if (!alreadyKnown) {
            secondary.push(word);
        }
    });

    return {
        critical,
        secondary,
        all: [...new Set([...critical, ...secondary])],
        criticalIds,
        secondaryIds,
    };
}

function analyzeKeywordMatch(jdKeywords, resumeText = '') {
    const resumeSkillIds = new Set(
        extractCanonicalSkills(resumeText)
    );

    const criticalIds = jdKeywords.criticalIds || [];
    const secondaryIds = jdKeywords.secondaryIds || [];

    const matchedCriticalIds = criticalIds.filter((id) =>
        resumeSkillIds.has(id)
    );

    const missingCriticalIds = criticalIds.filter(
        (id) => !resumeSkillIds.has(id)
    );

    const matchedSecondaryIds = secondaryIds.filter((id) =>
        resumeSkillIds.has(id)
    );

    const missingSecondaryIds = secondaryIds.filter(
        (id) => !resumeSkillIds.has(id)
    );

    /*
     * Critical requirements are worth 3x.
     * Preferred requirements are worth 1x.
     */
    const criticalWeight = 3;
    const secondaryWeight = 1;

    const totalWeight =
        criticalIds.length * criticalWeight +
        secondaryIds.length * secondaryWeight;

    const earnedWeight =
        matchedCriticalIds.length * criticalWeight +
        matchedSecondaryIds.length * secondaryWeight;

    const score =
        totalWeight > 0 ?
        Math.round((earnedWeight / totalWeight) * 100) :
        0;

    const toLabel = (id) => SKILL_LABELS[id] || id;

    return {
        score,

        matchedCritical: matchedCriticalIds.map(toLabel),
        missingCritical: missingCriticalIds.map(toLabel),

        matchedSecondary: matchedSecondaryIds.map(toLabel),
        missingSecondary: missingSecondaryIds.map(toLabel),

        matched: [
            ...matchedCriticalIds.map(toLabel),
            ...matchedSecondaryIds.map(toLabel),
        ],

        missing: [
            ...missingCriticalIds.map(toLabel),
            ...missingSecondaryIds.map(toLabel),
        ],

        totalKeywords: criticalIds.length + secondaryIds.length,

        criticalCount: criticalIds.length,
        secondaryCount: secondaryIds.length,
    };
}

function keywordDensity(text = '', keywords = []) {
    const normalized = normalizeForMatching(text);

    const totalWords =
        tokenize(text).length || 1;

    let hits = 0;

    keywords.forEach((keyword) => {
        const canonical = ALIAS_TO_CANONICAL[
            String(keyword).toLowerCase()
        ];

        const aliases = canonical ?
            SKILL_GROUPS[canonical] || [keyword] :
            [keyword];

        aliases.forEach((alias) => {
            const escaped = alias
                .toLowerCase()
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\s+/g, '\\s+');

            const regex = new RegExp(
                `(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`,
                'gi'
            );

            hits += (normalized.match(regex) || []).length;
        });
    });

    return Math.round(
        (hits / totalWords) * 1000
    ) / 10;
}

module.exports = {
    SKILL_GROUPS,
    SKILL_LABELS,
    KNOWN_SKILLS: Object.values(SKILL_LABELS),

    JD_BOILERPLATE,

    extractCanonicalSkills,
    extractKnownSkills,
    countSkillOccurrences,

    extractFrequentKeywords,
    extractFrequentPhrases,

    standardizeText: normalizeForMatching,

    extractPreferredSection,
    extractJDKeywords,
    analyzeKeywordMatch,
    keywordDensity,
};