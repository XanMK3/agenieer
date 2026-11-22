import { describe, expect, it } from 'vitest';

// Executable examples of the coding contract, not Agenieer runtime features.
// These fixtures do not prove downstream code follows generated instructions.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Controlled API boundary: cancellation can either reject work or be ignored.
function operation(cancellable = false) {
  const result = deferred<string>();
  let signal: AbortSignal | undefined;
  let listeners = 0;
  return {
    ...result,
    get signal() { return signal; },
    get listeners() { return listeners; },
    async read(ownerSignal: AbortSignal) {
      signal = ownerSignal;
      const abort = () => result.reject(ownerSignal.reason);
      if (cancellable) {
        ownerSignal.throwIfAborted();
        ownerSignal.addEventListener('abort', abort, { once: true });
        listeners++;
      }
      try { return await result.promise; }
      finally {
        if (cancellable) {
          ownerSignal.removeEventListener('abort', abort);
          listeners--;
        }
      }
    },
  };
}

function owner() {
  let active: AbortController | undefined;
  let disposed = false;
  const state = { data: '', error: '', loading: false, progress: 0, completed: [] as string[] };
  const failures: unknown[] = [];
  return {
    state, failures,
    get activeSignal() { return active?.signal; },
    dispose() { disposed = true; active?.abort(); active = undefined; state.loading = false; },
    async start(io: ReturnType<typeof operation>, process = async (value: string, _signal: AbortSignal) => value) {
      if (disposed) throw new Error('Owner disposed');
      active?.abort();
      const controller = new AbortController();
      active = controller;
      state.loading = true;
      state.error = '';
      state.progress = 0;
      const current = () => !disposed && active === controller && !controller.signal.aborted;
      try {
        const input = await io.read(controller.signal);
        controller.signal.throwIfAborted();
        if (current()) state.progress = 50;
        const result = await process(input, controller.signal);
        controller.signal.throwIfAborted();
        if (current()) {
          state.data = result;
          state.progress = 100;
          state.completed.push(result);
        }
      } catch (error) {
        // This fixture's API rejects with the exact signal reason on cancellation.
        // Other APIs require their own documented cancellation classification.
        if (!(controller.signal.aborted && error === controller.signal.reason)) {
          failures.push(error);
          if (current()) state.error = error instanceof Error ? error.message : String(error);
        }
      } finally {
        if (active === controller) { active = undefined; state.loading = false; }
      }
    },
  };
}

