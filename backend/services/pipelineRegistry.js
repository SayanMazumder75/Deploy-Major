// ─────────────────────────────────────────────────────────────────────────────
// pipelineRegistry
//
// In-process event bus + state snapshot store for the AI Document
// Intelligence pipeline. Keyed by `summaryId`, each entry tracks:
//   - the current stage list (id, label, status, progress)
//   - whether the pipeline is still running, completed, or failed
//   - a per-summary EventEmitter that SSE handlers subscribe to
//   - a TTL after completion so brief disconnects can still pick up the
//     final state before the entry is GC'd
//
// Why not Redis pub/sub or a Mongo change stream? Because at the volume
// we expect (a handful of concurrent generations per server), an in-memory
// registry is the right tradeoff: zero additional infrastructure, zero
// network hops between the orchestrator and the SSE handler, and the
// pipeline state is also persisted to the AISummary doc on completion —
// so an SSE client that reconnects after a server restart simply falls
// back to GET /api/ai-intelligence/:id for the final state.
//
// If we ever scale this horizontally (multiple Render instances handling
// the same user's requests), this is the one module that would need to
// swap in Redis pub/sub. The orchestrator + SSE handler talk to the
// registry through a small interface; the swap would be local.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';

// How long after pipeline completion to keep the entry alive in memory
// before GC'ing it. 60s gives SSE reconnects + delayed clients plenty of
// time to grab the final state.
const TTL_AFTER_COMPLETE_MS = 60_000;

// Cap how many event entries we keep per pipeline. The Processing Screen
// only needs the last N events to reconstruct progress; trimming prevents
// unbounded memory growth on freakishly long generations.
const MAX_LOG_SIZE = 200;

const _registry = new Map();

/**
 * Get or create the registry entry for `summaryId`. Returns an object with
 * an `.emit` method (used by the orchestrator) and a `.subscribe` method
 * (used by the SSE handler).
 */
const _acquire = (summaryId) => {
    let entry = _registry.get(summaryId);
    if (entry) return entry;

    entry = {
        summaryId,
        emitter: new EventEmitter(),
        status: 'idle', // 'idle' | 'running' | 'completed' | 'failed'
        startedAt: null,
        completedAt: null,
        // Compact ordered list of all events emitted so far. Late
        // subscribers replay these on connect.
        log: [],
        // Per-stage snapshot, also indexed by id for O(1) updates.
        stages: new Map(),
        cleanupTimer: null,
    };
    // Allow many SSE clients to listen without Node warning us about a leak.
    entry.emitter.setMaxListeners(50);
    _registry.set(summaryId, entry);
    return entry;
};

/** Internal helper: push to log + emit to subscribers. */
const _broadcast = (entry, event) => {
    entry.log.push(event);
    if (entry.log.length > MAX_LOG_SIZE) {
        entry.log.splice(0, entry.log.length - MAX_LOG_SIZE);
    }
    entry.emitter.emit('event', event);
};

const _scheduleCleanup = (entry) => {
    if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = setTimeout(() => {
        // Notify any still-attached subscribers that we're shutting the
        // bus down so they can close cleanly.
        entry.emitter.emit('done');
        entry.emitter.removeAllListeners();
        _registry.delete(entry.summaryId);
    }, TTL_AFTER_COMPLETE_MS);
};

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Begin a new pipeline. Resets any prior state for this summaryId so a
 * regeneration cleanly overwrites the previous run.
 *
 * @param {string} summaryId
 * @param {Array<{id:string,label:string}>} stagePlan
 * @returns {object} the registry entry
 */
export const beginPipeline = (summaryId, stagePlan = []) => {
    const entry = _acquire(summaryId);
    if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = null;
    }
    entry.status = 'running';
    entry.startedAt = new Date();
    entry.completedAt = null;
    entry.log = [];
    entry.stages = new Map();
    for (const s of stagePlan) {
        entry.stages.set(s.id, {
            id: s.id,
            label: s.label || s.id,
            status: 'pending',
            progress: 0,
            startedAt: null,
            completedAt: null,
            durationMs: 0,
            error: '',
        });
    }
    _broadcast(entry, {
        type: 'pipeline:start',
        stagePlan: stagePlan.map((s) => ({ id: s.id, label: s.label || s.id })),
        at: new Date().toISOString(),
    });
    return entry;
};

/** Mark a stage running. Idempotent — safe to call multiple times. */
export const startStage = (summaryId, stageId, label) => {
    const entry = _acquire(summaryId);
    const stage = entry.stages.get(stageId) || {
        id: stageId,
        label: label || stageId,
        status: 'pending',
        progress: 0,
        durationMs: 0,
        error: '',
    };
    stage.status = 'running';
    stage.startedAt = stage.startedAt || new Date();
    stage.progress = Math.max(stage.progress, 5); // visible "we've started"
    if (label) stage.label = label;
    entry.stages.set(stageId, stage);
    _broadcast(entry, {
        type: 'stage:start',
        stageId,
        label: stage.label,
        progress: stage.progress,
        at: new Date().toISOString(),
    });
};

