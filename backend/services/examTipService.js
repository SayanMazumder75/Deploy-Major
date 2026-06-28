// examTipService
//
// Final polish on the de-duplicated exam tips list. The merge stage already
// gave us a clean list of strings; this service hands them to the model
// for ranking + light rewording (so tips read consistently in the user's
// chosen voice / language).
//
// If the polish pass fails we just return the raw tips — they're already
// usable.

import { generateJson } from '../providers/index.js';
import { safeParseJson, ensureArray } from './shared/jsonParser.js';
import { examTipsPrompt } from './shared/promptTemplates.js';

const MAX_TIPS = 25;

export const polishExamTips = async ({ rawTips, settings }) => {
    if (!rawTips?.length) return [];
    const trimmed = rawTips.slice(0, MAX_TIPS);
    try {
        const raw = await generateJson(
            examTipsPrompt({ rawTips: trimmed, settings }),
            { label: 'polish-exam-tips', maxTokens: 1024, temperature: 0.4 }
        );
        const parsed = safeParseJson(raw);
        const list = ensureArray(parsed?.tips)
            .filter((t) => typeof t === 'string' && t.trim())
            .slice(0, MAX_TIPS);
        return list.length ? list : trimmed;
    } catch (err) {
        console.error('polishExamTips failed:', err.message);
        return trimmed;
    }
};
