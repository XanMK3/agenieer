# Asynchronous Concurrency

## Concurrency and Ownership

- Define the intended concurrency policy (latest-wins, parallel, serialized, deduplicated/shared, or transactional). Never assume completion order.
- Make operation ownership and lifetime explicit. Keep independent operations independent; do not cancel shared work needed by active consumers.

## Cancellation and Stale Results

- For superseded operations, use `AbortController`/`AbortSignal` to cancel supported work promptly and on owner disposal. Propagate the owner's signal through asynchronous layers; prefer cancellable APIs and existing library cancellation facilities.
- Cancellation may not stop underlying work. Check the signal after asynchronous boundaries and before observable effects; prevent obsolete operations from changing data, errors, loading, progress, completion, or newer-operation cleanup.
- Do not substitute request IDs, counters, or timestamps for cancelling obsolete work. Preserve operation identity independently of item identity.
- Treat expected cancellation separately from failures; an aborted signal alone does not establish that an error was caused by cancellation. Preserve real errors and prevent unhandled rejections.
- Release owned listeners, timers, subscriptions, readers, streams, and other resources on cancellation or disposal.

## Mutations and Consistency

- Aborting a mutation does not guarantee rollback. Protect concurrent writes using appropriate serialization, transactions, version checks, or idempotency controls.

## Verification

- Test out-of-order completion, repeated selections (A → B → A), cancellation during processing, stale errors/finalizers, disposal, and non-cancellable operations.
- Verify signal propagation, stale-state protection, and correct behavior of independent/shared operations using deterministic tests.
