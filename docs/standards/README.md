<!-- agenieer:routing:start -->
# Engineering Standards — Index

> This index is managed by [Agenieer](https://github.com/XanMK3/agenieer).
> Unrelated content below this managed section is preserved.

## Active Standards

| Standard | When to Read |
|----------|-------------|
| [TypeScript](typescript.md) | TypeScript source files and application code |
| [Testing (Shared)](testing.md) | All test files, test helpers, and testing infrastructure |
| [Vitest](testing/vitest.md) | Vitest test suites and unit/component tests |

## Applicable File Patterns

- **[TypeScript](typescript.md)**: `**/*.ts`, `**/*.tsx`
- **[Testing (Shared)](testing.md)**: `**/*.test.ts`, `**/*.test.tsx`, `**/*.test.js`, `**/*.test.jsx`, `**/*.spec.ts`, `**/*.spec.tsx`, `**/*.spec.js`, `**/*.spec.jsx`, `**/__tests__/**/*`, `**/tests/**/*`
- **[Vitest](testing/vitest.md)**: `**/*.test.ts`, `**/*.test.tsx`, `**/*.test.js`, `**/*.spec.ts`, `**/*.spec.js`, `**/__tests__/**/*`

## Composition Examples

- `src/app.test.ts`: read **TypeScript** + **Testing**

## Conflict Resolution

Project-specific documented decisions supersede generic preferences in these standards,
but correctness, security, and accessibility requirements are not silently overridden.

<!-- agenieer:routing:end -->
