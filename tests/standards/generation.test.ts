import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { renderAgentsSection, AGENTS_START_MARKER, AGENTS_END_MARKER } from '@/tools/standards/generation/agents.js';
import { renderReadmeSection, README_START_MARKER, README_END_MARKER } from '@/tools/standards/generation/readme.js';
import { planStandardsFiles } from '@/tools/standards/generation/standards.js';
import {
  buildChangePlan,
  parseManagedSection,
  replaceManagedSection,
  extractActiveIds,
} from '@/tools/standards/generation/plan.js';
import { resolveStandards } from '@/tools/standards/resolver.js';
import { preflightPlan } from '@/core/change-plan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_ROOT = path.resolve(__dirname, '../../templates/standards');

describe('Generation: AGENTS.md (Invariants #18 & #24)', () => {
  it('renderAgentsSection takes zero parameters and returns the fixed managed section', () => {
    // Function has arity 0
    expect(renderAgentsSection.length).toBe(0);

    const output = renderAgentsSection();
    expect(output).toContain(AGENTS_START_MARKER);
    expect(output).toContain(AGENTS_END_MARKER);
    expect(output).toContain('## Coding Standards');
    expect(output).toContain('Read `docs/standards/README.md`');
    expect(output).toContain('Do not load unrelated standards');
  });

  it('renderAgentsSection never contains template bodies or tech-specific text', () => {
    const output = renderAgentsSection();
    expect(output).not.toContain('typescript');
    expect(output).not.toContain('react');
    expect(output).not.toContain('vitest');
    expect(output).not.toContain('tailwind');
  });
});

describe('Generation: docs/standards/README.md', () => {
  it('renders routing index with links, patterns, and metadata without template bodies', async () => {
    const resolved = resolveStandards([
      { id: 'typescript', evidence: [], confidence: 'high' },
      { id: 'react', evidence: [], confidence: 'high' },
    ]);

    const output = renderReadmeSection(resolved, []);

    expect(output).toContain(README_START_MARKER);
    expect(output).toContain(README_END_MARKER);
    expect(output).toContain('[TypeScript](typescript.md)');
    expect(output).toContain('[React](react.md)');
    expect(output).toContain('## Active Standards');
    expect(output).toContain('## Applicable File Patterns');
    expect(output).toContain('## Conflict Resolution');

    // Verify it doesn't interpolate raw template body lines
    const tsTemplate = await fs.readFile(path.join(TEMPLATES_ROOT, 'typescript.md'), 'utf8');
    const tsBodyLine = tsTemplate.split('\n').find((l) => l.startsWith('- Use `unknown`'));
    expect(tsBodyLine).toBeDefined();
    expect(output).not.toContain(tsBodyLine);
  });

  it('includes unsupported testing notice when unsupported runners detected', () => {
    const resolved = resolveStandards([
      { id: 'testing', evidence: [], confidence: 'high' },
    ]);

    const output = renderReadmeSection(resolved, ['Jest']);

    expect(output).toContain('## Unsupported Testing Frameworks');
    expect(output).toContain('**Jest**');
    expect(output).toContain('testing.md');
  });
});

