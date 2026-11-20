import path from 'node:path';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detectTechnologies } from '../detection/index.js';
import { resolveStandards } from '../resolver.js';
import { buildChangePlan, extractActiveIds, parseManagedSection } from '../generation/plan.js';
import { README_START_MARKER, README_END_MARKER } from '../generation/readme.js';
import { writeFileAtomic, fileExists, readFileText } from '@/core/filesystem.js';
import {
  logCreated,
  logUpdated,
  logSkipped,
  logConflict,
  logRouteActivated,
  logRouteDeactivated,
  logInfo,
  logWarn,
  logError,
} from '@/core/logger.js';
import { DetectedTechnology, ReactTarget } from '../types.js';
import { ResolvedStandard } from '../resolver.js';
import { ChangePlan, PlannedChange } from '@/core/change-plan.js';
import { preflightPlan } from '../generation/plan.js';

/** Resolve the absolute path to the bundled templates/standards directory */
export function resolveTemplateRoot(): string {
  let curr = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(curr, 'templates', 'standards');
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'standards');
}

export interface InitOptions {
  dryRun?: boolean;
  nonInteractive?: boolean;
  targetRoot: string;
}

export async function runInit(options: InitOptions): Promise<number> {
  const { dryRun = false, nonInteractive = false, targetRoot } = options;
  const templateRoot = resolveTemplateRoot();

  logInfo(`Target: ${targetRoot}`);
  if (dryRun) logInfo('Dry run — no files will be written');
  console.log('');

  // Step 1: Detect technologies
  let detected: DetectedTechnology[];
  try {
    detected = await detectTechnologies(targetRoot);
  } catch (err: any) {
    logError(`Detection failed: ${err.message}`);
    return 1;
  }

  const supportedIds = new Set(['html', 'vue', 'javascript', 'typescript', 'react', 'css', 'css-modules', 'tailwind', 'styled-components', 'testing', 'vitest', 'playwright-test', 'react-testing-library']);
  const supportedDetected = detected.filter((d) => supportedIds.has(d.id));
  const hasRecognizedStack = supportedDetected.length > 0;

  let resolvedDetected = detected;

  // Step 2: If nothing detected, check for existing managed routing or run guided selector
  if (!hasRecognizedStack) {
    const readmePath = path.join(targetRoot, 'docs/standards/README.md');
    let hasUsableRouting = false;

    if (await fileExists(readmePath)) {
      try {
        const content = await readFileText(readmePath);
        const parsed = parseManagedSection(content, README_START_MARKER, README_END_MARKER);
        if (parsed) {
          const activeIds = extractActiveIds(content);
          hasUsableRouting = activeIds.size > 0;
        }
      } catch {
        // Malformed markers — not usable
      }
    }

    if (hasUsableRouting) {
      logInfo('No technologies detected. Existing managed routing preserved.');
      console.log('');
      // Build plan with empty standards (preserves existing routing)
      const plan = await buildChangePlan({
        targetRoot,
        templateRoot,
        standards: [],
        detected,
        hasRecognizedStack: false,
      });
      return await executePlan(plan, targetRoot, dryRun);
    }

    // Need guided selection
    if (nonInteractive) {
      logError('No supported technologies detected and no usable existing managed routing.');
      logError('Use interactive mode or run in a repository with detectable technologies.');
      return 1;
    }

    // Run guided selector
    logInfo('No technologies detected. Launching guided stack selector...');
    console.log('');

    const selectedDetected = await runGuidedSelector();
    if (selectedDetected === null) {
      logError('Stack selection cancelled.');
      return 1;
    }
    resolvedDetected = selectedDetected;
  }

  // Step 3: Resolve standards
  const standards = resolveStandards(resolvedDetected);

  if (standards.length === 0) {
    logWarn('No applicable standards resolved (may be using unsupported technologies only).');
  }

  // Step 4: Build change plan
  const plan = await buildChangePlan({
    targetRoot,
    templateRoot,
    standards,
    detected: resolvedDetected,
    hasRecognizedStack: hasRecognizedStack || resolvedDetected.length > 0,
  });

  // Step 5: Preflight
  const errors = preflightPlan(plan, targetRoot);
  if (errors.length > 0) {
    logError('Preflight validation failed:');
    for (const err of errors) {
      logError(`  ${err}`);
    }
    return 1;
  }

  // Step 6: Dry run — print and exit
  if (dryRun) {
    printPlan(plan);
    return 0;
  }

  // Step 7: Execute plan
  return await executePlan(plan, targetRoot, false);
}

