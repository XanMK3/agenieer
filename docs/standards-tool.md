# Agenieer — Standards Tool

The `standards` tool establishes and maintains repository-owned engineering standards formatted for AI coding agents and human developers alike.

---

## 1. Detection Rules & Evidence

Detection is deterministic, offline, and dependency-first. A recognized dependency, configuration file, or source evidence is independently sufficient to select the corresponding standard.

| Technology | Inspected Signals | Notes |
|---|---|---|
| **JavaScript** | `.js` / `.jsx` / `.mjs` application files | Ignored in TypeScript projects if only config/tooling files (e.g. `vite.config.js`) exist |
| **TypeScript** | `typescript` dependency, `tsconfig*.json`, `*.ts` / `*.tsx` | Applied to both app and test files |
| **React** | `react` / `react-dom` in `package.json`, `*.tsx` / `*.jsx`, Babel presets | Does not imply TypeScript or RTL |
| **CSS** | `sass` / `sass-embedded` dependencies; `*.css`, `*.scss`, `*.sass` files; or supported CSS-derived styling tools | Sass/SCSS reuses `css.md`; no separate Sass technology or template |
| **Tailwind CSS** | `tailwindcss` dependency, `tailwind.config.*`, `@tailwind` directive | Complements `css.md` |
| **CSS Modules** | `*.module.css`, `*.module.scss`, `*.module.sass` source files | Complements `css.md` |
| **styled-components**| `styled-components` dependency, source imports | Complements `css.md` |
| **Testing (Shared)**| Any recognized test file, test directory, or runner | Base rules for all test suites |
| **Vitest** | `vitest` dependency, `vitest.config.*`, source imports | **Not** inferred solely from Vite |
| **Playwright Test** | `@playwright/test` dependency, `playwright.config.*`, imports | **Not** inferred solely from `playwright` browser package |
| **React Testing Library** | `@testing-library/react` dependency, source imports | **Not** inferred solely from React |
| **Unsupported Runners** | `jest`, `cypress` dependencies or config files | Reported explicitly; provides `testing.md` only |

---

## 2. Template Registry & Transitive Dependencies

All 12 templates are bundled statically with the CLI:

```text
templates/standards/
├── data-safety.md
├── javascript.md
├── typescript.md
├── react.md
├── css.md
├── tailwind.md
├── css-modules.md
├── styled-components.md
├── testing.md
└── testing/
    ├── vitest.md
    ├── playwright.md
    └── react-testing-library.md
```

### Transitive Requirements
- `javascript` -> requires `data-safety`
- `typescript` -> requires `data-safety`
- `tailwind` -> requires `css`
- `css-modules` -> requires `css`
- `styled-components` -> requires `css`
- `vitest` -> requires `testing`
- `playwright-test` -> requires `testing`
- `react-testing-library` -> requires `testing`

---

`requires` controls generated files, with transitive dependencies deduplicated in deterministic order. Applicability metadata controls when agents read them. Data Safety has contextual routing only: external or untrusted data; import/export or transformation; persistence and generated datasets; large inputs, downloads, uploads, or streams. Unrelated JS/TS tasks do not require it. It has no technology detector.

## 3. Managed Section Format

### Root `AGENTS.md`

```md
<!-- agenieer:standards:start -->
## Coding Standards

Before modifying source or test files:
1. Read `docs/standards/README.md`.
2. Identify the standards applicable to the files and technologies involved.
3. Read only those standards; multiple standards may apply together.
4. Do not load unrelated standards.
<!-- agenieer:standards:end -->
```

### `docs/standards/README.md`

Enclosed in `<!-- agenieer:routing:start -->` and `<!-- agenieer:routing:end -->`. Contains:
- Active standards table with relative markdown links
- Applicable file patterns per standard
- Composition examples (e.g. `Button.test.tsx` -> TypeScript + React + Testing + Vitest + RTL)
- Conflict resolution guidelines
- Unsupported framework notices (if applicable)

---

## 4. Documentation Lifecycle & Safety

- **Missing standards:** Created atomically from bundled templates.
- **Existing standards:** Skipped and preserved without alteration, allowing user customization.
- **Deactivation:** When a technology is no longer detected, its route in `docs/standards/README.md` is removed. Its Markdown file is never deleted.
- **Reactivation:** If the technology is detected again, routing is restored to the existing file.
- **Zero Detection:** If detection yields no supported technologies, existing managed routing is preserved rather than cleared.
- **Atomic Writes:** File updates are performed via temporary files and atomic renames to avoid truncation during unexpected interruptions.
- **Preflight:** Validates path containment and confirms all markdown links in the routing index resolve to existing or planned files before any write occurs.
