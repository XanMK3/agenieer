# Agenieer — Product and Implementation Specification

**Status:** Approved v0.1 product requirements; implementation details noted separately  
**Last updated:** 2026-11-15 (non-destructive standards lifecycle revision)  
**Repository:** `XanMK3/agenieer` (planned)  
**Primary language/runtime:** TypeScript / Node.js  
**Distribution (v0.1):** Run directly from GitHub with `npx`; npm publishing is not required.

## 1. Product goal

**Agenieer** is an extensible command-line toolkit for agentic software engineering. Its tools help developers make repositories easier and safer for AI coding agents to work in, while keeping generated conventions useful to human engineers as well.

The **first tool**, `standards`, initializes a repository-owned, modular library of engineering and coding standards. It examines an existing or newly created project, detects relevant technologies, installs corresponding Markdown standards, generates a standards index, and integrates that index into the repository's root `AGENTS.md`.

Agenieer must be **deterministic, offline-capable once installed, safe to rerun, transparent about its decisions, and conservative with existing content**. In v0.1, Agenieer **never automatically deletes or overwrites standalone standards files**; it only creates missing standards and manages routing references within explicitly marked sections of `AGENTS.md` and `docs/standards/README.md`. The initial tool does **not** need AI model calls.

### Product positioning

- **Standards-first, not agent-configuration-first:** the core output is editable engineering documentation under `docs/standards/`, not just instructions embedded in one AI tool's configuration.
- **Composable standards:** language, framework, styling, and testing conventions apply together where relevant.
- **Repository ownership:** the target project owns and may customize the generated files; Agenieer is not a required runtime dependency.
- **Tool-agnostic integration:** root `AGENTS.md` serves as the first common entry point; other agent formats can be added later.

## 2. Scope and release priorities

### v0.1 — Required (P0)

1. A GitHub-hosted TypeScript/Node.js CLI named `agenieer`, implemented as one package with modular tool namespaces.
2. Commands `standards init` and `standards detect`.
3. Root-level `--cwd <path>` target-directory option; otherwise operate in the caller's current working directory.
4. Dependency-first technology detection from `package.json`, relevant configuration files, source filenames/extensions, and targeted import evidence. Any sufficiently strong recognized signal selects its technology, even if the dependency may be unused; detection evidence is reportable via `standards detect`.
5. Initial language/framework/styling template set: **JavaScript, TypeScript, React, plain CSS, Tailwind CSS, CSS Modules, styled-components**.
6. Initial testing template set: **general testing (`testing.md`), Vitest, Playwright Test, and React Testing Library**. All four templates are part of v0.1, but only relevant ones are generated for a given repository.
7. Detect testing infrastructure and test files using local dependency, configuration, filename/path, and (where practical) import evidence. Do **not** infer Vitest from Vite, React Testing Library from React, or Playwright Test solely from the `playwright` browser-automation package.
8. Composition of all applicable standards, including common testing rules plus runner-/utility-specific rules where relevant. Apply language rules to test files too; test classification is not restricted to `*.test.*`.
9. Static Markdown templates bundled with the CLI, with a registry mapping technologies to templates and dependencies.
10. Generation of `docs/standards/*.md`, `docs/standards/testing/*.md`, and `docs/standards/README.md` in the target repository, as applicable.
11. Creation or safe modification of root `AGENTS.md`, with a **small, stack-independent managed instruction** telling agents to read `docs/standards/README.md` and then only the applicable standards (including when editing tests). **Never concatenate standards content into `AGENTS.md`.**
12. **Selective standards routing (STD-ROUTING-001):** generate a lightweight `docs/standards/README.md` index with applicable file patterns and technology/usage contexts. The index must link to individual standards instead of embedding their bodies, and its links must resolve to existing files. Multiple standards can apply to the same task.
13. **Architectural separation:** the standards resolver selects documents, `generation/readme.ts` renders routing metadata, and `generation/agents.ts` emits only the fixed managed entrypoint. The AGENTS generator must never read or interpolate technology template bodies.
14. **Adaptive initialization:** when any supported technology is recognized, initialize automatically without questions. If none are detected, preserve existing usable managed routing when present; otherwise launch a short interactive stack selector. Do not require `package.json` or scaffold application code, and never prompt for review or file-conflict approval.
15. `--non-interactive` forbids prompts and exits with an informative operational error only when a stack choice is necessary but neither detection nor existing usable managed routing supplies one; `--yes` is **not** a v0.1 Agenieer flag. `--dry-run` shows the complete plan without writing.
16. **Managed documentation ownership:** create missing standards, **never overwrite or delete standalone standards** (whether generated or manually authored), patch only marked sections in existing `AGENTS.md` and standards `README.md`, and report malformed markers/conflicts without prompting.
17. **Obsolete-technology routing:** when a previously selected technology is no longer detected in a successful recognized-stack scan, remove its references **only from Agenieer-managed README routing**; retain its Markdown file unchanged. If no technologies are detected, do not infer that all existing routing is obsolete.
18. **Safe partial completion:** plan/preflight before writes; make permitted individual writes atomic where supported; create standards before references; update managed routing without deleting files. Report created/updated/skipped/conflicted files and activated/deactivated routes; return exit codes `0` (success), `1` (operational failure), `2` (unresolved conflicts).
19. Automated tests, including selective-routing invariants, empty-directory guided initialization, dependency-first detection, existing repositories, mixed styling/testing, idempotent reruns, technology deactivation/reactivation without deletion, and partial-failure behavior.
20. Executable directly via `npx github:XanMK3/agenieer standards init` once the public repository has valid npm CLI metadata and a working build.

### Later (P1/P2), **not** v0.1 promises

