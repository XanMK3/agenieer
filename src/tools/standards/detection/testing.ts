import path from 'node:path';
import fs from 'node:fs/promises';
import { DetectedTechnology } from '../types.js';
import { listFiles } from '@/core/filesystem.js';

import { COMMON_IGNORE } from './inspection.js';

export interface TestingScanResult {
  detected: DetectedTechnology[];
  hasTestFiles: boolean;
  testFiles: string[];
}

export async function detectTesting(
  targetRoot: string,
  existingDetected: DetectedTechnology[]
): Promise<TestingScanResult> {
  const detected: DetectedTechnology[] = [];

  // Find test files
  const testFiles = (await listFiles(
    targetRoot,
    [
      '**/*.test.{ts,tsx,js,jsx,mjs,cjs}',
      '**/*.spec.{ts,tsx,js,jsx,mjs,cjs}',
      '**/__tests__/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      '**/tests/**/*.{ts,tsx,js,jsx,mjs,cjs}',
    ],
    { ignore: COMMON_IGNORE, followSymbolicLinks: false }
  )).sort();

  const hasTestFiles = testFiles.length > 0;

  // Check imports in test files for vitest or @playwright/test
  let foundVitestImport = false;
  let foundPlaywrightTestImport = false;

  for (const testFile of testFiles.slice(0, 30)) {
    try {
      const content = await fs.readFile(path.join(targetRoot, testFile), 'utf8');
      if (!foundVitestImport && /from\s+['"]vitest['"]|require\(['"]vitest['"]\)/.test(content)) {
        foundVitestImport = true;
        detected.push({
          id: 'vitest',
          evidence: [`Vitest import found in test file "${testFile}"`],
          confidence: 'high',
          category: 'test-runner',
        });
      }
      if (
        !foundPlaywrightTestImport &&
        /from\s+['"]@playwright\/test['"]|require\(['"]@playwright\/test['"]\)/.test(content)
      ) {
        foundPlaywrightTestImport = true;
        detected.push({
          id: 'playwright-test',
          evidence: [`@playwright/test import found in test file "${testFile}"`],
          confidence: 'high',
          category: 'test-runner',
        });
      }
      if (foundVitestImport && foundPlaywrightTestImport) break;
    } catch {
      // Ignore read errors
    }
  }

  // Combine runner signals
  const allSignals = [...existingDetected, ...detected];
  const hasVitest = allSignals.some((d) => d.id === 'vitest');
  const hasPlaywrightTest = allSignals.some((d) => d.id === 'playwright-test');
  const hasRtl = allSignals.some((d) => d.id === 'react-testing-library');
  const hasJest = allSignals.some((d) => d.id === 'jest');
  const hasCypress = allSignals.some((d) => d.id === 'cypress');

  // Generic testing rule:
  // If test files are found, or any test runner/utility is detected -> testing
  if (hasTestFiles || hasVitest || hasPlaywrightTest || hasRtl || hasJest || hasCypress) {
    const evidence: string[] = [];
    if (hasTestFiles) {
      const sample = testFiles.slice(0, 5).join(', ');
      evidence.push(`Test files found (${testFiles.length} files, e.g. ${sample})`);
    }
    if (hasVitest) evidence.push('Vitest runner detected');
    if (hasPlaywrightTest) evidence.push('Playwright Test runner detected');
    if (hasRtl) evidence.push('React Testing Library detected');
    if (hasJest) evidence.push('Jest runner detected');
    if (hasCypress) evidence.push('Cypress runner detected');

    detected.push({
      id: 'testing',
      evidence,
      confidence: 'high',
      category: 'testing-utility',
    });
  }

  return {
    detected,
    hasTestFiles,
    testFiles,
  };
}
