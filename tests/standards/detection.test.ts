import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { detectTechnologies } from '@/tools/standards/detection/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

describe('Technology Detection', () => {
  it('detects JavaScript and CSS in javascript fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'javascript');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('javascript');
    expect(ids).toContain('css');
    expect(ids).not.toContain('typescript');
  });

  it('detects React, TypeScript, and CSS in react-typescript fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'react-typescript');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('typescript');
    expect(ids).toContain('react');
    expect(ids).toContain('css');
    // vite.config.js should NOT trigger javascript detection
    expect(ids).not.toContain('javascript');
    // Vite alone should NOT trigger vitest
    expect(ids).not.toContain('vitest');
  });

  it('detects all styling variants in mixed-styling fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'mixed-styling');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('typescript');
    expect(ids).toContain('react');
    expect(ids).toContain('tailwind');
    expect(ids).toContain('css-modules');
    expect(ids).toContain('styled-components');
    expect(ids).toContain('css');
  });

  it('detects Vitest and RTL in vitest-react-testing-library fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'vitest-react-testing-library');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('vitest');
    expect(ids).toContain('react-testing-library');
    expect(ids).toContain('testing');
    expect(ids).not.toContain('playwright-test');
  });

  it('detects Playwright Test but NOT Vitest or RTL in playwright-only fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'playwright-only');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('playwright-test');
    expect(ids).toContain('testing');
    // Vite alone does not trigger Vitest
    expect(ids).not.toContain('vitest');
    // No React or RTL
    expect(ids).not.toContain('react-testing-library');
  });

  it('detects mixed test suites in mixed-testing fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'mixed-testing');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('vitest');
    expect(ids).toContain('react-testing-library');
    expect(ids).toContain('playwright-test');
    expect(ids).toContain('testing');
  });

  it('detects Jest as unsupported runner in unsupported-test-runner fixture', async () => {
    const fixturePath = path.join(FIXTURES_DIR, 'unsupported-test-runner');
    const detected = await detectTechnologies(fixturePath);
    const ids = detected.map((d) => d.id);

    expect(ids).toContain('jest');
    expect(ids).toContain('testing');
    expect(ids).not.toContain('vitest');
    expect(ids).not.toContain('playwright-test');
  });

  it('ignores playwright automation package alone (requires @playwright/test)', async () => {
    const tmpDir = path.join(FIXTURES_DIR, '_tmp_playwright_alone');
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { playwright: '^1.40.0' } })
    );

    try {
      const detected = await detectTechnologies(tmpDir);
      const ids = detected.map((d) => d.id);
      expect(ids).not.toContain('playwright-test');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('excludes docs/standards/ from scanning to prevent self-reinforcing detection', async () => {
    const tmpDir = path.join(FIXTURES_DIR, '_tmp_exclude_standards');
    await fs.mkdir(path.join(tmpDir, 'docs/standards'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'docs/standards/tailwind.md'),
      '# Tailwind CSS\nSome documentation with tailwindcss references.'
    );

    try {
      const detected = await detectTechnologies(tmpDir);
      const ids = detected.map((d) => d.id);
      expect(ids).not.toContain('tailwind');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