- `standards check` / `standards update`; version-aware updates and three-way merge of customized templates.
- Optional interactive overrides/review of a **recognized** stack; v0.1 already includes a guided selector when nothing is detected, but never prompts for partial detections.
- Rich detection diagnostics, verification/doctor commands, and expanded framework coverage (including other test runners/frameworks).
- Package-scoped policies and deeper monorepo/workspace support.
- Dedicated configurations for Cursor, Copilot, Claude Code, etc.; optional agent-skill generation/synchronization.
- Source AST analysis, AI-generated project-specific standards, extensive project-preference interviews, hook/CI installation, remote templates, a plugin platform, and independently released workspace packages.
- **Out of v0.1 testing scope:** Jest, Cypress, Mocha, Jasmine, MSW-specific rules, Storybook testing, separate unit/integration/component/E2E taxonomy templates, visual regression testing, and other specialized testing integrations. These are scope exclusions, **not** claims that Jest or Cypress are obsolete.
- A separate `verify` tool that executes tests, linters, or other checks. Defining test-writing standards is in scope; installing/configuring/running testing tools in the target repository is not.
- Future toolkit namespaces such as `agents`, `context`, `workflows`, and `guardrails` (names/features are illustrative).

## 3. Public CLI contract

Single executable, two-level command hierarchy:

```text
agenieer <tool> <action> [options]
```

### v0.1 commands

| Command | Purpose | Writes files? |
| --- | --- | --- |
| `agenieer standards detect` | Report technologies, relevant evidence, and selected standards | No |
| `agenieer standards init` | Auto-initialize a recognized stack; if none is detected, preserve existing managed routing or use guided stack selection for first initialization | Yes, when changes are needed |
| `agenieer standards init --dry-run` | Resolve the stack (guided if selection is needed), preview creates/patches/skips/conflicts and routing activations/deactivations | No |
| `agenieer standards init --non-interactive` | Never prompt; initialize detected stack, preserve usable prior routing, or fail if a stack must be selected | Yes, when changes are needed |
| `agenieer --cwd <path> standards init` | Target a directory other than `process.cwd()` | Yes |
| `agenieer --help` / `agenieer --version` | Standard CLI metadata | No |

`init` is a subcommand; the intended invocation is **`standards init`**, not `standards --init`. **Do not implement `--yes`** as an Agenieer flag; npm/npx's separate `--yes` option only controls npm's own install confirmation.

### Initialization interaction contract (approved)

- **At least one supported technology detected:** proceed automatically using every detected supported technology and its transitive template dependencies. Do not ask for selection, confirmation, or conflict resolution; users may review the resulting Git diff and remove redundant generated content before committing.
- **No supported technology detected and no existing usable managed routing, interactive terminal:** prompt using `@clack/prompts`, in this order: language (JavaScript / TypeScript; single select), framework (React / none; single select), styling (plain CSS, Tailwind, CSS Modules, styled-components; optional multiselect), testing (Vitest, Playwright Test, React Testing Library; optional multiselect, RTL relevant to React only). Include `css.md` for any CSS-based styling and `testing.md` for any selected testing tool. Then write without an extra confirmation prompt.
- **No supported technology detected but existing managed routing is present:** preserve existing active routing unchanged; do not treat an empty detection result as proof of technology removal. No stack-selection prompt is necessary unless initial selection is still needed.
- **No supported technology detected, no existing usable routing, and `--non-interactive` or no usable interactive TTY:** exit `1` with a clear message; do not guess defaults or write files. A partially recognized stack does **not** trigger prompts for missing dimensions.
- **Existing-file conflicts:** never prompt; skip unsafe actions, report conflicts, and continue independently safe operations. `--dry-run` performs detection and any required interactive selection, but writes nothing.
- Guided selections describe **intended** technologies for documentation only: no `package.json`, dependency installation, framework scaffolding, or application code is created.

### GitHub-only invocation

```bash
# From inside the target repository
npx github:XanMK3/agenieer standards init

# Preview first
npx github:XanMK3/agenieer standards init --dry-run

# Pin to a Git tag once available (recommended for reproducibility)
npx github:XanMK3/agenieer#v0.1.0 standards init
```

No GitHub Release, Git tag, or npm registry publication is required for first use from the default branch. A tag is recommended for stable usage; pinning a commit hash gives stronger immutability.

## 4. Repository architecture

**Architecture style:** a **modular monolith** — one executable/package, internal feature boundaries, and small shared infrastructure. **Do not** start with an npm workspaces monorepo or dynamic plugin loader.

```text
agenieer/
├── src/
│   ├── cli.ts                        # Executable entry point / command registry
│   ├── core/                         # Shared utilities used by multiple tools
│   │   ├── filesystem.ts
│   │   ├── project.ts                 # Resolve and validate target root
│   │   ├── logger.ts
│   │   └── change-plan.ts
│   └── tools/
│       └── standards/
│           ├── index.ts              # Register 'standards' CLI subcommands
│           ├── types.ts
│           ├── commands/
│           │   ├── init.ts
│           │   └── detect.ts
│           ├── detection/
│           │   ├── index.ts
│           │   ├── dependencies.ts
│           │   ├── config-files.ts
│           │   ├── source-files.ts
│           │   └── testing.ts          # Test files, runners and utilities
│           ├── resolver.ts           # Technologies -> template selection
│           └── generation/
│               ├── plan.ts           # Pure change planning
│               ├── standards.ts      # Plan standalone template installation
│               ├── readme.ts         # Generate link-only routing index from metadata
│               └── agents.ts         # Fixed, minimal AGENTS.md managed reference
├── templates/
│   └── standards/
│       ├── javascript.md
│       ├── typescript.md
│       ├── react.md
│       ├── css.md
│       ├── tailwind.md
│       ├── css-modules.md
│       ├── styled-components.md
│       ├── testing.md
│       └── testing/
│           ├── vitest.md
│           ├── playwright.md
│           └── react-testing-library.md
├── tests/
│   ├── standards/
│   └── fixtures/
│       ├── javascript/
│       ├── react-typescript/
│       ├── mixed-styling/
│       ├── vitest-react-testing-library/
│       ├── playwright-only/
│       ├── mixed-testing/
│       └── unsupported-test-runner/
├── docs/
│   ├── architecture.md
│   └── standards-tool.md
├── .github/workflows/ci.yml
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── vitest.config.ts
└── .gitignore
```

