// ─────────────────────────────────────────────────────────────────────────────
// studyGoalConfig
//
// Authoritative configuration for the AI Document Intelligence module's
// study-goal / summary-length / language axes. Centralising these here
// means the prompt templates (./promptTemplates.js), the controller's
// request validation, and the orchestrator's word-count budgeting all read
// from the same constants — no risk of drift.
//
// The V2 spec calls out: "Never ask AI 'Generate 10 pages'. Instead
// calculate target word count." This module is where that conversion
// lives.
// ─────────────────────────────────────────────────────────────────────────────

// Target word count per `summaryLength` value. The chunk-merge / final-pass
// stages use these to budget how aggressively to compress / expand.
// Calibrated against typical printed-page density at ~320 words per A4 page
// for study-notes formatting:
//   2 pages  ≈  1,800 words
//   5 pages  ≈  4,500 words
//   10 pages ≈  9,000 words
export const SUMMARY_LENGTH_WORDS = {
    auto: null, // computed at runtime based on source size
    2: 1800,
    5: 4500,
    10: 9000,
};

/**
 * Compute the target word count for a given (summaryLength, sourceWordCount).
 *
 * - Numeric `summaryLength` values look up SUMMARY_LENGTH_WORDS directly.
 * - 'auto' picks a sensible bucket from the source length: short docs get
 *   ~2 pages, mid-size ~5 pages, big textbooks ~10 pages.
 *
 * @param {string} summaryLength  '2' | '5' | '10' | 'auto'
 * @param {number} sourceWordCount
 * @returns {number}
 */
export const targetWordsFor = (summaryLength, sourceWordCount) => {
    const explicit = SUMMARY_LENGTH_WORDS[summaryLength];
    if (typeof explicit === 'number') return explicit;
    if (sourceWordCount < 4000) return SUMMARY_LENGTH_WORDS[2];
    if (sourceWordCount < 12000) return SUMMARY_LENGTH_WORDS[5];
    return SUMMARY_LENGTH_WORDS[10];
};

// Dedicated prompt-template label + tone-of-voice instructions for each
// study goal. The keys here are referenced by promptTemplates.js — adding
// a new goal requires updating both files and the AISummary model's
// `studyGoal` enum (in /backend/models/AISummary.js).
export const STUDY_GOAL_TEMPLATES = {
    exam_tomorrow: {
        label: 'Exam Tomorrow',
        voice:
            'You are coaching a panicked student whose exam is in less than 24 hours. Prioritise the highest-yield facts, frequently-asked-question patterns, mnemonics, and rapid-recall bullets. Skip background, history, and nuance. Every line must be drilling for the test.',
        emphases: [
            'mnemonics for hard-to-remember facts',
            'frequently-asked question patterns',
            'high-yield single-line takeaways',
        ],
    },
    quick_revision: {
        label: 'Quick Revision',
        voice:
            'You are producing a scannable last-minute revision sheet. Use crisp bullet points, bold every key term, keep prose minimal. Aim for "open the page, get the gist in two minutes" density.',
        emphases: [
            'short bullets, never paragraphs',
            'bolded key terms throughout',
            'inline mini-examples where they fit in one line',
        ],
    },
    detailed_notes: {
        label: 'Detailed Notes',
        voice:
            'You are writing a full study companion. Explain every concept clearly, include the intuition behind each idea, and weave in worked examples. Treat the reader as someone who is learning the material for the first time and wants depth.',
        emphases: [
            'intuition + reasoning for every concept',
            'worked examples where they aid understanding',
            'connections between chapters',
        ],
    },
    research_mode: {
        label: 'Research Mode',
        voice:
            'You are preparing an academic-grade summary. Preserve nuance, technical terminology, and edge cases. Keep the original argumentative structure visible. Quote precise definitions verbatim where they matter, and call out ambiguities rather than smoothing them over.',
        emphases: [
            'precise technical vocabulary',
            'preserved argument structure',
            'flagged ambiguities, open questions, and debates',
        ],
    },
    interview_prep: {
        label: 'Interview Preparation',
        voice:
            'You are coaching for technical interviews. Emphasise definitions, trade-offs, and real-world applications. For every concept, ask yourself "how would an interviewer phrase this question?" and write toward that.',
        emphases: [
            'crisp definitions an interviewer would expect verbatim',
            'trade-offs and decision criteria',
            'real-world application examples per concept',
        ],
    },
};

// Per-language output instruction. Mixing instruction into a single
// constant keeps the prompt templates language-agnostic.
export const LANGUAGE_INSTRUCTIONS = {
    english: 'Write the entire output in clear, professional English.',
    hindi:
        'पूरा सारांश हिंदी (देवनागरी लिपि) में लिखें। तकनीकी शब्दों के लिए जहाँ आवश्यक हो वहाँ अंग्रेज़ी शब्द भी कोष्ठक में दे सकते हैं।',
    bengali:
        'সম্পূর্ণ সারাংশটি বাংলা ভাষায় লিখুন। যেখানে প্রয়োজন সেখানে কারিগরি শব্দের ইংরেজি প্রতিশব্দ বন্ধনীতে দেওয়া যেতে পারে।',
};

/**
 * Pull the canonical voice/emphasis/language strings for a normalised
 * settings object. Returns sane defaults if anything is missing so
 * callers never need to null-check.
 */
export const resolveStudyContext = (settings = {}) => {
    const goal =
        STUDY_GOAL_TEMPLATES[settings.studyGoal] ||
        STUDY_GOAL_TEMPLATES.quick_revision;
    const language =
        LANGUAGE_INSTRUCTIONS[settings.language] ||
        LANGUAGE_INSTRUCTIONS.english;
    return {
        goalLabel: goal.label,
        voice: goal.voice,
        emphases: goal.emphases,
        language,
    };
};