export async function runGuidedSelector(): Promise<DetectedTechnology[] | null> {
  // Dynamic import to avoid loading @clack/prompts when not needed
  const { select, multiselect, intro, outro, cancel, isCancel } = await import('@clack/prompts');

  intro('Agenieer — Guided Stack Selector');

  const language = await select({
    message: 'Which language does this project use?',
    options: [
      { value: 'typescript', label: 'TypeScript' },
      { value: 'javascript', label: 'JavaScript' },
      { value: 'html', label: 'HTML only (no script language)' },
    ],
  });

  if (isCancel(language)) {
    cancel('Selection cancelled.');
    return null;
  }

  const framework = language === 'html' ? 'none' : await select({
    message: 'Which framework?',
    options: [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue' },
      { value: 'none', label: 'None' },
    ],
  });

  if (isCancel(framework)) {
    cancel('Selection cancelled.');
    return null;
  }

  let reactTarget: ReactTarget = 'unknown';
  if (framework === 'react') {
    const target = await select<ReactTarget>({
      message: 'Where does React render?',
      initialValue: 'unknown',
      options: [
        { value: 'unknown', label: 'Unknown / not established' },
        { value: 'web', label: 'Web (DOM)' },
        { value: 'native', label: 'React Native' },
        { value: 'mixed', label: 'Both web and native' },
      ],
    });
    if (isCancel(target)) {
      cancel('Selection cancelled.');
      return null;
    }
    reactTarget = target;
  }

  const stylingOptions = [
    { value: 'css', label: 'Plain CSS' },
    { value: 'tailwind', label: 'Tailwind CSS' },
    { value: 'css-modules', label: 'CSS Modules' },
    { value: 'styled-components', label: 'styled-components' },
  ];

  const styling = await multiselect({
    message: 'Which styling approaches? (space to select, enter to confirm)',
    options: stylingOptions,
    required: false,
  });

  if (isCancel(styling)) {
    cancel('Selection cancelled.');
    return null;
  }

  const testingOptions = [
    { value: 'vitest', label: 'Vitest' },
    { value: 'playwright-test', label: 'Playwright Test' },
  ];

  // RTL is relevant only when React is selected
  if (framework === 'react') {
    testingOptions.push({ value: 'react-testing-library', label: 'React Testing Library' });
  }

  const testing = await multiselect({
    message: 'Which testing tools? (space to select, enter to confirm)',
    options: testingOptions,
    required: false,
  });

  if (isCancel(testing)) {
    cancel('Selection cancelled.');
    return null;
  }

  outro('Stack selected!');

  // Build DetectedTechnology array from selections
  const result: DetectedTechnology[] = [];

  result.push({
    id: language as string,
    evidence: ['Guided stack selection'],
    confidence: 'high',
    category: 'language',
  });

  if (framework !== 'none') {
    result.push({
      id: framework as string,
      ...(framework === 'react' ? { reactTarget } : {}),
      evidence: ['Guided stack selection'],
      confidence: 'high',
      category: 'framework',
    });
  }

  for (const style of styling as string[]) {
    result.push({
      id: style,
      evidence: ['Guided stack selection'],
      confidence: 'high',
      category: 'styling',
    });
  }

  const testingArr = testing as string[];
  if (testingArr.length > 0) {
    result.push({
      id: 'testing',
      evidence: ['Guided stack selection'],
      confidence: 'high',
      category: 'testing-utility',
    });
    for (const tool of testingArr) {
      result.push({
        id: tool,
        evidence: ['Guided stack selection'],
        confidence: 'high',
        category: tool === 'react-testing-library' ? 'testing-utility' : 'test-runner',
      });
    }
  }

  return result;
}

function printPlan(plan: ChangePlan): void {
  console.log('Planned changes:');
  console.log('');

  for (const change of plan.changes) {
    const symbol =
      change.action === 'create' ? '+' :
      change.action === 'patch' ? '~' :
      change.action === 'skip' ? '=' :
      '!';
    console.log(`  [${symbol}] ${change.action.padEnd(8)} ${change.path}`);
    console.log(`           ${change.reason}`);
  }

  if (plan.routingChanges.length > 0) {
    console.log('');
    console.log('Routing changes:');
    for (const rc of plan.routingChanges) {
      const sym = rc.action === 'activate' ? '+' : '-';
      console.log(`  [${sym}] ${rc.action} ${rc.tech}`);
    }
  }
}

async function executePlan(plan: ChangePlan, targetRoot: string, dryRun: boolean): Promise<number> {
  let hasConflicts = false;
  let hasErrors = false;

  // Create standards files first
  const standardsChanges = plan.changes.filter((c) => c.path.startsWith('docs/standards/') && c.path !== 'docs/standards/README.md');
  const readmeChange = plan.changes.find((c) => c.path === 'docs/standards/README.md');
  const agentsChange = plan.changes.find((c) => c.path === 'AGENTS.md');
  const otherChanges = plan.changes.filter((c) => !standardsChanges.includes(c) && c !== readmeChange && c !== agentsChange);

  const orderedChanges = [...standardsChanges, ...otherChanges];
  if (readmeChange) orderedChanges.push(readmeChange);
  if (agentsChange) orderedChanges.push(agentsChange);

  for (const change of orderedChanges) {
    if (dryRun) {
      // Already printed above in printPlan
      continue;
    }

    try {
      if (change.action === 'create') {
        await writeFileAtomic(path.join(targetRoot, change.path), change.content!);
        logCreated(change.path);
      } else if (change.action === 'patch') {
        await writeFileAtomic(path.join(targetRoot, change.path), change.content!);
        logUpdated(change.path);
      } else if (change.action === 'skip') {
        logSkipped(change.path, change.reason);
      } else if (change.action === 'conflict') {
        logConflict(change.path, change.reason);
        hasConflicts = true;
      }
    } catch (err: any) {
      logError(`Failed to write ${change.path}: ${err.message}`);
      hasErrors = true;
    }
  }

  // Report routing changes
  for (const rc of plan.routingChanges) {
    if (rc.action === 'activate') {
      logRouteActivated(rc.tech);
    } else {
      logRouteDeactivated(rc.tech);
    }
  }

  console.log('');
  if (hasErrors) {
    logError('Initialization failed due to unexpected errors.');
    return 1;
  } else if (hasConflicts) {
    logWarn('Initialization completed with unresolved conflicts.');
    return 2;
  } else {
    logInfo('Initialization complete.');
    return 0;
  }
}
