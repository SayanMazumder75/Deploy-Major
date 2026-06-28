// ─────────────────────────────────────────────────────────────────────────────
// services/concurrency
//
// V3: bounded parallelism for chunk extraction. The V2 orchestrator ran
// chunks sequentially (concurrency = 1), which was safe but slow for big
// PDFs. The V3 spec calls for a maximum of 3 concurrent AI requests
// (recommended 2) so the pipeline finishes ~2× faster on long docs without
// burning every provider's per-second rate limit.
//
// Why no p-limit dep: the implementation is tiny (≈15 lines of real logic),
// has zero edge cases we couldn't read in one sitting, and avoids adding
// another package to the dependency tree. The behaviour matches p-limit's
// semantics:
//   - At most `concurrency` callbacks are in flight at any time.
//   - Returned wrapper is `(fn) => Promise<result-of-fn>` so callers can
//     await each enqueued task individually.
//   - Tasks resolve in completion order, not submission order — caller is
//     responsible for any ordering they need (e.g. `await Promise.all`
//     over an array of `limit(() => …)` calls preserves the original
//     index in the result array).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a concurrency limiter.
 *
 * @param {number} concurrency  Max in-flight tasks. Sane values: 1–10.
 * @returns {<T>(fn: () => Promise<T>) => Promise<T>}
 */
export const pLimit = (concurrency) => {
    if (!Number.isFinite(concurrency) || concurrency < 1) {
        throw new TypeError(
            `pLimit: concurrency must be a positive number, got ${concurrency}`
        );
    }
    const queue = [];
    let active = 0;

    // Drain step — try to start as many queued tasks as our budget allows.
    // Recursive via `next()` calls inside finally handlers; the queue
    // shrinks monotonically so this is bounded.
    const next = () => {
        if (active >= concurrency || queue.length === 0) return;
        active += 1;
        const { fn, resolve, reject } = queue.shift();
        // Promise.resolve guards against synchronous throws from `fn` and
        // normalises non-promise return values to a settled promise.
        Promise.resolve()
            .then(fn)
            .then(resolve, reject)
            .finally(() => {
                active -= 1;
                next();
            });
    };

    return (fn) =>
        new Promise((resolve, reject) => {
            queue.push({ fn, resolve, reject });
            next();
        });
};

/**
 * Convenience helper for the common pattern "map this array of items
 * through an async function with bounded concurrency, preserving order".
 *
 * @template I, O
 * @param {I[]} items
 * @param {number} concurrency
 * @param {(item: I, index: number) => Promise<O>} fn
 * @returns {Promise<O[]>}
 */
export const mapWithConcurrency = async (items, concurrency, fn) => {
    const limit = pLimit(concurrency);
    return Promise.all(items.map((item, i) => limit(() => fn(item, i))));
};
