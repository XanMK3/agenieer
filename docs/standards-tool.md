# Agenieer — Standards Tool

The `standards` tool establishes and maintains repository-owned engineering standards formatted for AI coding agents and human developers alike.

---

## 1. Detection Rules & Evidence

Detection is deterministic, offline, and dependency-first. A recognized dependency, configuration file, or source evidence is independently sufficient to select the corresponding standard.

| Technology | Inspected Signals | Notes |
|---|---|---|
| **JavaScript** | `.js` / `.jsx` / `.mjs` application files | Ignored in TypeScript projects if only config/tooling files (e.g. `vite.config.js`) exist |
| **TypeScript** | `typescript` dependency, `tsconfig*.json`, `*.ts` / `*.tsx` | Applied to both app and test files |
| **React** | React dependencies, imports, and reliable JSX/compiler integrations | JSX/TSX alone is framework-neutral; target evidence controls HTML inheritance |
| **HTML** | `.html` / `.htm` source files | No manifest required; does not imply CSS or a framework |
| **Vue** | Vue-specific dependencies, `.vue`, imports, and static integrations | Requires HTML; embedded script/style languages are detected |
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

All 14 templates are bundled statically with the CLI:

```text
templates/standards/
├── data-safety.md
├── javascript.md
├── typescript.md
├── html.md
├── vue.md
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
- `vue` -> requires `html`
- `react` -> requires `html` only for web/mixed rendering targets
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

## 5. HTML, Vue, and React Target Extension

### Recognition

Vue dependency signals include `vue`, `nuxt`, `@vitejs/plugin-vue`, `@vitejs/plugin-vue-jsx`, `vue-loader`, `vue-tsc`, `@vue/babel-plugin-jsx`, and Vue runtime packages. Imports from these packages and Vue JSX runtimes are recognized. Static Vue CLI/Nuxt configuration and Vite/Webpack/Babel Vue integrations also qualify. Generic Vite, `pinia`, and `vue-router` alone do not establish Vue.

React framework signals include `react`, `react-dom`, Next, Gatsby, Remix React/framework packages, React Router DOM/framework tooling, Vite React plugins, React Native, and React Native Web. Bare JSX/TSX remains language evidence only. Static `jsxImportSource`/Babel `importSource` distinguishes React, Vue, and Preact. React JSX runtime imports and default React compiler modes establish React without assuming a DOM renderer; an explicit alternative runtime suppresses that default inference. Configuration is inspected, never imported or executed.

| React evidence | Target | Automatic HTML |
|---|---|---|
| React or React JSX runtime only | unknown | No |
| React DOM, Next, Gatsby, recognized React web integration | web | Yes |
| React Native, including Expo with native integration | native | No |
| Both web and native signals, including React Native Web | mixed | Yes |

Independent HTML and Vue → HTML remain valid in every row. Native-style React Native Web components receive HTML guidance only where actual DOM semantics apply. `standards detect` reports platform evidence separately and labels inherited HTML as inherited, not independently detected.

### SFC languages

| Declaration | Selected language/style |
|---|---|
| `script`, `script setup` without `lang` | JavaScript |
| `script lang="ts"`, `script setup lang="ts"` | TypeScript |
| `style`, `style scoped` | CSS |
| `style lang="scss"` or `lang="sass"` | CSS |
| `template` | HTML through Vue |

Attributes support different orders, whitespace, and quote styles. Multiple complete blocks are inspected. JavaScript application scripts inside SFCs count alongside standalone sources; tooling JavaScript does not cause JavaScript selection in an otherwise TypeScript project. External `src` blocks use explicit language declarations or safely resolved local source extensions. Missing/remote sources without a language declaration do not establish one. Unsupported preprocessors do not introduce standards.

### Routing examples

- Vue template → Vue + HTML.
- Vue TypeScript composable or SFC script logic → Vue + TypeScript; HTML only when markup matters.
- Vue SFC style block → CSS plus applicable Vue rules.
- React web component markup → React + HTML + the relevant JavaScript/TypeScript standard.
- React Native component → React + the relevant language, without HTML by default.
- Standalone HTML → HTML.

Patterns indicate candidates. Inspect framework/task context in shared JSX/TSX files; generic component and hook directories do not establish ownership.

### Selection and lifecycle

Guided initialization offers HTML-only, Vue with JavaScript or TypeScript, and React with web/native/mixed/unknown target selection (unknown is the initial target choice). Styling/testing choices remain available; RTL is offered for React. Recognized stacks do not prompt.

Switching web React to native React deactivates HTML when no other signal requires it. Removing Vue deactivates Vue; HTML remains if web React or direct HTML still needs it. Existing files remain byte-for-byte intact and are reused on reactivation. Zero detection preserves usable existing routing. Bundled React template changes never replace existing generated/customized React standards.

### Inspection limits

The new framework/HTML/SFC scanner traverses at most 20 nested directory levels and 10,000 entries per scan, accepts at most 500 matching files, and skips directories with more than 2,000 entries. Traversal is sorted and does not follow directory/file symlinks. Content reads stop at 128 KiB plus a one-byte size check; oversized content contributes only filename evidence where applicable. External SFC reads stay within the target root and use the same byte limit.

Common exclusions cover dependencies, Git, generated build/coverage outputs, caches, vendor content, generated standards, bundled templates, fixtures/mocks, and documentation examples. Test source outside excluded fixtures remains eligible. HTML embedded in Markdown is not inspected.

Inspection is deliberately static and conservative: computed configuration, inherited compiler configuration, aliases, arbitrary template preprocessors, and unusual/malformed SFC syntax may not provide evidence. This is not a complete Vue/HTML parser, JSX AST analysis, or a full monorepo dependency graph. Existing language/styling/testing scans retain their established policies. No dependencies are installed and no target code executes.

### Template review

The HTML standard centralizes semantics, accessibility, forms, and raw HTML/URL safety; complete-document metadata is conditional on editing a full document. Form status notifications are distinguished from control-associated labels/errors. React keeps DOM component-boundary contracts and `dangerouslySetInnerHTML` specifics.

Vue guidance respects API style and version, allows framework naming exceptions, distinguishes Vue 3.5 reactive props destructuring and Vue 3.4 `defineModel`, and keeps SSR/optimizations conditional. Generic markup requirements live in HTML rather than being repeated in Vue or React.

Review references: [Vue props](https://vuejs.org/guide/components/props.html), [SFC APIs](https://vuejs.org/api/sfc-script-setup.html), [watchers](https://vuejs.org/guide/essentials/watchers.html), [computed values](https://vuejs.org/guide/essentials/computed.html), [essential style guide](https://vuejs.org/style-guide/rules-essential.html), [security](https://vuejs.org/guide/best-practices/security.html), [performance](https://vuejs.org/guide/best-practices/performance.html), [React DOM conventions](https://react.dev/reference/react-dom/components/common), [MDN HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements), and [WAI forms](https://www.w3.org/WAI/tutorials/forms/).
