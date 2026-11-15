import path from 'node:path';
import fs from 'node:fs/promises';
import { DetectedTechnology } from '../types.js';
import { listFiles, fileExists } from '@/core/filesystem.js';

export async function detectConfigFiles(targetRoot: string): Promise<DetectedTechnology[]> {
  const detected: DetectedTechnology[] = [];

  // TypeScript configs
  const tsConfigs = await listFiles(targetRoot, 'tsconfig*.json');
  if (tsConfigs.length > 0) {
    detected.push({
      id: 'typescript',
      evidence: tsConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'language',
    });
  }

  // Tailwind configs
  const tailwindConfigs = await listFiles(targetRoot, 'tailwind.config.{js,ts,mjs,cjs}');
  if (tailwindConfigs.length > 0) {
    detected.push({
      id: 'tailwind',
      evidence: tailwindConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'styling',
    });
  }

  // Vitest configs
  const vitestConfigs = await listFiles(targetRoot, 'vitest.config.{js,ts,mjs,cjs}');
  if (vitestConfigs.length > 0) {
    detected.push({
      id: 'vitest',
      evidence: vitestConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'test-runner',
    });
  }

  // Playwright configs
  const playwrightConfigs = await listFiles(targetRoot, 'playwright.config.{js,ts,mjs,cjs}');
  if (playwrightConfigs.length > 0) {
    detected.push({
      id: 'playwright-test',
      evidence: playwrightConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'test-runner',
    });
  }

  // Jest configs
  const jestConfigs = await listFiles(targetRoot, 'jest.config.{js,ts,mjs,cjs,json}');
  if (jestConfigs.length > 0) {
    detected.push({
      id: 'jest',
      evidence: jestConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'test-runner',
    });
  }

  // Cypress configs
  const cypressConfigs = await listFiles(targetRoot, 'cypress.config.{js,ts,mjs,cjs,json}');
  if (cypressConfigs.length > 0) {
    detected.push({
      id: 'cypress',
      evidence: cypressConfigs.map((f) => `Configuration file: "${f}"`),
      confidence: 'high',
      category: 'test-runner',
    });
  }

  // Babel configs for React preset
  const babelFiles = await listFiles(targetRoot, ['.babelrc', 'babel.config.{js,ts,mjs,cjs,json}']);
  for (const babelFile of babelFiles) {
    try {
      const content = await fs.readFile(path.join(targetRoot, babelFile), 'utf8');
      if (content.includes('@babel/preset-react') || content.includes('babel-preset-react')) {
        detected.push({
          id: 'react',
          evidence: [`Babel configuration in "${babelFile}" includes React preset`],
          confidence: 'medium',
          category: 'framework',
        });
        break;
      }
    } catch {
      // Ignore read errors
    }
  }

  return detected;
}