**Dependency rule:** `tools/*` may use `core/*`; `core/*` must not import feature-specific logic from `tools/*`. Each future tool registers its own commands through the root CLI, without introducing a separate package.

**Templates placement:** Markdown templates are static files outside TypeScript source. They must be included in the installable package, and paths must be resolved relative to the installed CLI/package, **not** to the target repository's current working directory.

## 5. Initialization pipeline

Keep analysis and planning separate from writing:

```text
Target repository
   -> Detect technologies and record evidence (no writes)
   -> If none found, retain existing managed routing if present; otherwise run guided stack selection (or fail in non-interactive mode)
   -> Resolve applicable standards/templates (including testing)
   -> Derive file-pattern + technology/usage routing metadata
   -> Determine test-file applicability from evidence
   -> Inspect existing output files and managed markers (no Git provenance required)
   -> Build and preflight a change plan (including routing activations/deactivations)
   -> Preview (or terminate when --dry-run)
   -> Create missing standalone standards atomically where supported; never replace existing ones
   -> Patch managed README routing and AGENTS.md reference
   -> Leave obsolete standalone standards on disk, inactive but available for reuse
   -> Report created/updated/skipped/conflicted files, routing changes and exit status
```

### Internal model (illustrative)

```ts
interface DetectedTechnology {
  id: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
  category?: 'language' | 'framework' | 'styling' | 'test-runner' | 'testing-utility';
  applicablePatterns?: string[]; // Only when supported by reliable evidence
}

type ChangeAction = 'create' | 'skip' | 'patch' | 'conflict';

interface PlannedChange {
  path: string;                 // relative to target repository root
  action: ChangeAction;
  reason: string;
  content?: string;             // populated for create/patch actions
}
```

The detector and resolver should be side-effect-free. The planner should be testable independently, and the writer should apply only the plan's permitted modifications. Preflight validates the complete plan, including routing references, path safety and managed-region syntax, before any write. Output order must be stable to enable reliable reruns and tests. A conflict in one file does not prevent unrelated safe operations; an unexpected operational error stops execution.

**Selective-loading boundary:** the resolver returns document identifiers and applicability metadata, not a single concatenated rules string. The README generator consumes those identifiers and routing metadata. The `AGENTS.md` generator consumes only its own fixed pointer text and managed-section boundaries; it must **not** accept, import, or interpolate the bodies of the selected Markdown templates. Individual standard bodies are accessed only by the standards-file installation path.

## 6. Technology and testing detection rules

Detection is deterministic and **dependency-first**. A recognized dependency, a technology-specific configuration, or reliable source/import evidence is independently sufficient to select the applicable template; additional corroboration is not required. A stale/unused dependency may therefore yield redundant documentation, which is an accepted trade-off. Prefer available local evidence; do not execute target repository configuration files or install project dependencies. Exclude generated `docs/standards/` and Agenieer metadata from technology detection so prior output cannot cause self-reinforcing detections.

| Technology | Evidence to inspect |
| --- | --- |
| JavaScript | `.js` / `.jsx` source files; JS-based project without TS use |
| TypeScript | `typescript` dependency, `tsconfig*.json`, `.ts` / `.tsx` source files |
| React | `react` / `react-dom` dependencies, relevant React framework/config evidence, JSX/TSX use in context |
| CSS | CSS source files, frontend styling setup, or use of supported CSS-based styling technologies |
| Tailwind CSS | `tailwindcss` dependency; Tailwind integration packages, config files, or relevant CSS usage (including modern CSS-first setups) |
| CSS Modules | `*.module.css` files (and optionally related module-style extensions later) |
| styled-components | `styled-components` dependency and/or imports in source files |
| Generic testing | Supported test files/dirs or detectable testing dependencies/configuration, including unsupported runners |
| Vitest | `vitest` dependency, Vitest configuration/setup, or Vitest imports; a Vite dependency **alone is insufficient** |
| Playwright Test | `@playwright/test` or `playwright/test` use, `playwright.config.*` or reliable Playwright Test imports; `playwright` alone may only be automation |
| React Testing Library | `@testing-library/react` dependency or imports; React alone is insufficient |

### Resolution policies

- Select **TypeScript** conventions when TS is actually used; select **JavaScript** conventions for JS-based projects. In genuinely mixed JS/TS codebases, both may apply. Avoid selecting JavaScript merely because ordinary JS tooling/config files exist alongside a TS application.
- Select React standards in addition to the relevant language standard; `.tsx` code generally needs **TypeScript + React** conventions.
- Include shared `css.md` whenever CSS or a CSS-derived styling method is detected. A frontend repository with multiple styling approaches should receive **all** applicable templates.
- Tailwind, CSS Modules, and styled-components rules complement rather than replace CSS standards.
- Presence of a dependency is evidence of tooling, **not proof of the team's preferred architectural or stylistic decisions**. Generated templates must avoid imposing choices that cannot be inferred safely.
- Ignore irrelevant/vendor/generated directories (`node_modules`, `.git`, build output, coverage, caches) and bound scans for performance.
- Record specific evidence for each selection and display it with `standards detect`; do not infer undocumented preferences from dependencies. If **nothing** is recognized, retain existing usable managed routing when present; otherwise use the interactive fallback in §3 (or exit `1` non-interactively). If **anything** is recognized, proceed without asking about missing or ambiguous technology dimensions.
- A detected test runner is not equivalent to a test *type*. Do not infer unit/integration/E2E categories solely from `.test` or `.spec` suffixes.

