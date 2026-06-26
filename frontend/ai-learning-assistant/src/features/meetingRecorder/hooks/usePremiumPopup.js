import { useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// AI Meeting Recorder — Premium info popup state
// Single localStorage flag controls "show once" behaviour. The popup is purely
// informational — it never blocks access. Wrapping the show/hide logic in a
// hook keeps the trigger sites (sidebar, future header item) thin and
// consistent.
//
// Future-proofing notes:
//   • All authentication / Premium / subscription checks should be added here
//     (e.g. `if (user.isPremium) return navigate(target)`). For now the popup
//     itself is informational only and never blocks.
//   • To force the popup to show again (e.g. after rolling out new copy) call
//     `resetMeetingRecorderInfoShown()` from anywhere in the app, or simply
//     remove the storage key from the browser console.
// ─────────────────────────────────────────────────────────────────────────────

export const MEETING_RECORDER_INFO_SHOWN_KEY = "meetingRecorderInfoShown";

/** Returns true if the popup has been dismissed (Continue) at least once. */
export const hasSeenMeetingRecorderInfo = () => {
    try {
        return localStorage.getItem(MEETING_RECORDER_INFO_SHOWN_KEY) === "true";
    } catch {
        // Storage can throw in privacy modes — fail safe by treating it as
        // "not seen" so the user still gets the popup.
        return false;
    }
};

/** Marks the popup as dismissed. */
export const markMeetingRecorderInfoSeen = () => {
    try {
        localStorage.setItem(MEETING_RECORDER_INFO_SHOWN_KEY, "true");
    } catch {
        /* noop */
    }
};

/**
 * Clears the "seen" flag so the popup will display again on next click.
 * Exposed for future use (e.g. an admin/dev toggle, post-onboarding reset).
 */
export const resetMeetingRecorderInfoShown = () => {
    try {
        localStorage.removeItem(MEETING_RECORDER_INFO_SHOWN_KEY);
    } catch {
        /* noop */
    }
};

/**
 * Hook that owns "should the popup be open?" state and exposes:
 *   • isOpen          — boolean
 *   • requestOpen()   — open the popup if not previously dismissed; otherwise
 *                       invoke the optional `onSkip` callback (typically used
 *                       to navigate straight to the page).
 *   • forceOpen()     — open the popup regardless of the localStorage flag
 *                       (useful for an explicit "What is this?" entry point).
 *   • close()         — close the popup without marking it as seen.
 *   • dismiss()       — close the popup AND set the seen flag.
 */
export function usePremiumPopup() {
    const [isOpen, setIsOpen] = useState(false);

    const requestOpen = useCallback((onSkip) => {
        if (hasSeenMeetingRecorderInfo()) {
            if (typeof onSkip === "function") onSkip();
            return false;
        }
        setIsOpen(true);
        return true;
    }, []);

    const forceOpen = useCallback(() => setIsOpen(true), []);

    const close = useCallback(() => setIsOpen(false), []);

    const dismiss = useCallback(() => {
        markMeetingRecorderInfoSeen();
        setIsOpen(false);
    }, []);

    return { isOpen, requestOpen, forceOpen, close, dismiss };
}
