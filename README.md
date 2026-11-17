# Agenieer

Extensible command-line toolkit for agentic software engineering.

Agenieer prepares repositories for AI coding agents by establishing a repository-owned, modular library of engineering and coding standards. It detects technologies in existing projects, installs concise, actionable Markdown standards, generates an applicability routing index, and sets up a lightweight entrypoint in `AGENTS.md`.

## Guiding Principles

- **Deterministic & Offline-Capable:** No AI model calls required for standards initialization.
- **Standards-First:** Outputs human-readable, repository-owned Markdown documentation under `docs/standards/`.
- **Non-Destructive Lifecycle:** Never deletes or overwrites existing standards files. Replaced or obsolete technologies lose only their managed routing reference.
- **Selective Standards Routing:** Root `AGENTS.md` is a fixed router directing agents to `docs/standards/README.md`. Standards are loaded selectively based on relevant files and context, never concatenated into `AGENTS.md`.

## Quick Start

Run directly from GitHub using `npx`:

```bash
# Preview planned changes
npx github:XanMK3/agenieer standards init --dry-run

# Initialize standards in current directory
npx github:XanMK3/agenieer standards init

# Target a different directory
npx github:XanMK3/agenieer --cwd /path/to/repo standards init
```

## Commands

### `agenieer standards detect`

Scans the repository, reports recognized technologies with concrete evidence, and lists applicable standards without writing any files.

```bash
npx github:XanMK3/agenieer standards detect
```

### `agenieer standards init`

Initializes standards in the repository.

- **Supported stack recognized:** Proceeds automatically without prompting.
- **No stack recognized:** Preserves existing managed routing if present; otherwise launches an interactive guided stack selector (`@clack/prompts`).
- **Options:**
  - `--dry-run`: Previews creates, skips, patches, conflicts, and routing activations/deactivations with zero filesystem modifications.
  - `--non-interactive`: Disables prompts. Fails with exit code `1` if a stack selection is needed and cannot be inferred.
  - `--cwd <path>`: Targets a directory other than `process.cwd()`.

### Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success: all planned operations completed without error or unresolved conflicts |
| `1` | Operational failure or missing required interactive input in non-interactive mode |
| `2` | Safe operations completed, but unresolved conflicts remain (e.g. malformed markers) |

## Supported Technologies (v0.1)

The CLI bundles **12 standards templates**, selected according to detected technologies and their dependencies.

- **Cross-cutting:** Data Safety (`data-safety.md`), included by JavaScript and TypeScript
- **Languages:** JavaScript, TypeScript
- **Frameworks:** React
- **Styling:** CSS, Tailwind CSS, CSS Modules, styled-components
- **Testing:** General testing (`testing.md`), Vitest, Playwright Test, React Testing Library
- **Unsupported runners:** Detects Jest and Cypress to provide generic testing guidance (`testing.md`) with explicit unsupported notices in the routing index.

Sass/SCSS uses the foundational `css.md`: either a `sass` or `sass-embedded` dependency alone, or `.css`, `.scss`, or `.sass` source files, selects CSS. CSS Modules detects `.module.css`, `.module.scss`, and `.module.sass` and includes CSS. No separate Sass template is needed.

JavaScript and TypeScript both require Data Safety; mixed projects generate it only once. Dependencies control which files are generated, while the routing index controls when to read them. Read Data Safety for external or untrusted data, import/export or transformation, persistence and generated datasets, and large inputs, downloads, uploads, or streams—not for unrelated JS/TS work.

## Generated Structure

```text
<target-repository>/
├── AGENTS.md
└── docs/
    └── standards/
        ├── README.md
        ├── data-safety.md
        ├── typescript.md
        ├── react.md
        ├── css.md
        ├── testing.md
        └── testing/
            ├── vitest.md
            └── react-testing-library.md
```

## Limitations (v0.1)

- Does not modify `package.json`, application source code, or linter/formatter configurations.
- Does not run or execute target project test suites or tools.
- Does not automatically merge upstream template updates into user-customized active standards.
- Excludes Jest-specific, Cypress-specific, or visual regression testing templates.

## License

MIT
