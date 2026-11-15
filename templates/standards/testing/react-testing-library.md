# React Testing Library

- Query by accessible role and name first; use labels for form controls, and `data-testid` only when a user-facing query is unsuitable.
- Render components through their public props and context; assert DOM behavior rather than inspecting component instances, internal state, or hook calls.
- In DOM-simulated RTL tests, use `userEvent.setup()` per test and await interactions; reserve `fireEvent` for low-level cases. In Vitest Browser Mode, follow its native browser interaction API instead.
- For async UI, prefer `findBy*` for appearance, `queryBy*` for absence, and `waitFor` for a repeating assertion. Do not trigger side effects inside a `waitFor` callback.
- Use `within(...)` to scope queries to meaningful regions or repeated items rather than relying on element order.
- Assert accessible states and user-visible outcomes (`disabled`, errors, focus, expanded state) instead of incidental CSS class names.