/** Update incremental progress for a stage (0–100). */
export const updateStageProgress = (summaryId, stageId, progress, extra = {}) => {
    const entry = _acquire(summaryId);
    const stage = entry.stages.get(stageId);
    if (!stage) return;
    stage.progress = Math.min(100, Math.max(0, Math.round(progress)));
    entry.stages.set(stageId, stage);
    _broadcast(entry, {
        type: 'stage:progress',
        stageId,
        progress: stage.progress,
        ...extra,
        at: new Date().toISOString(),
    });
};

/** Mark a stage complete + emit any partial insights collected so far. */
export const completeStage = (summaryId, stageId, extra = {}) => {
    const entry = _acquire(summaryId);
    const stage = entry.stages.get(stageId);
    if (!stage) return;
    stage.status = 'completed';
    stage.progress = 100;
    stage.completedAt = new Date();
    stage.durationMs = stage.startedAt
        ? stage.completedAt - stage.startedAt
        : 0;
    entry.stages.set(stageId, stage);
    _broadcast(entry, {
        type: 'stage:complete',
        stageId,
        progress: 100,
        durationMs: stage.durationMs,
        ...extra,
        at: new Date().toISOString(),
    });
};

/** Mark a stage failed. The pipeline can still continue if downstream
 *  stages are independent (e.g. flashcards failing shouldn't block the
 *  summary itself). */
export const failStage = (summaryId, stageId, error) => {
    const entry = _acquire(summaryId);
    const stage = entry.stages.get(stageId);
    if (!stage) return;
    stage.status = 'failed';
    stage.completedAt = new Date();
    stage.durationMs = stage.startedAt
        ? stage.completedAt - stage.startedAt
        : 0;
    stage.error = error?.message || String(error || '');
    entry.stages.set(stageId, stage);
    _broadcast(entry, {
        type: 'stage:failed',
        stageId,
        error: stage.error,
        durationMs: stage.durationMs,
        at: new Date().toISOString(),
    });
};

/** Skip a stage entirely (e.g. user disabled preserveFormulas). */
export const skipStage = (summaryId, stageId, reason = '') => {
    const entry = _acquire(summaryId);
    const stage = entry.stages.get(stageId) || {
        id: stageId,
        label: stageId,
        status: 'pending',
        progress: 0,
        durationMs: 0,
        error: '',
    };
    stage.status = 'skipped';
    stage.progress = 100;
    entry.stages.set(stageId, stage);
    _broadcast(entry, {
        type: 'stage:skipped',
        stageId,
        reason,
        at: new Date().toISOString(),
    });
};

/** Push a partial-insights update (live counts shown on the side rail). */
export const publishInsights = (summaryId, insights) => {
    const entry = _acquire(summaryId);
    _broadcast(entry, {
        type: 'insights',
        insights,
        at: new Date().toISOString(),
    });
};

/** Mark the whole pipeline complete + schedule TTL cleanup. */
export const completePipeline = (summaryId, finalSnapshot = {}) => {
    const entry = _acquire(summaryId);
    entry.status = 'completed';
    entry.completedAt = new Date();
    _broadcast(entry, {
        type: 'pipeline:complete',
        ...finalSnapshot,
        at: entry.completedAt.toISOString(),
    });
    _scheduleCleanup(entry);
};

/** Mark the whole pipeline failed (catastrophic / unrecoverable). */
export const failPipeline = (summaryId, error) => {
    const entry = _acquire(summaryId);
    entry.status = 'failed';
    entry.completedAt = new Date();
    _broadcast(entry, {
        type: 'pipeline:failed',
        error: error?.message || String(error || ''),
        at: entry.completedAt.toISOString(),
    });
    _scheduleCleanup(entry);
};

/**
 * Subscribe to events for `summaryId`. Returns an unsubscribe function.
 * `onEvent` is called immediately with each event in the existing log
 * (snapshot replay), then live for every subsequent event.
 */
export const subscribe = (summaryId, onEvent) => {
    const entry = _acquire(summaryId);
    // Replay everything that's already happened so the UI can render the
    // full progress timeline without missing events.
    for (const ev of entry.log) onEvent(ev);

    const listener = (ev) => onEvent(ev);
    const doneListener = () => onEvent({ type: 'bus:closed', at: new Date().toISOString() });
    entry.emitter.on('event', listener);
    entry.emitter.once('done', doneListener);

    return () => {
        entry.emitter.off('event', listener);
        entry.emitter.off('done', doneListener);
    };
};

/** Snapshot the current state — used by the SSE handler when there's no
 *  active pipeline (e.g. user GETs progress after pipeline finished and
 *  TTL hasn't fired yet). Returns null if no entry exists. */
export const getSnapshot = (summaryId) => {
    const entry = _registry.get(summaryId);
    if (!entry) return null;
    return {
        summaryId,
        status: entry.status,
        startedAt: entry.startedAt,
        completedAt: entry.completedAt,
        stages: Array.from(entry.stages.values()),
        log: entry.log.slice(-50),
    };
};

/** Drop a registry entry immediately (used on summary deletion). */
export const dropPipeline = (summaryId) => {
    const entry = _registry.get(summaryId);
    if (!entry) return;
    if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
    entry.emitter.emit('done');
    entry.emitter.removeAllListeners();
    _registry.delete(summaryId);
};
