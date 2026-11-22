# Agenieer — Architecture

## 1. Modular Monolith

Agenieer is structured as a modular monolith in a single package. Rather than splitting into multiple npm packages or complex workspace setups, all tools share a minimal `core/` infrastructure while maintaining clean internal boundaries:

```text
src/
├── cli.ts                   # Executable entrypoint & top-level options
├── core/                    # Shared utilities
│   ├── filesystem.ts        # Atomic writes, path safety, safe directory listing
│   ├── project.ts           # Target root resolution and validation
│   ├── logger.ts            # Deterministic, structured console formatting
│   └── change-plan.ts       # ChangePlan type, action semantics, preflight validation
└── tools/
    └── standards/           # Standards tool domain
        ├── types.ts         # DetectedTechnology and tool-specific types
        ├── index.ts         # Command registration (Commander)
        ├── commands/        # Command implementations: detect.ts, init.ts
        ├── detection/       # Side-effect-free technology scanners
        ├── resolver.ts      # Template registry and transitive dependency expansion
        └── generation/      # Pure renderers and change planner
```

### Dependency Rules

- `tools/*` may import from `core/*`.
- `core/*` must NOT import from `tools/*`.
- Different tool domains under `tools/*` must not import internal logic from each other.

---

## 2. Pipeline Architecture

The standards initialization pipeline enforces a strict separation between analysis, planning, and execution:

```text
Target Repository
   │
   ▼
1. Detect Technologies (detection/*.ts)
   - Dependency-first analysis of package.json, config files, source files, and test suites
   - Side-effect-free; produces DetectedTechnology[] with concrete evidence
   │
   ▼
2. Stack Resolution & Fallback (resolver.ts & init.ts)
   - If recognized technologies found: auto-proceed without prompting
   - If no recognized technologies: check for existing usable managed routing
   - If no existing routing: launch guided selector (@clack/prompts) or exit 1 (--non-interactive)
   │
   ▼
3. Standards Resolution (resolver.ts)
   - Map technology IDs to bundled templates
   - Expand transitive requirements (e.g. tailwind -> css, vitest -> testing)
   - Expose applicable file patterns and usage context per standard
   │
   ▼
4. Change Planning (generation/plan.ts)
   - Plan standards file creations (never overwrites or deletes)
   - Reconcile routing activations and deactivations
   - Plan managed section patches for docs/standards/README.md and AGENTS.md
   │
   ▼
5. Preflight Validation (core/change-plan.ts)
   - Verify path containment inside target root (prevent traversal)
   - Validate that all markdown links in generated README point to existing or planned files
   │
   ▼
6. Safe Execution (commands/init.ts)
   - If --dry-run: print planned changes and exit 0
   - Otherwise: write missing standards files first (via atomic temp-file replacement)
   - Patch docs/standards/README.md managed section
   - Patch root AGENTS.md managed section
   - Return exit code: 0 (success), 1 (error), or 2 (unresolved conflicts)
```

---

## 3. Key Invariants

### Invariant 1: Small Fixed AGENTS.md Router
`src/tools/standards/generation/agents.ts` renders a minimal, stack-independent instruction block. It accepts zero parameters and never imports or interpolates template bodies. Whether a repository uses 3 standards or 15, the managed section in `AGENTS.md` is byte-for-byte identical.

### Invariant 2: Non-Destructive Standards Lifecycle
Agenieer never deletes or overwrites existing standalone standards files. When a technology is removed from a project, its reference is removed from the managed section in `docs/standards/README.md` only; its file remains intact on disk. If the technology is re-added later, the existing file is reused and its route restored.

### Invariant 3: Clean Separation of Generators
- `resolver.ts`: selects document IDs and metadata.
- `generation/standards.ts`: writes standalone templates to disk.
- `generation/readme.ts`: renders the applicability routing index from metadata only.
- `generation/agents.ts`: renders the fixed entrypoint instruction.

## 4. HTML/Vue and React Target Extension

`detection/frameworks.ts` gathers HTML, Vue, JSX runtime, and React platform evidence from local manifests, source imports, and static configuration. `inspection.ts` supplies shared exclusions, bounded enumeration, and bounded reads; `vue-sfc.ts` inspects top-level SFC blocks without a compiler or general HTML parser. No target code runs.

`DetectedTechnology` retains the `react` identifier and adds optional structured `platformEvidence` (web/native evidence arrays) and `reactTarget`. The detector merges evidence before classifying web + native as mixed, one platform as that platform, and neither as unknown. Nested package manifests and source imports can establish distinct application targets. Existing non-framework dependency/testing detection remains in its original scanners.

The resolver expands Vue → HTML and conditionally expands React → HTML for web/mixed targets. Missing target context is unknown. Its set-based expansion deduplicates HTML alongside existing CSS, testing, and Data Safety dependencies; explicit HTML evidence remains independent. Guided React selection supplies the same target field.

Routing remains metadata-driven and task-sensitive. Shared extensions are candidate patterns, not framework ownership. The generated index explains markup versus script/style applicability and native-style components with web output. The root router and standalone-file preservation policies are unchanged. Detection never scans generated standards to sustain obsolete routes.

## 5. Asynchronous Concurrency Extension

The registry gives JavaScript, TypeScript, React, and Vue a shared `async-concurrency` requirement with no dependencies of its own. Set expansion deduplicates it and explicit ordering places it after Data Safety. React's conditional HTML edge and Vue's unconditional HTML edge remain unchanged.

Applicability is contextual with no file patterns. The README renderer supplies the display title and active-only examples; `extractActiveIds()` recognizes the filename for activation, deactivation, reactivation, and zero-detection preservation. The root router remains fixed. No detectors, runtime request managers, or target-code execution are introduced.

The compact template owns generic concurrency policy, cancellation, ownership, and stale-result safety. React and Vue retain lifecycle integration; Data Safety retains persistence integrity. Existing generated template bodies are preserved, so bundled rule consolidation is not an automatic migration. Test-only executable examples demonstrate the contract without claiming to enforce downstream behavior. See [the extension contract](standards-tool.md#6-asynchronous-concurrency-extension).
