// formulaService
//
// Enriches raw extracted formulas into rich formula cards. Each card has:
//   name, expression, variables, explanation, example,
//   examImportance, interviewImportance
//
// Skipped entirely when `advancedOptions.preserveFormulas === false`.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { formulaEnrichmentPrompt } from './shared/promptTemplates.js';

const MAX_FORMULAS_PER_PASS = 30;

const importanceOrDefault = (v) =>
    ['low', 'medium', 'high'].includes((v || '').toLowerCase())
        ? v.toLowerCase()
        : 'medium';

export const enrichFormulas = async ({ rawFormulas, settings }) => {
    if (!rawFormulas?.length) return [];

    const compact = rawFormulas.slice(0, MAX_FORMULAS_PER_PASS).map((f) => {
        // rawFormulas come from summaryService.mergeChunkResults where the
        // original {name, expression, variables, notes} object is preserved
        // under `.raw`. Use it directly when available so we don't have to
        // re-parse the prettified `.content` blob.
        const r = f.raw || {};
        return {
            name: r.name || f.title,
            expression: r.expression || '',
            variables: r.variables || '',
            notes: r.notes || f.content || '',
        };
    });

    try {
        const raw = await generateJson(
            formulaEnrichmentPrompt({ rawFormulas: compact, settings }),
            { label: 'enrich-formulas', maxTokens: 4096, temperature: 0.4 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.formulas);
        return list
            .filter((f) => f && (f.name || f.expression))
            .map((f) => ({
                name: f.name || '',
                expression: f.expression || '',
                variables: f.variables || '',
                explanation: f.explanation || '',
                example: f.example || '',
                examImportance: importanceOrDefault(f.examImportance),
                interviewImportance: importanceOrDefault(f.interviewImportance),
            }));
    } catch (err) {
        console.error('enrichFormulas failed:', err.message);
        return compact.map((f) => ({
            name: f.name,
            expression: f.expression,
            variables: f.variables,
            explanation: f.notes,
            example: '',
            examImportance: 'medium',
            interviewImportance: 'medium',
        }));
    }
};
