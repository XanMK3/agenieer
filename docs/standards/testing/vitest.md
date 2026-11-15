# Vitest

- Keep `vi.mock` at module scope: it is hoisted before imports. For typed module mocks, prefer `vi.mock(import('./module'))`; use `vi.hoisted` only when its factory needs hoisted state.
- Mock the narrowest dependency boundary possible; don't replace whole modules when a focused stub or dependency injection will do.
- Restore spies, mocked globals, and fake timers between tests. Prefer project-wide `restoreMocks` where appropriate; don't leak mock implementations across cases.
- Await asynchronous expectations (including `.rejects`/`.resolves`) so a test cannot pass before the check completes.
- Use the configured DOM environment for logic/DOM tests; do not treat jsdom or happy-dom results as proof of real browser layout or focus behavior. Use browser tests where those details matter.
- Check Browser Mode mocking limitations before assuming `vi.spyOn` works on ESM module exports there.
