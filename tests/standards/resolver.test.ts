import { describe, it, expect } from 'vitest';
import { resolveStandards } from '@/tools/standards/resolver.js';
import { DetectedTechnology } from '@/tools/standards/types.js';

describe('Standards Resolver', () => {
  it('resolves typescript and react', () => {
    const detected: DetectedTechnology[] = [
      { id: 'typescript', evidence: ['tsconfig.json'], confidence: 'high' },
      { id: 'react', evidence: ['package.json'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toEqual(['typescript', 'react']);
    expect(resolved[0].outputFile).toBe('docs/standards/typescript.md');
    expect(resolved[1].outputFile).toBe('docs/standards/react.md');
  });

  it('transitive requirement: tailwind implies css', () => {
    const detected: DetectedTechnology[] = [
      { id: 'tailwind', evidence: ['tailwind.config.ts'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('css');
    expect(ids).toContain('tailwind');
  });

  it('transitive requirement: css-modules implies css', () => {
    const detected: DetectedTechnology[] = [
      { id: 'css-modules', evidence: ['Button.module.css'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('css');
    expect(ids).toContain('css-modules');
  });

  it('transitive requirement: styled-components implies css', () => {
    const detected: DetectedTechnology[] = [
      { id: 'styled-components', evidence: ['package.json'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('css');
    expect(ids).toContain('styled-components');
  });

  it('transitive requirement: vitest implies testing', () => {
    const detected: DetectedTechnology[] = [
      { id: 'vitest', evidence: ['vitest.config.ts'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('testing');
    expect(ids).toContain('vitest');
  });

  it('transitive requirement: playwright-test implies testing', () => {
    const detected: DetectedTechnology[] = [
      { id: 'playwright-test', evidence: ['playwright.config.ts'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('testing');
    expect(ids).toContain('playwright-test');
  });

  it('transitive requirement: react-testing-library implies testing', () => {
    const detected: DetectedTechnology[] = [
      { id: 'react-testing-library', evidence: ['package.json'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toContain('testing');
    expect(ids).toContain('react-testing-library');
  });

  it('unsupported runner does not resolve to runner template, but testing is included if detected', () => {
    const detected: DetectedTechnology[] = [
      { id: 'jest', evidence: ['jest.config.js'], confidence: 'high' },
      { id: 'testing', evidence: ['test files found'], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    const ids = resolved.map((r) => r.id);

    expect(ids).toEqual(['testing']);
    expect(ids).not.toContain('jest');
    expect(ids).not.toContain('vitest');
  });

  it('maintains a deterministic, stable output ordering', () => {
    const detected1: DetectedTechnology[] = [
      { id: 'vitest', evidence: [], confidence: 'high' },
      { id: 'react', evidence: [], confidence: 'high' },
      { id: 'typescript', evidence: [], confidence: 'high' },
    ];

    const detected2: DetectedTechnology[] = [
      { id: 'typescript', evidence: [], confidence: 'high' },
      { id: 'vitest', evidence: [], confidence: 'high' },
      { id: 'react', evidence: [], confidence: 'high' },
    ];

    const ids1 = resolveStandards(detected1).map((r) => r.id);
    const ids2 = resolveStandards(detected2).map((r) => r.id);

    expect(ids1).toEqual(ids2);
    expect(ids1).toEqual(['typescript', 'react', 'testing', 'vitest']);
  });

  it('populates applicable patterns and usage context for each resolved standard', () => {
    const detected: DetectedTechnology[] = [
      { id: 'typescript', evidence: [], confidence: 'high' },
      { id: 'vitest', evidence: [], confidence: 'high' },
    ];

    const resolved = resolveStandards(detected);
    for (const std of resolved) {
      expect(std.applicablePatterns.length).toBeGreaterThan(0);
      expect(std.usageContext.length).toBeGreaterThan(0);
      expect(std.outputFile.startsWith('docs/standards/')).toBe(true);
      expect(std.templateFile.endsWith('.md')).toBe(true);
    }
  });
});
