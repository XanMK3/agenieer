import path from 'node:path';
import fs from 'node:fs/promises';
import { DetectedTechnology } from '../types.js';
import { listFiles } from '@/core/filesystem.js';

export interface SourceScanResult {
  detected: DetectedTechnology[];
  hasTsFiles: boolean;
  hasJsFiles: boolean;
  hasJsAppFiles: boolean;
  jsFiles: string[];
  tsFiles: string[];
}

const COMMON_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/coverage/**',
  '**/docs/standards/**',
  'docs/standards/**',
  '**/templates/**',
  'templates/**',
  '**/fixtures/**',
  'fixtures/**',
  '**/__fixtures__/**',
  '__fixtures__/**',
  '**/__mocks__/**',
  '__mocks__/**',
];

function isToolingOrConfigFile(filePath: string): boolean {
  const base = path.basename(filePath);
  // Match *.config.js, *.conf.js, .*rc.js, etc.
  if (/\.(config|conf)\.(js|mjs|cjs)$/i.test(base)) return true;
  if (/^\..*rc(\.(js|mjs|cjs))?$/i.test(base)) return true;
  // Common root config names
  if (/^(vite|webpack|rollup|babel|eslint|prettier|jest|vitest|playwright|postcss|tailwind)\.config\./i.test(base)) return true;
  // If located in scripts directory
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('scripts/')) return true;
  return false;
}

export async function detectSourceFiles(targetRoot: string): Promise<SourceScanResult> {
  const detected: DetectedTechnology[] = [];

  // TS / TSX files
  const tsFiles = await listFiles(targetRoot, ['**/*.ts', '**/*.tsx'], {
    ignore: COMMON_IGNORE,
  });

  if (tsFiles.length > 0) {
    const sample = tsFiles.slice(0, 5).join(', ');
    detected.push({
      id: 'typescript',
      evidence: [`TypeScript source files found (${tsFiles.length} files, e.g. ${sample})`],
      confidence: 'high',
      category: 'language',
    });
  }

  // React JSX/TSX
  const reactFiles = tsFiles
    .filter((f) => f.endsWith('.tsx'))
    .concat(await listFiles(targetRoot, '**/*.jsx', { ignore: COMMON_IGNORE }));

  if (reactFiles.length > 0) {
    const sample = reactFiles.slice(0, 5).join(', ');
    detected.push({
      id: 'react',
      evidence: [`React component files found (${reactFiles.length} files, e.g. ${sample})`],
      confidence: 'high',
      category: 'framework',
    });
  }

  // JS / JSX files
  const jsFiles = await listFiles(targetRoot, ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'], {
    ignore: COMMON_IGNORE,
  });

  const appJsFiles = jsFiles.filter((f) => !isToolingOrConfigFile(f));

  // CSS Modules
  const cssModuleFiles = await listFiles(targetRoot, '**/*.module.css', {
    ignore: COMMON_IGNORE,
  });
  if (cssModuleFiles.length > 0) {
    const sample = cssModuleFiles.slice(0, 5).join(', ');
    detected.push({
      id: 'css-modules',
      evidence: [`CSS Module files found (${cssModuleFiles.length} files, e.g. ${sample})`],
      confidence: 'high',
      category: 'styling',
    });
  }

  // All CSS files
  const allCssFiles = await listFiles(targetRoot, '**/*.css', {
    ignore: COMMON_IGNORE,
  });
  if (allCssFiles.length > 0) {
    const sample = allCssFiles.slice(0, 5).join(', ');
    detected.push({
      id: 'css',
      evidence: [`CSS files found (${allCssFiles.length} files, e.g. ${sample})`],
      confidence: 'high',
      category: 'styling',
    });

    // Check for @tailwind directive in CSS files
    for (const cssFile of allCssFiles.slice(0, 10)) {
      try {
        const content = await fs.readFile(path.join(targetRoot, cssFile), 'utf8');
        if (content.includes('@tailwind') || content.includes('@import "tailwindcss"') || content.includes("@import 'tailwindcss'")) {
          detected.push({
            id: 'tailwind',
            evidence: [`Tailwind directive detected in "${cssFile}"`],
            confidence: 'high',
            category: 'styling',
          });
          break;
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Check for styled-components imports and RTL imports in source files
  const scanSources = tsFiles.concat(jsFiles).slice(0, 50); // Bounded scan
  let foundStyledComponents = false;
  let foundRtl = false;

  for (const file of scanSources) {
    try {
      const content = await fs.readFile(path.join(targetRoot, file), 'utf8');
      if (!foundStyledComponents && /from\s+['"]styled-components['"]|require\(['"]styled-components['"]\)/.test(content)) {
        foundStyledComponents = true;
        detected.push({
          id: 'styled-components',
          evidence: [`styled-components import found in "${file}"`],
          confidence: 'high',
          category: 'styling',
        });
      }
      if (!foundRtl && /from\s+['"]@testing-library\/react['"]|require\(['"]@testing-library\/react['"]\)/.test(content)) {
        foundRtl = true;
        detected.push({
          id: 'react-testing-library',
          evidence: [`@testing-library/react import found in "${file}"`],
          confidence: 'high',
          category: 'testing-utility',
        });
      }
      if (foundStyledComponents && foundRtl) break;
    } catch {
      // Ignore read errors
    }
  }

  return {
    detected,
    hasTsFiles: tsFiles.length > 0,
    hasJsFiles: jsFiles.length > 0,
    hasJsAppFiles: appJsFiles.length > 0,
    jsFiles,
    tsFiles,
  };
}
