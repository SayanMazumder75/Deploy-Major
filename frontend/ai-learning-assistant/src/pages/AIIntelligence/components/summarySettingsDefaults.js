// Default settings for the AI Document Intelligence summary generator. Kept
// in its own file (not co-located with the SummarySettings component) so
// Vite's React Refresh doesn't trip on the non-component named export — the
// lint rule `react-refresh/only-export-components` is correct that exporting
// constants from a component file breaks fast-refresh in dev.
export const DEFAULT_SETTINGS = {
    studyGoal: 'quick_revision',
    summaryLength: 'auto',
    language: 'english',
    advancedOptions: {
        preserveFormulas: true,
        preserveDefinitions: true,
        explainDiagrams: false,
        includeToc: true,
        keepExamples: true,
    },
};
