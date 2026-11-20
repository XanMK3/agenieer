import { DetectedTechnology } from './types.js';

const TEMPLATE_REGISTRY = {
  'data-safety': { file: 'data-safety.md', requires: [] as string[] },
  javascript: { file: 'javascript.md', requires: ['data-safety'] },
  typescript: { file: 'typescript.md', requires: ['data-safety'] },
  html: { file: 'html.md', requires: [] as string[] },
  react: { file: 'react.md', requires: [] as string[] },
  vue: { file: 'vue.md', requires: ['html'] },
  css: { file: 'css.md', requires: [] as string[] },
  tailwind: { file: 'tailwind.md', requires: ['css'] },
  'css-modules': { file: 'css-modules.md', requires: ['css'] },
  'styled-components': { file: 'styled-components.md', requires: ['css'] },
  testing: { file: 'testing.md', requires: [] as string[] },
  vitest: { file: 'testing/vitest.md', requires: ['testing'] },
  'playwright-test': { file: 'testing/playwright.md', requires: ['testing'] },
  'react-testing-library': { file: 'testing/react-testing-library.md', requires: ['testing'] },
} as const;

type TemplateId = keyof typeof TEMPLATE_REGISTRY;

export interface ResolvedStandard {
  id: string;
  templateFile: string;      // relative path within templates/standards/
  outputFile: string;        // relative path within docs/standards/ in target repo
  applicablePatterns: string[];
  usageContext: string;
}

/** Mapping from technology id to file patterns and usage context */
const APPLICABILITY: Record<string, { patterns: string[]; context: string }> = {
  'data-safety': {
    patterns: [],
    context: 'External or untrusted data; data import/export or transformation; persistence and generated datasets; large inputs, downloads, uploads, or streams. Read only when the task involves these contexts.',
  },
  javascript: {
    patterns: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs', '**/*.vue'],
    context: 'JavaScript application code, including Vue SFC script blocks using JavaScript',
  },
  typescript: {
    patterns: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    context: 'TypeScript application code, including Vue SFC script blocks using lang="ts"',
  },
  react: {
    patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'],
    context: 'React components and hooks only when framework evidence or task context establishes React; JSX/TSX and generic component/hook directories do not establish ownership. Native components do not require HTML. React Native Web uses HTML only where DOM semantics apply.',
  },
  html: {
    patterns: ['**/*.html', '**/*.htm', '**/*.vue', '**/*.jsx', '**/*.tsx'],
    context: 'Standalone HTML and markup portions of Vue templates or React DOM components. Read only when markup semantics are relevant, not for unrelated hooks, composables, SFC script/style changes, or native-style components merely rendered on the web.',
  },
  vue: {
    patterns: ['**/*.vue', '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    context: 'Vue SFCs, components and composables when Vue ownership is established. Compose with HTML for templates, the script language for logic, and CSS for supported style blocks.',
  },
  css: {
    patterns: ['**/*.css', '**/*.scss', '**/*.sass', '**/*.vue'],
    context: 'CSS and styling files, including Vue SFC CSS/SCSS/Sass style blocks',
  },
  tailwind: {
    patterns: ['**/*.css', '**/*.tsx', '**/*.jsx', '**/*.html', '**/*.vue'],
    context: 'Tailwind CSS utility usage in source files and stylesheets',
  },
  'css-modules': {
    patterns: ['**/*.module.css', '**/*.module.scss', '**/*.module.sass'],
    context: 'CSS Module files and components that import them',
  },
  'styled-components': {
    patterns: ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js'],
    context: 'Components using styled-components',
  },
  testing: {
    patterns: [
      '**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx',
      '**/*.spec.ts', '**/*.spec.tsx', '**/*.spec.js', '**/*.spec.jsx',
      '**/__tests__/**/*', '**/tests/**/*',
    ],
    context: 'All test files, test helpers, and testing infrastructure',
  },
  vitest: {
    patterns: [
      '**/*.test.ts', '**/*.test.tsx', '**/*.test.js',
      '**/*.spec.ts', '**/*.spec.js', '**/__tests__/**/*',
    ],
    context: 'Vitest test suites and unit/component tests',
  },
  'playwright-test': {
    patterns: [
      '**/*.spec.ts', '**/*.spec.js', '**/tests/e2e/**/*', '**/e2e/**/*',
    ],
    context: 'Playwright Test end-to-end test suites',
  },
  'react-testing-library': {
    patterns: [
      '**/*.test.tsx', '**/*.test.jsx', '**/__tests__/**/*.tsx', '**/__tests__/**/*.jsx',
    ],
    context: 'React Testing Library component tests',
  },
};

/** Unsupported runners — do not resolve to any template */
const UNSUPPORTED_IDS = new Set(['jest', 'cypress']);

/**
 * Expand a set of technology ids to include all transitive requirements.
 */
function expandTransitive(ids: Set<TemplateId>, reactWeb: boolean): Set<TemplateId> {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Array.from(result)) {
      const entry = TEMPLATE_REGISTRY[id];
      if (!entry) continue;
      for (const req of [...entry.requires, ...(id === 'react' && reactWeb ? ['html'] : [])]) {
        const reqId = req as TemplateId;
        if (!result.has(reqId)) {
          result.add(reqId);
          changed = true;
        }
      }
    }
  }
  return result;
}

/**
 * Resolve detected technologies into applicable standards.
 * Returns them in a stable, deterministic order.
 */
export function resolveStandards(detected: DetectedTechnology[]): ResolvedStandard[] {
  const detectedIds = new Set(detected.map((d) => d.id));

  // Determine which template IDs to select
  const selectedIds = new Set<TemplateId>();

  for (const id of detectedIds) {
    // Skip unsupported runners — they don't map to a template
    if (UNSUPPORTED_IDS.has(id)) continue;
    // Skip generic 'testing' — it's added below based on test evidence
    if (id === 'testing') continue;

    if (id in TEMPLATE_REGISTRY) {
      selectedIds.add(id as TemplateId);
    }
  }

  // If 'testing' was detected (triggered by any test evidence), add it
  if (detectedIds.has('testing')) {
    selectedIds.add('testing');
  }

  // Expand transitive requirements (e.g., tailwind → css)
  const expanded = expandTransitive(selectedIds, detected.some((d) => d.id === 'react' && (d.reactTarget === 'web' || d.reactTarget === 'mixed')));

  // Build ordered output: use a deterministic stable order matching the registry
  const registryOrder: TemplateId[] = [
    'data-safety',
    'javascript',
    'typescript',
    'html',
    'react',
    'vue',
    'css',
    'tailwind',
    'css-modules',
    'styled-components',
    'testing',
    'vitest',
    'playwright-test',
    'react-testing-library',
  ];

  const result: ResolvedStandard[] = [];

  for (const id of registryOrder) {
    if (!expanded.has(id)) continue;

    const entry = TEMPLATE_REGISTRY[id];
    const applicability = APPLICABILITY[id] ?? { patterns: [], context: '' };

    // Output file: same relative path as template file, under docs/standards/
    const outputFile = `docs/standards/${entry.file}`;

    result.push({
      id,
      templateFile: entry.file,
      outputFile,
      applicablePatterns: applicability.patterns,
      usageContext: applicability.context,
    });
  }

  return result;
}