### Test-file discovery and applicability (v0.1)

- Identify conventional test files such as `*.test.ts`, `*.test.tsx`, `*.test.js`, `*.spec.ts`, `*.spec.tsx`, and related JS/TS variants, plus conventional `__tests__/` or `tests/` locations. Also inspect supported runner configuration (for example, Playwright's `testDir`/`testMatch`) when it can be read safely and statically. Do **not** assume every `.spec.ts` file is Playwright.
- Generate `testing.md` if tests, test configuration, or testing infrastructure are detected, **including repositories using unsupported frameworks**. Do not generate it solely because Vite or React is installed.
- Generate `testing/vitest.md` only for detected Vitest use; generate `testing/playwright.md` only for detected **Playwright Test** use; generate `testing/react-testing-library.md` only for detected React Testing Library use. Multiple testing standards can coexist.
- Apply language conventions **plus** `testing.md` to relevant test files. Layer on runner/utility-specific rules only where their use is supported by evidence. For example, `Button.test.tsx` using Vitest and React Testing Library receives TypeScript + React (when relevant) + testing + Vitest + React Testing Library; `tests/e2e/login.spec.ts` using Playwright Test receives TypeScript + testing + Playwright.
- Some frameworks (e.g., Jest or Cypress) may be discoverable as **unsupported evidence**, even though v0.1 supplies no framework-specific template. Report them clearly; install only `testing.md` when appropriate and **never silently substitute** Vitest or Playwright standards. Framework detection for unsupported libraries can be lightweight and need not have dedicated modules/templates.
- Project-specific configuration or scoped imports may be needed to disambiguate suites. If confident file-level classification is unavailable, the README must route by known framework/usage evidence rather than invent precise globs.
- Unit, integration, component, and E2E are useful concepts, but v0.1 does **not** generate a separate standard for each test category. Shared quality guidance belongs in `testing.md`, while tooling-specific guidance belongs in corresponding testing templates.

### Required testing template content

- **`testing.md` (general):** purpose-driven test names, observable-behavior assertions, deterministic/isolation principles, appropriate test data and fixtures, avoiding unnecessary mocks, meaningful error/edge-case coverage, stable async behavior, and guidelines for test maintenance. Applies to all identified tests, including unsupported-framework tests.
- **`testing/vitest.md`:** Vitest-specific `vi` APIs, mock restoration and module mocking, timers, asynchronous assertions, setup conventions, and isolation practices. Avoid duplicating general test guidance.
- **`testing/playwright.md`:** Playwright Test fixtures, browser contexts, resilient role/label/test-id locators, auto-waiting assertions, network/authentication isolation, and avoidance of fixed sleeps. Scope to Playwright Test suites, not arbitrary `playwright` browser-automation scripts.
- **`testing/react-testing-library.md`:** accessible user-centric queries, `userEvent` interaction, appropriate async queries, and discouraging assertions against React implementation details. Apply only when React Testing Library is actually used.

Templates are prescriptive about **safe, broadly applicable practices**, not undocumented project-specific choices (such as mandating a particular test directory layout or coverage percentage). They must not introduce incompatible APIs or recommendations for an unrecognized framework version.

### Template registry (illustrative)

```ts
const templates = {
  javascript: { file: 'javascript.md', requires: [] },
  typescript: { file: 'typescript.md', requires: [] },
  react: { file: 'react.md', requires: [] },
  css: { file: 'css.md', requires: [] },
  tailwind: { file: 'tailwind.md', requires: ['css'] },
  'css-modules': { file: 'css-modules.md', requires: ['css'] },
  'styled-components': { file: 'styled-components.md', requires: ['css'] },
  testing: { file: 'testing.md', requires: [] },
  vitest: { file: 'testing/vitest.md', requires: ['testing'] },
  'playwright-test': { file: 'testing/playwright.md', requires: ['testing'] },
  'react-testing-library': { file: 'testing/react-testing-library.md', requires: ['testing'] },
} as const;
```

React should not automatically force TypeScript; the target repo's actual language evidence determines JS/TS selection. Likewise, Vite does not automatically imply Vitest, React does not imply React Testing Library, and browser automation does not automatically imply Playwright Test. When no evidence is available on a first initialization, guided selection supplies an intended stack without requiring a manifest. On a subsequent run with no recognized technologies but existing managed routing, preserve that routing rather than clearing it. No `.agenieer.json` file is required for v0.1.

## 7. Generated files and documentation ownership

For a React + TypeScript + Tailwind + CSS Modules repository that also uses Vitest, React Testing Library, and Playwright Test:

```text
<target-repository>/
├── AGENTS.md
└── docs/
    └── standards/
        ├── README.md
        ├── typescript.md
        ├── react.md
        ├── css.md
        ├── tailwind.md
        ├── css-modules.md
        ├── testing.md
        └── testing/
            ├── vitest.md
            ├── playwright.md
            └── react-testing-library.md
```

### Standards documents

- Each detected supported technology gets one standalone, human-readable Markdown file. Testing consists of a shared `testing.md` plus only the relevant testing-technology files.
- Templates emphasize actionable conventions, examples, clear ownership boundaries, and verification guidance.
- Keep common principles centralized; technology files should refine them rather than duplicate contradictory rules.
- The files are **owned by the target repository** and may be edited by its developers. Subsequent `init` runs **never overwrite or delete** standalone standards, including obsolete or customized documents. When a technology is later detected again, reuse its existing file and restore its routing.
- Do not alter source code, `package.json`, linter configuration, scripts, hooks, or CI in v0.1.

### STD-ROUTING-001 — Selective standards loading (P0)

**Agenieer MUST keep the entrypoint and index concise.** Standards are independent, editable documents; neither the root `AGENTS.md` nor the index may contain concatenated template bodies. At generation time this is an **enforceable output invariant**. At agent execution time, selective reading is an **instruction**, not a guarantee that every coding assistant will comply.

**`docs/standards/README.md` — generated routing index**

- Link **only to active, selected standards that are present or guaranteed by successful planned creation**; validate every generated relative link. Preserve unrelated manually written README content. Remove obsolete technologies from Agenieer-managed routing after a successful recognized-stack detection, **without deleting their files**. If detection yields no supported technologies, retain previously managed routing instead of clearing it.
- For every linked standard, state **when to read it** using grounded file patterns and/or technology/usage context; allow several standards to apply to one file or task. Do not publish raw template content here.
- Routing examples: `*.ts`/`*.tsx` → TypeScript; React components/hooks → React; CSS files or CSS-related styling work → CSS; Tailwind utility usage → Tailwind; `.module.css` → CSS Modules; identified tests → general testing; Vitest / Playwright Test / React Testing Library → their respective suite or usage evidence.
- Do **not** treat file suffixes as definitive for semantic use: not every `.tsx` is React, not every `.spec.ts` is Playwright, and a repository-level dependency does not prove every test uses that framework. When a rule cannot be reliably scoped, instruct the agent to inspect imports/configuration or the relevant feature area before loading a framework-specific document.
- Describe composition, e.g. `Button.test.tsx` using Vitest + React Testing Library may require TypeScript + React + Testing + Vitest + React Testing Library. Do not automatically read Playwright or other unrelated standards.
- Include a short conflict rule: project-specific documented decisions supersede generic preferences, but correctness/security/accessibility requirements are not silently overridden.
- Maintain the generated index in its own stable managed section so unrelated hand-written content survives reruns. Changes in detected technologies update the index, not the root `AGENTS.md` pointer.

**Root `AGENTS.md` — fixed managed entrypoint**

If missing, create a minimal instructions file. If present, preserve unrelated content and insert or patch only Agenieer's managed section. The section's content is **independent of the detected stack and number of installed templates**:

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

Do not insert the bodies of `typescript.md`, `react.md`, `testing.md`, or any other standards into `AGENTS.md`. Do not add technology-specific rule lists to the managed section. Avoid duplicate blocks and equivalent references across reruns. These routing instructions do not make referenced files automatically loaded by every agent; they explicitly ask compatible agents to read them.

**Generator contract**

- `resolver.ts`: select standards and expose applicability metadata (file patterns and contextual predicates).
- `generation/standards.ts`: copy selected full Markdown template bodies into missing standalone repository files; preserve all existing standard bodies regardless of active/inactive status. Never plan deletion or replacement of standards files.
- `generation/readme.ts`: render only titles, file links, scope descriptions, composition/conflict guidance, and managed markers from registry metadata and confirmed on-disk/planned outputs.
- `generation/agents.ts`: render only fixed, short entrypoint instructions and its markers. This module MUST NOT read/import or accept the full bodies of standards templates.
- `generation/plan.ts`: preflight create/skip/patch/conflict actions, manage marker safety, and compute managed routing activations/deactivations; references must target only files confirmed to exist after applying allowed operations. No Git status or file-provenance tracking is required.

## 8. Safety, idempotency, routing lifecycle and failure semantics

### Documentation ownership and managed regions (approved)

| Condition | Required v0.1 behavior |
| --- | --- |
| Selected standard missing | Create it from the bundled template |
| Selected standard already exists | Preserve its contents without overwriting, even when customized |
| `AGENTS.md` missing | Create the minimal fixed routing entrypoint |
| `AGENTS.md` exists | Preserve all unrelated content; append or update only the `<!-- agenieer:standards:start/end -->` managed region |
| Standards `README.md` missing | Create a concise index of active applicable standards |
| Standards `README.md` exists | Preserve unrelated content; append/update only the Agenieer-managed routing region |
| Managed section markers malformed, duplicated, or ambiguous | Do not modify that file; report a conflict without prompting |
| Supported technology added | Create its missing standard and activate corresponding managed routing |
| Supported technology no longer detected in a successful recognized-stack scan | **Deactivate only its managed routing entry; preserve its Markdown file** |
| Previously inactive technology detected again | Reactivate routing to the existing file without replacing its contents |
| No supported technologies detected, prior managed routing exists | Preserve managed routing; do not infer removal from an empty detection result or prompt for a new stack unnecessarily |
| Repeated run with identical repo | No duplicated markers, unnecessary writes, or changed outputs |
| Unsupported testing framework present | Report evidence and provide generic testing guidance if warranted; never substitute another runner's template |
| `--dry-run` | Preview creates, patches, skips, conflicts, and routing activations/deactivations with **zero filesystem changes** |

Existing unmarked `AGENTS.md` and README files receive a new, delimited managed region; no interactive permission request is required. Subsequent runs may replace **only** the contents between well-formed markers. Existing standalone standards are never overwritten just because bundled templates change; version-aware template merging remains outside v0.1.

### Non-destructive standards lifecycle (revised decision, 2026-11-15)

- Agenieer v0.1 **MUST NOT delete or overwrite any standalone standards file**, regardless of whether it generated the file or a developer created/edited it.
- Technology detection controls **routing activity**, not file ownership: a successful recognized-stack detection activates selected technologies and deactivates unsupported/obsolete selections in **Agenieer's managed README section only**.
- Unused standard files remain on disk and are considered inactive when absent from managed routing; this is intentional and not a conflict. Agenieer does not alter manual README text outside its managed section.
- When a technology is detected again, its existing standard file is reused verbatim, and the managed README route is restored.
- No `.agenieer.json` manifest, content hashes, Git tracking/status checks, or provenance records are necessary for v0.1. Such metadata may be considered later for explicit template updates or drift detection.
- A **zero-technology detection result** must not erase previously selected manual routing. If existing managed routing is usable, preserve it. If no prior usable routing exists, use the guided selector (or fail when a non-interactive selection is required).
- An incomplete or failed scan must never be used to deactivate existing routing. A recognized-stack scan must complete successfully before reconciling routes.

### Planning, atomicity and partial completion (approved)

1. Build and **preflight the complete plan** before making changes: resolve file locations, check marker syntax, validate future links, and reject out-of-root/symlink escape paths. A preflight conflict may be reported per file while independent safe actions proceed.
2. Write new/updated content through a temporary file in the target directory and atomically rename/replace it **where supported**, so an interrupted write does not truncate an existing document. Do not promise a transaction spanning the entire repository.
3. **Create missing applicable standards first**, update the managed standards README once its links can be satisfied, and ensure the fixed `AGENTS.md` reference points only to an available index. **Do not delete or replace standalone standards.**
4. If a single operation conflicts with existing content, skip that operation and continue other independent safe work. If an unexpected operational error occurs (filesystem failure, invalid state or potential data loss), **stop** and report what succeeded and what remains; do not claim a successful full initialization.
5. An interrupted or partially successful run must be safely **rerunnable**. Never claim a rollback mechanism or a completely all-or-nothing outcome.

### Exit codes and reporting (approved)

| Exit code | Meaning |
| --- | --- |
| `0` | Completed without errors or unresolved conflicts (nonblocking warnings are allowed) |
| `1` | Operational failure, including an unavailable required interactive selection in `--non-interactive`/non-TTY mode |
| `2` | Safe operations completed but unresolved conflicts remain |

Report detected technologies/evidence when relevant and a deterministic summary of **created, updated, skipped, and conflicted** files, plus **activated/deactivated routing entries**. Include the reasons for warnings and conflicts. For `--dry-run`, use the same status meanings for the planned outcome, but perform no writes. An operational error takes precedence over conflict status.

### Additional safety constraints

- Restrict generated paths to the validated target root; refuse path traversal and risky symlink targets.
- Read only necessary repository files. Do not execute target-project scripts/configuration or install dependencies.
- Keep all filesystem mutations confined to root `AGENTS.md` and `docs/standards/`; no provenance manifest is generated in v0.1.
- Never create references to unavailable files or concatenate standard bodies into the routing index or `AGENTS.md`.
- Do not claim a file was written, routed, checked, or tested unless the operation actually completed.
- `standards init` never installs, configures, migrates, or executes target-project testing tools; its own Vitest tests are a development concern.

**Template updates** remain separate from initialization. A future `standards update` must account for user customizations; v0.1 `init` does not silently refresh the contents of standards that remain applicable.

## 9. Implementation technology and packaging

### Preferred stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript with strict checking |
| Runtime | Node.js (initial package baseline: Node 22+) |
| CLI parsing | Commander |
| Guided stack selection when no stack is detected and no usable routing exists | `@clack/prompts` (single select and multiselect) |
| File I/O | `node:fs/promises` |
| Discovery | `fast-glob` or equivalent bounded matching |
| Testing | Vitest |
| Build | tsup / esbuild-based bundle |
| Distribution | GitHub npm package spec via `npx`; optional npm publication later |

Start with static dependency/config/filename/import inspection. Use `@clack/prompts` only when neither detected technology evidence nor usable existing managed routing can establish a stack. Avoid AST parsing, dynamic plugins, remote template registries, and AI calls for v0.1.

### Minimum package metadata (illustrative, not pinned dependency versions)

```json
{
  "name": "agenieer",
  "version": "0.1.0",
  "type": "module",
  "bin": { "agenieer": "./dist/cli.js" },
  "files": ["dist", "templates"],
  "scripts": {
    "build": "tsup src/cli.ts --format esm --out-dir dist",
    "prepare": "npm run build",
    "test": "vitest run"
  },
  "engines": { "node": ">=22" }
}
```

Add real runtime and development dependencies (e.g., Commander, TypeScript, tsup, Vitest) when implementing. Commit a lockfile. The executable source must start with `#!/usr/bin/env node`, and **the built `dist/cli.js` must retain a functioning shebang**. Ensure templates are included and resolved correctly after packaging.

**Why `prepare`?** A GitHub installation can build the TypeScript source before invoking the executable, so committing compiled `dist/` is optional. This requires valid build dependencies and scripts; perform an end-to-end GitHub install test before considering distribution complete.

### Verification before pushing

```bash
npm install
npm run build
node dist/cli.js --help
npm test
npm pack --dry-run   # Confirm dist and templates are packaged
```

### Verification after pushing

From an unrelated fixture/test repository, run:

```bash
npx github:XanMK3/agenieer standards detect
npx github:XanMK3/agenieer standards init --dry-run
npx github:XanMK3/agenieer standards init
```

GitHub alone is enough: publishing to npm, creating a GitHub Release, or tagging a release is **not** required to run from the repository's default branch. Network access, Git, a compatible Node/npm environment, and access to the repository are required. If needed, explicitly choose the executable:

```bash
npm exec --yes --package=github:XanMK3/agenieer -- agenieer standards init
```

## 10. Test plan and acceptance criteria

### Core acceptance scenarios

1. **JS-only repository:** generates `javascript.md` (plus `css.md` if frontend styling is present), a valid index, and an `AGENTS.md` reference.
2. **React + TypeScript repository:** generates `typescript.md`, `react.md`, and applicable CSS standards; does not add irrelevant JavaScript rules solely due to tool config files.
3. **Mixed styling repository:** React + TS + Tailwind + CSS Modules + styled-components yields all corresponding styling documents **plus** shared CSS standards.
4. **Playwright-only tests:** Vite + Playwright Test generates `testing.md` and `testing/playwright.md`, but **not** Vitest or React Testing Library merely because Vite/React is present.
5. **Vitest + React Testing Library:** React + TS + Vitest + React Testing Library generates `testing.md`, `testing/vitest.md`, and `testing/react-testing-library.md`, alongside language/framework standards.
6. **Mixed test suites:** Vitest + React Testing Library + Playwright Test generates all three specific testing templates plus shared `testing.md`, with clear applicability guidance for component vs browser tests.
7. **Test patterns:** `.test.*`, `.spec.*`, `__tests__/`, and supported config-defined test locations are recognized conservatively; filenames alone do not falsely identify a runner.
8. **Unsupported runners:** a Jest/Cypress repository receives generic `testing.md` when testing evidence exists, plus an explicit unsupported-technology notice, **without** installing or substituting Jest/Cypress-specific standards.
9. **No tests detected:** Vite/React without testing evidence does not produce testing templates by default.
10. **Existing `AGENTS.md`:** unrelated content remains byte-for-byte intact except for the intended managed insertion/replacement.
11. **Existing customized standard:** remains untouched after `init`, whether active or inactive; a removed technology loses only its managed routing entry.
12. **Repeated `init`:** second run yields no duplicate blocks or unnecessary writes.
13. **Technology added or removed:** missing standards are created and routed; when a technology is no longer detected, only its managed routing is deactivated and its file remains untouched. If detected again, restore its route and reuse the same content.
14. **Dry run:** accurate create/skip/patch/conflict and route-activation/deactivation preview, with zero filesystem changes; guided selection may still occur when no usable prior routing or detectable stack exists.
15. **Detect command:** emits grounded technology findings; never writes.
16. **Error paths:** malformed/unreadable project config, unsafe symlinks, permission errors, unsupported project layouts, and malformed managed markers fail safely or degrade conservatively without unsafe writes.
17. **GitHub execution:** a clean machine/fixture with Node/npm/Git can run the public-repo command without publishing to npm, and packaged templates load correctly.
18. **Small AGENTS.md invariant:** a repo with three standards and a repo with eleven standards receive the same managed AGENTS.md section; it contains only the fixed router, never individual standard bodies.
19. **Selective README routing:** managed index links point only to active standards available after allowed writes; each link carries a meaningful file-pattern or usage scope, and no full template body is copied into the index.
20. **Stack changes:** adding Tailwind or a testing framework updates the index and adds its standalone document without changing the fixed AGENTS.md managed block.
21. **Multi-standard applicability:** routing explains how TypeScript + React + Tailwind or TypeScript + Testing + Vitest + React Testing Library combine for an appropriate file/task, without loading unrelated Playwright guidance.
22. **Ambiguous test suite:** `.spec.ts` alone does not force Playwright routing; the index directs agents to inspect imports or test config where context is inconclusive.
23. **Routing idempotency and preservation:** a second `init` does not duplicate links/managed markers, and pre-existing text outside managed regions remains unchanged.
24. **Generator separation:** unit tests prove `generation/agents.ts` has no standard-template-body inputs; template additions or wording changes do not change the managed AGENTS.md section.
25. **Empty directory:** `standards init` invokes the four-step `@clack/prompts` selector and generates only docs and agent instructions, without creating a `package.json` or source code.
26. **Automatic partial detection:** recognizing TypeScript alone is sufficient for fully automatic, question-free initialization; no CSS/framework/test questions appear.
27. **Non-interactive unknown stack:** `standards init --non-interactive` exits `1` with a useful message and no changes when no supported technology is recognized **and no usable prior managed routing exists**; existing initialized routing is preserved without a prompt.
28. **Automatic multi-detection:** an installed but unused supported dependency can select an extra template; users may remove unwanted generated documents during Git review.
29. **Managed documents:** pre-existing unmarked `AGENTS.md` and README text stays intact, reruns patch only valid managed regions, and malformed markers are reported as conflicts with safe independent work continuing.
30. **Non-destructive deactivation:** obsolete standard files (tracked or untracked; modified or clean) remain byte-for-byte unchanged. After successful recognized-stack detection, only their Agenieer-managed routing entries are removed; no file-deletion conflict is raised.
31. **No false deactivation:** a failed/incomplete scan or a zero-technology detection result cannot clear existing managed routing; generated standards themselves do not count as detection evidence.
32. **Interrupted execution:** an injected write failure stops with exit `1`; individual existing files are not truncated and a later rerun safely completes remaining work.
33. **Partial conflict completion:** independent safe changes are written despite a malformed managed section; summary is complete and exit status is `2` absent operational failure.
34. **Exit status:** successful runs exit `0`, operational failures `1`, unresolved conflicts `2`; dry runs report equivalent planned status without writes.

### Release definition of done

- All P0 behaviors implemented and documented.
- Unit and fixture-based integration tests pass.
- Repeated-run, adaptive prompt, managed-marker, inactive-file preservation/reactivation, partial-failure, and selective-routing tests pass.
- `npm pack --dry-run` contains every runtime asset.
- A fresh `npx github:XanMK3/agenieer standards init --dry-run` works in a separate repository.
- README includes installation/use examples and explicit limitations.

## 11. Non-goals, implementation latitude and decision status

### Non-goals for v0.1

- Enforcing standards by modifying ESLint/Prettier/TypeScript configs, installing dependencies, or changing application code.
- Claiming to infer unstated team preferences (export style, state management, directory architecture, etc.) from a package name.
- Automatically reconciling contradictory existing policies or merging edits into user-customized **active** standards.
- Running or orchestrating AI agents; offering interactive technology overrides for already recognized repositories.
- Automatically installing/replacing Jest or Cypress, selecting Vitest as a migration target, or modifying target test configuration.
- Treating test standards as a standalone verification tool; future `agenieer verify` may run checks, but `standards` only documents expectations.

### Already approved — not open product questions

The eight product decisions recorded in §14 remain settled, **except Decision 4 was explicitly revised on 2026-11-15**: adaptive initialization, dependency-first detection, managed documentation sections, non-destructive standards preservation with routing-only deactivation, eleven research-backed templates, patterns plus contextual routing, partial completion with defined exit codes, and preflight/atomic per-file writes.

### Implementation details requiring engineering design (not new product approvals)

- Exact CLI message wording, ordering and terminal presentation, within the approved four-prompt guided selector and exit-code contract.
- Registry schema for file patterns plus contextual applicability and the details of bounded detection scanning.
- Exact supported Node.js and dependency versions, build/bundle configuration, distribution of Markdown assets, and CI matrix.
- Platform-specific mechanics for safe temporary file replacement and the handling of unsupported atomic-rename cases.

The eleven research-backed templates are **approved as the v0.1 baseline**; factual mistakes or framework-version incompatibilities may be corrected during implementation and tests without reopening their selection.

---

## 12. Testing scope decision record (2026-11-14)

- **Agreed:** Tests deserve coding standards just as production code does; this stays inside `agenieer standards` for v0.1.
- **Agreed:** Use a **layered, composable model**: general testing principles + detected supported runner/utility conventions + normal language/framework standards.
- **Agreed:** v0.1 ships **four testing templates**: `testing.md`, `testing/vitest.md`, `testing/playwright.md`, and `testing/react-testing-library.md`.
- **Agreed:** **Jest and Cypress are excluded from the first release** because the initial focus is Vite/Vitest and Playwright workflows, **not** because those frameworks are universally outdated.
- **Agreed:** Recognize unsupported testing evidence without installing unsupported templates or migrating repositories.
- **Agreed:** `Vite !== Vitest`; Playwright Test and React Testing Library require their own detection evidence.
- **Deferred:** Additional testing frameworks, separate test-type standards, and any verification/execution sub-tool.

## 13. Selective routing decision record (2026-11-14)

- **Agreed:** `AGENTS.md` is a small, fixed **router**, not a container for generated coding standards.
- **Agreed:** `docs/standards/README.md` is a lightweight **applicability index**, not a concatenated standards document.
- **Agreed:** Agents are instructed to read the index, then read **only applicable** standalone standards; multiple standards may apply together.
- **Agreed:** The routing metadata must account for file type **and** framework/styling/test usage. Globs alone are insufficient to distinguish every `.tsx` component or `.spec.ts` suite.
- **Agreed:** This behavior is enforced by generator boundaries and tests, while actual reading behavior cannot be guaranteed across all AI coding agents.
- **Agreed:** Existing user-authored documents and unmanaged sections remain protected through repeated initialization and changes in the detected stack.

## 14. Resolve decision record — all eight approved (2026-11-15)

These decisions superseded earlier proposals, including `--yes` and non-interactive-by-default empty-directory initialization. **Decision 4 was subsequently revised on 2026-11-15**: obsolete standards are now preserved, with routing-only deactivation. The revised decision below is authoritative.

| # | Topic | Approved decision | Accepted trade-off / caveat |
| --- | --- | --- | --- |
| 1 | Initialization UX | Detected stack → auto-initialize without questions; no detection → preserve usable prior managed routing or use `@clack/prompts` for initial selection. `--non-interactive` disables prompts; no `--yes`. | Automatic detection may select unnecessary templates; developers can review Git changes. |
| 2 | Detection confidence | Dependency-first; any strong recognized dependency/config/source signal is sufficient; expose evidence via `standards detect`. | Unused dependencies can produce redundant standards. |
| 3 | Existing documentation | Preserve content; append/update only well-formed Agenieer-managed sections in `AGENTS.md` and the standards index; preserve existing selected standard bodies. | Overlapping instructions are not automatically reconciled. |
| 4 | Technology removal (revised) | **Never delete or overwrite standalone standards.** On successful recognized-stack detection, remove obsolete references only from the Agenieer-managed README routing; restore routing when a technology returns. | Inactive files accumulate but preserve all customizations. Empty detection retains existing managed routes. No `.agenieer.json` or Git-provenance tracking. |
| 5 | Template content | Adopt all eleven concise, researched language, styling, framework and testing templates as the v0.1 baseline. | Some rules may be refined after hands-on tests. |
| 6 | Routing precision | Use file patterns **and** contextual technology/usage rules; compose multiple relevant documents; no per-file routing map. | Agents must interpret some contextual guidance. |
| 7 | CLI error handling | Apply independent safe changes despite conflicts; report created/updated/skipped/conflicted outputs and routing changes; return `0` success, `1` operational failure, `2` unresolved conflicts. | Some runs may finish partially and require a rerun or manual fix. |
| 8 | Write atomicity | Full preflight, atomic writes/managed-section patches where supported, create missing standards before references, stop on unexpected operational failure, support safe reruns. | No repository-wide transaction/rollback guarantee; standalone standards are never replaced or deleted. |

---

**Guiding principle:** *Agenieer should make an existing repository agent-ready without taking ownership of its codebase or silently rewriting its engineering decisions.*