describe('Generation: Standards Files Preservation (Non-destructive)', () => {
  it('plans create for missing standards and skip for existing standards', async () => {
    const tmpDir = path.resolve(__dirname, '../_tmp_preservation');
    await fs.mkdir(path.join(tmpDir, 'docs/standards'), { recursive: true });
    // Write a customized typescript.md
    const customContent = '# My Custom TypeScript Rules\n- Custom rule 1';
    await fs.writeFile(path.join(tmpDir, 'docs/standards/typescript.md'), customContent);

    try {
      const resolved = resolveStandards([
        { id: 'typescript', evidence: [], confidence: 'high' },
        { id: 'react', evidence: [], confidence: 'high' },
      ]);

      const changes = await planStandardsFiles(resolved, tmpDir, TEMPLATES_ROOT);

      const tsChange = changes.find((c) => c.path === 'docs/standards/typescript.md');
      const reactChange = changes.find((c) => c.path === 'docs/standards/react.md');

      expect(tsChange).toBeDefined();
      expect(tsChange?.action).toBe('skip');
      expect(tsChange?.reason).toContain('already exists');

      expect(reactChange).toBeDefined();
      expect(reactChange?.action).toBe('create');
      expect(reactChange?.content).toBeDefined();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('Generation: Managed Marker Parsing & Handling', () => {
  it('parses well-formed managed section', () => {
    const text = `Title\n${README_START_MARKER}\nManaged content\n${README_END_MARKER}\nFooter`;
    const parsed = parseManagedSection(text, README_START_MARKER, README_END_MARKER);

    expect(parsed).not.toBeNull();
    expect(parsed?.before).toBe('Title\n');
    expect(parsed?.section).toBe(`${README_START_MARKER}\nManaged content\n${README_END_MARKER}`);
    expect(parsed?.after).toBe('\nFooter');
  });

  it('replaces managed section cleanly preserving before and after', () => {
    const text = `Title\n${README_START_MARKER}\nOld\n${README_END_MARKER}\nFooter`;
    const parsed = parseManagedSection(text, README_START_MARKER, README_END_MARKER)!;
    const replaced = replaceManagedSection(parsed, `${README_START_MARKER}\nNew\n${README_END_MARKER}`);

    expect(replaced).toBe(`Title\n${README_START_MARKER}\nNew\n${README_END_MARKER}\nFooter`);
  });

  it('throws on duplicate start marker', () => {
    const text = `${README_START_MARKER}\n${README_START_MARKER}\n${README_END_MARKER}`;
    expect(() => parseManagedSection(text, README_START_MARKER, README_END_MARKER)).toThrow(/Malformed/);
  });

  it('throws when end marker comes before start marker', () => {
    const text = `${README_END_MARKER}\n${README_START_MARKER}`;
    expect(() => parseManagedSection(text, README_START_MARKER, README_END_MARKER)).toThrow(/end marker appears before/);
  });

  it('extracts active IDs from README managed section', () => {
    const text = `${README_START_MARKER}\n| [TypeScript](typescript.md) | TS files |\n| [Vitest](testing/vitest.md) | Tests |\n${README_END_MARKER}`;
    const ids = extractActiveIds(text);
    expect(ids).toEqual(new Set(['typescript', 'vitest']));
  });
});

describe('Generation: Change Plan & Routing Lifecycle', () => {
  it('computes routing activations on first run', async () => {
    const tmpDir = path.resolve(__dirname, '../_tmp_plan_1');
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      const standards = resolveStandards([
        { id: 'typescript', evidence: [], confidence: 'high' },
      ]);

      const plan = await buildChangePlan({
        targetRoot: tmpDir,
        templateRoot: TEMPLATES_ROOT,
        standards,
        detected: [{ id: 'typescript', evidence: [], confidence: 'high' }],
        hasRecognizedStack: true,
      });

      const activations = plan.routingChanges.filter((r) => r.action === 'activate');
      expect(activations.map((a) => a.tech)).toContain('typescript');

      const errors = preflightPlan(plan, tmpDir);
      expect(errors).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('computes routing deactivation when a technology is removed, preserving file on disk', async () => {
    const tmpDir = path.resolve(__dirname, '../_tmp_plan_deactivate');
    await fs.mkdir(path.join(tmpDir, 'docs/standards'), { recursive: true });

    // Pre-create README with typescript and tailwind active
    const initialReadme = `${README_START_MARKER}\n| [TypeScript](typescript.md) | TS |\n| [Tailwind CSS](tailwind.md) | Tailwind |\n${README_END_MARKER}\n`;
    await fs.writeFile(path.join(tmpDir, 'docs/standards/README.md'), initialReadme);
    await fs.writeFile(path.join(tmpDir, 'docs/standards/typescript.md'), '# TypeScript');
    await fs.writeFile(path.join(tmpDir, 'docs/standards/tailwind.md'), '# Tailwind');

    try {
      // Now only typescript is detected
      const standards = resolveStandards([
        { id: 'typescript', evidence: [], confidence: 'high' },
      ]);

      const plan = await buildChangePlan({
        targetRoot: tmpDir,
        templateRoot: TEMPLATES_ROOT,
        standards,
        detected: [{ id: 'typescript', evidence: [], confidence: 'high' }],
        hasRecognizedStack: true,
      });

      // tailwind should be deactivated in routing
      const deactivations = plan.routingChanges.filter((r) => r.action === 'deactivate');
      expect(deactivations.map((d) => d.tech)).toContain('tailwind');

      // But tailwind.md must NOT have a delete change action
      const tailwindChange = plan.changes.find((c) => c.path === 'docs/standards/tailwind.md');
      expect(tailwindChange?.action).not.toBe('delete');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('produces skip action on idempotent rerun', async () => {
    const tmpDir = path.resolve(__dirname, '../_tmp_plan_idempotent');
    await fs.mkdir(path.join(tmpDir, 'docs/standards'), { recursive: true });

    const standards = resolveStandards([
      { id: 'typescript', evidence: [], confidence: 'high' },
    ]);

    // First plan
    const plan1 = await buildChangePlan({
      targetRoot: tmpDir,
      templateRoot: TEMPLATES_ROOT,
      standards,
      detected: [{ id: 'typescript', evidence: [], confidence: 'high' }],
      hasRecognizedStack: true,
    });

    // Write all planned changes
    for (const change of plan1.changes) {
      if (change.content) {
        await fs.mkdir(path.dirname(path.join(tmpDir, change.path)), { recursive: true });
        await fs.writeFile(path.join(tmpDir, change.path), change.content);
      }
    }

    // Second plan on identical state
    const plan2 = await buildChangePlan({
      targetRoot: tmpDir,
      templateRoot: TEMPLATES_ROOT,
      standards,
      detected: [{ id: 'typescript', evidence: [], confidence: 'high' }],
      hasRecognizedStack: true,
    });

    // Both README and AGENTS should be 'skip'
    const readmeChange = plan2.changes.find((c) => c.path === 'docs/standards/README.md');
    const agentsChange = plan2.changes.find((c) => c.path === 'AGENTS.md');
    const tsChange = plan2.changes.find((c) => c.path === 'docs/standards/typescript.md');

    expect(readmeChange?.action).toBe('skip');
    expect(agentsChange?.action).toBe('skip');
    expect(tsChange?.action).toBe('skip');
  });

  it('flags conflict when managed markers are malformed', async () => {
    const tmpDir = path.resolve(__dirname, '../_tmp_plan_malformed');
    await fs.mkdir(path.join(tmpDir, 'docs/standards'), { recursive: true });

    // Write malformed README (duplicate start marker)
    await fs.writeFile(
      path.join(tmpDir, 'docs/standards/README.md'),
      `${README_START_MARKER}\n${README_START_MARKER}\n${README_END_MARKER}`
    );

    try {
      const standards = resolveStandards([
        { id: 'typescript', evidence: [], confidence: 'high' },
      ]);

      const plan = await buildChangePlan({
        targetRoot: tmpDir,
        templateRoot: TEMPLATES_ROOT,
        standards,
        detected: [{ id: 'typescript', evidence: [], confidence: 'high' }],
        hasRecognizedStack: true,
      });

      const readmeChange = plan.changes.find((c) => c.path === 'docs/standards/README.md');
      expect(readmeChange?.action).toBe('conflict');
      expect(readmeChange?.reason).toContain('Malformed');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