describe('Executable asynchronous contract examples', () => {
  it('aborts slow A through the API and allows fast B alone to complete', async () => {
    const scope = owner(), a = operation(true), b = operation(true);
    const first = scope.start(a), second = scope.start(b);
    expect(a.signal?.aborted).toBe(true);
    expect(b.signal).toBe(scope.activeSignal);
    b.resolve('B');
    await Promise.all([first, second]);
    expect(scope.state).toEqual({ data: 'B', error: '', loading: false, progress: 100, completed: ['B'] });
    expect(a.listeners + b.listeners).toBe(0);
    expect(scope.failures).toEqual([]);
  });
  it('assigns loading to slow B after fast A completes', async () => {
    const scope = owner(), a = operation(), b = operation();
    const first = scope.start(a); a.resolve('A'); await first;
    const second = scope.start(b);
    expect(scope.state.loading).toBe(true);
    expect(scope.state.data).toBe('A');
    b.resolve('B'); await second;
    expect(scope.state.completed).toEqual(['A', 'B']);
  });
  it('distinguishes A1 from A2 even when business IDs match and APIs ignore abort', async () => {
    const scope = owner(), a1 = operation(), b = operation(), a2 = operation();
    const first = scope.start(a1), middle = scope.start(b), last = scope.start(a2);
    expect(a1.signal?.aborted).toBe(true);
    expect(b.signal?.aborted).toBe(true);
    a2.resolve('A'); await last;
    a1.resolve('obsolete A'); b.resolve('B'); await Promise.all([first, middle]);
    expect(scope.state.data).toBe('A');
    expect(scope.state.completed).toEqual(['A']);
    expect(scope.state.progress).toBe(100);
  });
  it('propagates signals into processing and blocks stale processing commits/finalizers', async () => {
    const scope = owner(), a = operation(), b = operation();
    const entered = deferred<AbortSignal>(), transformed = deferred<string>();
    const first = scope.start(a, async (_value, signal) => { entered.resolve(signal); return transformed.promise; });
    a.resolve('A');
    const signal = await entered.promise;
    expect(signal).toBe(a.signal);
    const second = scope.start(b);
    expect(signal.aborted).toBe(true);
    transformed.resolve('obsolete'); await first;
    expect(scope.state).toEqual({ data: '', error: '', loading: true, progress: 0, completed: [] });
    expect(scope.activeSignal).toBe(b.signal);
    b.resolve('B'); await second;
  });
  it('preserves unrelated stale failures without letting their catch/finally affect B', async () => {
    const scope = owner(), a = operation(), b = operation();
    const first = scope.start(a), second = scope.start(b);
    const error = new Error('Unrelated processing failure');
    a.reject(error); await first;
    expect(a.signal?.aborted).toBe(true);
    expect(scope.failures).toEqual([error]);
    expect(scope.state.error).toBe('');
    expect(scope.state.loading).toBe(true);
    expect(scope.activeSignal).toBe(b.signal);
    b.reject(new Error('Current failure')); await second;
    expect(scope.state.error).toBe('Current failure');
    expect(scope.state.loading).toBe(false);
  });
  it.each([true, false])('disposal aborts supported work and prevents late commits (cancellable=%s)', async (cancellable) => {
    const scope = owner(), a = operation(cancellable);
    const task = scope.start(a);
    scope.dispose();
    expect(a.signal?.aborted).toBe(true);
    a.resolve('late result'); await task;
    expect(scope.state).toEqual({ data: '', error: '', loading: false, progress: 0, completed: [] });
    expect(scope.activeSignal).toBeUndefined();
    expect(a.listeners).toBe(0);
  });
  it('keeps independent operation lifetimes independent', async () => {
    const left = owner(), right = owner(), a = operation(true), b = operation(true);
    const first = left.start(a), second = right.start(b);
    left.dispose();
    expect(b.signal?.aborted).toBe(false);
    b.resolve('B'); await Promise.all([first, second]);
    expect(right.state.data).toBe('B');
  });
  it('keeps shared work alive until its last consumer releases ownership', async () => {
    const controller = new AbortController(), io = operation(true);
    const shared = io.read(controller.signal);
    let consumers = 0;
    const acquire = () => {
      consumers++;
      let released = false;
      return { promise: shared, release() {
        if (released) return;
        released = true;
        if (--consumers === 0) controller.abort();
      } };
    };
    const a = acquire(), b = acquire();
    a.release(); a.release();
    expect(io.signal?.aborted).toBe(false);
    io.resolve('shared');
    expect(await b.promise).toBe('shared');
    b.release();
    expect(io.signal?.aborted).toBe(true);
    expect(io.listeners).toBe(0);
  });
  it('serializes ordering-sensitive writes and does not treat abort as rollback', async () => {
    let balance = 10;
    let queue = Promise.resolve();
    const firstStarted = deferred<void>(), releaseFirst = deferred<void>();
    const cancellation = new AbortController();
    const acceptedSignals: AbortSignal[] = [];
    const write = (amount: number, signal: AbortSignal, beforeCommit: () => Promise<void>) => {
      acceptedSignals.push(signal);
      const task = queue.then(async () => {
        const previous = balance;
        await beforeCommit();
        balance = previous + amount;
      });
      queue = task;
      return task;
    };
    // Simulated remote writes are accepted and cannot be rolled back by client abort.
    const first = write(5, cancellation.signal, async () => { firstStarted.resolve(); await releaseFirst.promise; });
    const second = write(-3, new AbortController().signal, async () => {});
    await firstStarted.promise;
    cancellation.abort(); releaseFirst.resolve();
    await Promise.all([first, second]);
    expect(acceptedSignals[0].aborted).toBe(true);
    expect(acceptedSignals[1].aborted).toBe(false);
    expect(balance).toBe(12);
  });
});
