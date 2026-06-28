// exampleService
//
// Enriches raw extracted examples into four-faceted example cards. Each
// card has: title, conceptExample, realWorldExample, examExample,
// interviewExample.
//
// Skipped entirely when `advancedOptions.keepExamples === false`.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { exampleEnrichmentPrompt } from './shared/promptTemplates.js';

const MAX_EXAMPLES_PER_PASS = 24;

export const enrichExamples = async ({ rawExamples, settings }) => {
    if (!rawExamples?.length) return [];

    const compact = rawExamples
        .slice(0, MAX_EXAMPLES_PER_PASS)
        .map((e) => ({ title: e.title, content: e.content || '' }));

    try {
        const raw = await generateJson(
            exampleEnrichmentPrompt({ rawExamples: compact, settings }),
            { label: 'enrich-examples', maxTokens: 4096, temperature: 0.5 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.examples);
        return list
            .filter((e) => e && e.title)
            .map((e) => ({
                title: e.title,
                conceptExample: e.conceptExample || '',
                realWorldExample: e.realWorldExample || '',
                examExample: e.examExample || '',
                interviewExample: e.interviewExample || '',
            }));
    } catch (err) {
        console.error('enrichExamples failed:', err.message);
        return compact.map((e) => ({
            title: e.title,
            conceptExample: e.content,
            realWorldExample: '',
            examExample: '',
            interviewExample: '',
        }));
    }
};
