// definitionService
//
// Enriches raw extracted terms into rich definition cards. Each card has:
//   term, definition, simpleExplanation, analogy, importance,
//   examQuestion, interviewQuestion
//
// Skipped entirely when `advancedOptions.preserveDefinitions === false`.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { definitionEnrichmentPrompt } from './shared/promptTemplates.js';

// Soft cap to keep prompt size sane. If a document has more than this many
// unique definitions we'd chunk them — but in practice study materials
// rarely exceed this.
const MAX_DEFINITIONS_PER_PASS = 30;

/**
 * @param {Object} args
 * @param {Array<{title:string,content:string,raw?:Object}>} args.rawDefinitions
 *        Output of summaryService.mergeChunkResults().definitions.
 * @param {Object} args.settings
 * @returns {Promise<Array<{
 *   term:string,
 *   definition:string,
 *   simpleExplanation:string,
 *   analogy:string,
 *   importance:string,
 *   examQuestion:string,
 *   interviewQuestion:string
 * }>>}
 */
export const enrichDefinitions = async ({ rawDefinitions, settings }) => {
    if (!rawDefinitions?.length) return [];

    // Map back to the term/definition shape the model expects.
    const compact = rawDefinitions.slice(0, MAX_DEFINITIONS_PER_PASS).map((d) => ({
        term: d.title,
        definition: d.content || '',
    }));

    try {
        const raw = await generateJson(
            definitionEnrichmentPrompt({ rawDefinitions: compact, settings }),
            { label: 'enrich-definitions', maxTokens: 4096, temperature: 0.4 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.definitions);
        return list
            .filter((d) => d && d.term)
            .map((d) => ({
                term: d.term,
                definition: d.definition || '',
                simpleExplanation: d.simpleExplanation || '',
                analogy: d.analogy || '',
                importance: d.importance || '',
                examQuestion: d.examQuestion || '',
                interviewQuestion: d.interviewQuestion || '',
            }));
    } catch (err) {
        // Fallback: keep the raw definitions un-enriched. Better to ship a
        // shallow card than nothing at all.
        console.error('enrichDefinitions failed:', err.message);
        return compact.map((d) => ({
            term: d.term,
            definition: d.definition,
            simpleExplanation: '',
            analogy: '',
            importance: '',
            examQuestion: '',
            interviewQuestion: '',
        }));
    }
};
