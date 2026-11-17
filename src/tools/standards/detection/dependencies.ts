import path from 'node:path';
import fs from 'node:fs/promises';
import { DetectedTechnology } from '../types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export async function detectDependencies(targetRoot: string): Promise<DetectedTechnology[]> {
  const pkgPath = path.join(targetRoot, 'package.json');
  let pkg: PackageJson;

  try {
    const raw = await fs.readFile(pkgPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch {
    // Missing or invalid package.json - ignore safely
    return [];
  }

  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  const detected: DetectedTechnology[] = [];

  function checkDep(
    pkgName: string,
    id: string,
    category: DetectedTechnology['category']
  ) {
    if (pkgName in allDeps) {
      detected.push({
        id,
        evidence: [`package.json dependency: "${pkgName}" (${allDeps[pkgName]})`],
        confidence: 'high',
        category,
      });
    }
  }

  // Languages & Frameworks
  checkDep('typescript', 'typescript', 'language');
  if ('react' in allDeps || 'react-dom' in allDeps) {
    const evidence: string[] = [];
    if ('react' in allDeps) evidence.push(`package.json dependency: "react" (${allDeps['react']})`);
    if ('react-dom' in allDeps) evidence.push(`package.json dependency: "react-dom" (${allDeps['react-dom']})`);
    detected.push({
      id: 'react',
      evidence,
      confidence: 'high',
      category: 'framework',
    });
  }

  // Styling
  checkDep('sass', 'css', 'styling');
  checkDep('sass-embedded', 'css', 'styling');
  checkDep('tailwindcss', 'tailwind', 'styling');
  checkDep('styled-components', 'styled-components', 'styling');

  // Testing
  checkDep('vitest', 'vitest', 'test-runner');
  checkDep('@playwright/test', 'playwright-test', 'test-runner');
  checkDep('@testing-library/react', 'react-testing-library', 'testing-utility');

  // Unsupported runners (recorded for reporting and testing.md trigger)
  checkDep('jest', 'jest', 'test-runner');
  checkDep('cypress', 'cypress', 'test-runner');

  return detected;
}
