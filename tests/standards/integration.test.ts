import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { runInit } from '@/tools/standards/commands/init.js';
import { fileExists, readFileText } from '@/core/filesystem.js';
import { AGENTS_START_MARKER, AGENTS_END_MARKER } from '@/tools/standards/generation/agents.js';
import { README_START_MARKER, README_END_MARKER } from '@/tools/standards/generation/readme.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');
const WORK_DIR = path.resolve(__dirname, '../_work');

/** Helper to recursively copy directory */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

describe('Integration Scenarios (Acceptance Tests from Spec §10)', () => {
  beforeEach(async () => {
    await fs.mkdir(WORK_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(WORK_DIR, { recursive: true, force: true });
  });

  it('Scenario 1: JS-only repository generates javascript.md, css.md, index, and AGENTS.md', async () => {
    const targetRoot = path.join(WORK_DIR, 'js-only');
    await copyDir(path.join(FIXTURES_DIR, 'javascript'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/javascript.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/css.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/typescript.md'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/README.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'AGENTS.md'))).toBe(true);

    const readme = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));
    expect(readme).toContain('[JavaScript](javascript.md)');
    expect(readme).toContain('[CSS](css.md)');
    expect(readme).not.toContain('typescript.md');
  });

  it('Scenario 2: React + TS repository does NOT generate javascript.md from tooling config files', async () => {
    const targetRoot = path.join(WORK_DIR, 'react-ts');
    await copyDir(path.join(FIXTURES_DIR, 'react-typescript'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/typescript.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/react.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/css.md'))).toBe(true);
    // vite.config.js alone must not create javascript.md
    expect(await fileExists(path.join(targetRoot, 'docs/standards/javascript.md'))).toBe(false);
  });

  it('Scenario 3: Mixed styling generates all CSS-family docs', async () => {
    const targetRoot = path.join(WORK_DIR, 'mixed-styling');
    await copyDir(path.join(FIXTURES_DIR, 'mixed-styling'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/css.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/tailwind.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/css-modules.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/styled-components.md'))).toBe(true);
  });

  it('Scenario 4: Playwright-only tests does NOT generate Vitest or RTL', async () => {
    const targetRoot = path.join(WORK_DIR, 'playwright-only');
    await copyDir(path.join(FIXTURES_DIR, 'playwright-only'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/playwright.md'))).toBe(true);
    // Vite alone does not imply Vitest
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/vitest.md'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/react-testing-library.md'))).toBe(false);
  });

  it('Scenario 5: Vitest + RTL generates testing.md, vitest.md, and react-testing-library.md', async () => {
    const targetRoot = path.join(WORK_DIR, 'vitest-rtl');
    await copyDir(path.join(FIXTURES_DIR, 'vitest-react-testing-library'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/vitest.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/react-testing-library.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/playwright.md'))).toBe(false);
  });

  it('Scenario 6: Mixed testing generates all three specific testing templates + shared testing.md', async () => {
    const targetRoot = path.join(WORK_DIR, 'mixed-testing');
    await copyDir(path.join(FIXTURES_DIR, 'mixed-testing'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/vitest.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/playwright.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/react-testing-library.md'))).toBe(true);
  });

  it('Scenario 8: Unsupported runner (Jest) generates generic testing.md + notice, never substituting Vitest', async () => {
    const targetRoot = path.join(WORK_DIR, 'unsupported-runner');
    await copyDir(path.join(FIXTURES_DIR, 'unsupported-test-runner'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/vitest.md'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/playwright.md'))).toBe(false);

    const readme = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));
    expect(readme).toContain('## Unsupported Testing Frameworks');
    expect(readme).toContain('**Jest**');
  });

  it('Scenario 9: No tests detected produces no testing templates', async () => {
    const targetRoot = path.join(WORK_DIR, 'no-tests');
    await copyDir(path.join(FIXTURES_DIR, 'react-typescript'), targetRoot);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing.md'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/testing/vitest.md'))).toBe(false);
  });

  it('Scenario 10: Existing AGENTS.md preserves unrelated content byte-for-byte outside managed region', async () => {
    const targetRoot = path.join(WORK_DIR, 'existing-agents');
    await copyDir(path.join(FIXTURES_DIR, 'javascript'), targetRoot);

    const customHeader = '# Project Custom Guidelines\nDo not push without testing.\n\n';
    const customFooter = '\n\n## Custom Team Rules\nUse tabs not spaces.\n';
    const initialContent = `${customHeader}${AGENTS_START_MARKER}\nOld Managed Section\n${AGENTS_END_MARKER}${customFooter}`;
    await fs.writeFile(path.join(targetRoot, 'AGENTS.md'), initialContent);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    const result = await readFileText(path.join(targetRoot, 'AGENTS.md'));
    expect(result.startsWith(customHeader)).toBe(true);
    expect(result.endsWith(customFooter)).toBe(true);
    expect(result).toContain(AGENTS_START_MARKER);
    expect(result).toContain(AGENTS_END_MARKER);
  });

  it('Scenario 11: Existing customized standard remains untouched on init', async () => {
    const targetRoot = path.join(WORK_DIR, 'custom-standard');
    await copyDir(path.join(FIXTURES_DIR, 'javascript'), targetRoot);

    await fs.mkdir(path.join(targetRoot, 'docs/standards'), { recursive: true });
    const customContent = '# Customized JavaScript Standard\n- Our team rule here\n';
    await fs.writeFile(path.join(targetRoot, 'docs/standards/javascript.md'), customContent);

    const exitCode = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(exitCode).toBe(0);

    const after = await readFileText(path.join(targetRoot, 'docs/standards/javascript.md'));
    expect(after).toBe(customContent);
  });

  it('Scenario 12: Repeated init is idempotent (no duplicate markers or changed content)', async () => {
    const targetRoot = path.join(WORK_DIR, 'idempotent');
    await copyDir(path.join(FIXTURES_DIR, 'react-typescript'), targetRoot);

    // Run 1
    const code1 = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code1).toBe(0);

    const agents1 = await readFileText(path.join(targetRoot, 'AGENTS.md'));
    const readme1 = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));

    // Run 2
    const code2 = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code2).toBe(0);

    const agents2 = await readFileText(path.join(targetRoot, 'AGENTS.md'));
    const readme2 = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));

    expect(agents2).toBe(agents1);
    expect(readme2).toBe(readme1);
  });

  it('Scenario 13 & 30: Technology removed deactivates routing only and preserves standard file byte-for-byte', async () => {
    const targetRoot = path.join(WORK_DIR, 'deactivation');
    await copyDir(path.join(FIXTURES_DIR, 'mixed-styling'), targetRoot);

    // Initial run with all styling tools
    const code1 = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code1).toBe(0);

    expect(await fileExists(path.join(targetRoot, 'docs/standards/tailwind.md'))).toBe(true);
    const tailwindContentBefore = await readFileText(path.join(targetRoot, 'docs/standards/tailwind.md'));

    // Remove tailwind from package.json and config file
    await fs.rm(path.join(targetRoot, 'tailwind.config.ts'));
    const pkgPath = path.join(targetRoot, 'package.json');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
    delete pkg.devDependencies.tailwindcss;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

    // Second run
    const code2 = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code2).toBe(0);

    // tailwind.md must still exist and be byte-for-byte identical
    expect(await fileExists(path.join(targetRoot, 'docs/standards/tailwind.md'))).toBe(true);
    const tailwindContentAfter = await readFileText(path.join(targetRoot, 'docs/standards/tailwind.md'));
    expect(tailwindContentAfter).toBe(tailwindContentBefore);

    // README routing must NO LONGER link to tailwind.md
    const readmeAfter = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));
    expect(readmeAfter).not.toContain('[Tailwind CSS](tailwind.md)');
  });

  it('Scenario 14: Dry run produces zero filesystem changes', async () => {
    const targetRoot = path.join(WORK_DIR, 'dry-run');
    await copyDir(path.join(FIXTURES_DIR, 'react-typescript'), targetRoot);

    const filesBefore = await fs.readdir(targetRoot);

    const code = await runInit({ targetRoot, dryRun: true, nonInteractive: true });
    expect(code).toBe(0);

    const filesAfter = await fs.readdir(targetRoot);
    expect(filesAfter).toEqual(filesBefore);
    expect(await fileExists(path.join(targetRoot, 'docs'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'AGENTS.md'))).toBe(false);
  });

  it('Scenario 18: AGENTS.md managed block is identical for 3 standards and 11 standards', async () => {
    const targetRoot1 = path.join(WORK_DIR, 'repo-few');
    await copyDir(path.join(FIXTURES_DIR, 'javascript'), targetRoot1);
    await runInit({ targetRoot: targetRoot1, dryRun: false, nonInteractive: true });

    const targetRoot2 = path.join(WORK_DIR, 'repo-many');
    await copyDir(path.join(FIXTURES_DIR, 'mixed-testing'), targetRoot2);
    await runInit({ targetRoot: targetRoot2, dryRun: false, nonInteractive: true });

    const agents1 = await readFileText(path.join(targetRoot1, 'AGENTS.md'));
    const agents2 = await readFileText(path.join(targetRoot2, 'AGENTS.md'));

    // Extract managed section from both
    const extractSection = (str: string) => {
      const s = str.indexOf(AGENTS_START_MARKER);
      const e = str.indexOf(AGENTS_END_MARKER) + AGENTS_END_MARKER.length;
      return str.slice(s, e);
    };

    expect(extractSection(agents1)).toBe(extractSection(agents2));
  });

  it('Scenario 27: --non-interactive exits 1 when no technology is recognized and no prior routing exists', async () => {
    const targetRoot = path.join(WORK_DIR, 'empty-repo');
    await fs.mkdir(targetRoot, { recursive: true });

    const code = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code).toBe(1);

    // No files written
    expect(await fileExists(path.join(targetRoot, 'AGENTS.md'))).toBe(false);
    expect(await fileExists(path.join(targetRoot, 'docs'))).toBe(false);
  });

  it('Scenario 31: Zero-technology detection with prior usable managed routing preserves it', async () => {
    const targetRoot = path.join(WORK_DIR, 'zero-detection-preserve');
    await fs.mkdir(path.join(targetRoot, 'docs/standards'), { recursive: true });

    const priorReadme = `${README_START_MARKER}
# Engineering Standards — Index
| [TypeScript](typescript.md) | TypeScript files |
${README_END_MARKER}
`;
    await fs.writeFile(path.join(targetRoot, 'docs/standards/README.md'), priorReadme);
    await fs.writeFile(path.join(targetRoot, 'docs/standards/typescript.md'), '# TypeScript');

    // Run init non-interactively in an otherwise empty directory
    const code = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    expect(code).toBe(0);

    // Prior routing should remain intact
    const readmeAfter = await readFileText(path.join(targetRoot, 'docs/standards/README.md'));
    expect(readmeAfter).toContain('[TypeScript](typescript.md)');
  });

  it('Scenario 33: Malformed markers in AGENTS.md reports conflict (exit 2) while safe standards are still created', async () => {
    const targetRoot = path.join(WORK_DIR, 'conflict-partial');
    await copyDir(path.join(FIXTURES_DIR, 'javascript'), targetRoot);

    // Create AGENTS.md with duplicate start markers
    await fs.writeFile(
      path.join(targetRoot, 'AGENTS.md'),
      `${AGENTS_START_MARKER}\nDuplicate marker\n${AGENTS_START_MARKER}\n${AGENTS_END_MARKER}`
    );

    const code = await runInit({ targetRoot, dryRun: false, nonInteractive: true });
    // Exit code 2 = unresolved conflicts but safe operations completed
    expect(code).toBe(2);

    // Safe standards files were still created!
    expect(await fileExists(path.join(targetRoot, 'docs/standards/javascript.md'))).toBe(true);
    expect(await fileExists(path.join(targetRoot, 'docs/standards/README.md'))).toBe(true);
  });
});
