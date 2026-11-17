# Testing — Shared

- Test observable contracts and outcomes, not private state, implementation details, or the order of internal method calls.
- Make each test independent: own its fixtures/data and avoid reliance on execution order or mutable state left by other tests.
- Mock external boundaries where needed, but avoid mocking away the behavior whose correctness the test is supposed to establish.
- Cover meaningful failure paths and edge cases alongside the main success path; add regression coverage for reproduced bugs.
- Where relevant, test malformed inputs, valid falsy values, partial completion and recovery, and resource boundaries. Assert effects on existing data as well as error results; select boundary cases that matter to the behavior under test.
- Control time, randomness, and external data when they affect assertions. Avoid arbitrary sleeps and timing-dependent expectations.
- Prefer precise behavioral assertions over broad snapshots or incidental call-count checks; use snapshots only when the reviewed output is itself the contract.
