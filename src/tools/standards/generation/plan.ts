import path from 'node:path';
import { ResolvedStandard } from '../resolver.js';
import { DetectedTechnology } from '../types.js';
import { ChangePlan, PlannedChange, RoutingChange, preflightPlan } from '@/core/change-plan.js';
import { fileExists, readFileText } from '@/core/filesystem.js';
import { planStandardsFiles } from './standards.js';
import { renderReadmeSection, README_START_MARKER, README_END_MARKER } from './readme.js';
import { renderAgentsSection, AGENTS_START_MARKER, AGENTS_END_MARKER } from './agents.js';

/** Result of parsing a managed section from file content */
interface ParsedManagedSection {
  before: string;
  section: string;
  after: string;
}

/**
 * Parse a managed section from file content.
 * Returns null if the markers are absent (new file).
 * Returns an object if the markers are well-formed.
 * Throws a descriptive error if the markers are malformed (duplicated, mismatched order, etc.)
 */
export function parseManagedSection(
  content: string,
  startMarker: string,
  endMarker: string
): ParsedManagedSection | null {
  const startCount = content.split(startMarker).length - 1;
  const endCount = content.split(endMarker).length - 1;

  if (startCount === 0 && endCount === 0) {
    return null; // No managed section
  }

  if (startCount !== 1 || endCount !== 1) {
    throw new Error(
      `Malformed managed section markers: found ${startCount} start marker(s) and ${endCount} end marker(s)`
    );
  }

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (endIdx < startIdx) {
    throw new Error('Malformed managed section: end marker appears before start marker');
  }

  const before = content.slice(0, startIdx);
  const section = content.slice(startIdx, endIdx + endMarker.length);
  const after = content.slice(endIdx + endMarker.length);

  return { before, section, after };
}

/**
 * Replace the managed section in existing content with new content.
 * The newSection should include the markers.
 */
export function replaceManagedSection(
  parsed: ParsedManagedSection,
  newSection: string
): string {
  return parsed.before + newSection + parsed.after;
}

/**
 * Extract all standard IDs currently active in the README managed section.
 */
export function extractActiveIds(readmeContent: string): Set<string> {
  const active = new Set<string>();
  // Look for links within the managed section
  const parsed = parseManagedSection(readmeContent, README_START_MARKER, README_END_MARKER);
  if (!parsed) return active;

  const section = parsed.section;
  // Links like [TypeScript](typescript.md) or [Vitest](testing/vitest.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let match: RegExpExecArray | null;

  const fileToId: Record<string, string> = {
    'async-concurrency.md': 'async-concurrency',
    'data-safety.md': 'data-safety',
    'javascript.md': 'javascript',
    'typescript.md': 'typescript',
    'html.md': 'html',
    'vue.md': 'vue',
    'react.md': 'react',
    'css.md': 'css',
    'tailwind.md': 'tailwind',
    'css-modules.md': 'css-modules',
    'styled-components.md': 'styled-components',
    'testing.md': 'testing',
    'testing/vitest.md': 'vitest',
    'testing/playwright.md': 'playwright-test',
    'testing/react-testing-library.md': 'react-testing-library',
  };

  while ((match = linkRegex.exec(section)) !== null) {
    const linkTarget = match[2];
    if (linkTarget in fileToId) {
      active.add(fileToId[linkTarget]);
    }
  }

  return active;
}

/** Build the content for a patched or new README managed section */
function buildReadmeContent(
  existingContent: string | null,
  standards: ResolvedStandard[],
  unsupportedRunners: string[]
): { content: string; action: 'create' | 'patch'; malformed: boolean } {
  const newSection = renderReadmeSection(standards, unsupportedRunners);

  if (existingContent === null) {
    // New file
    return { content: newSection + '\n', action: 'create', malformed: false };
  }

  // Try to parse existing managed section
  let parsed: ParsedManagedSection | null = null;
  let malformed = false;

  try {
    parsed = parseManagedSection(existingContent, README_START_MARKER, README_END_MARKER);
  } catch {
    malformed = true;
  }

  if (malformed) {
    return { content: '', action: 'patch', malformed: true };
  }

  if (parsed === null) {
    // No existing managed section — append it
    const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
    return { content: existingContent + separator + newSection + '\n', action: 'patch', malformed: false };
  }

  // Replace existing managed section
  return {
    content: replaceManagedSection(parsed, newSection),
    action: 'patch',
    malformed: false,
  };
}

/** Build the content for a patched or new AGENTS.md managed section */
function buildAgentsContent(
  existingContent: string | null
): { content: string; action: 'create' | 'patch'; malformed: boolean } {
  const newSection = renderAgentsSection();

  if (existingContent === null) {
    return { content: newSection + '\n', action: 'create', malformed: false };
  }

  let parsed: ParsedManagedSection | null = null;
  let malformed = false;

  try {
    parsed = parseManagedSection(existingContent, AGENTS_START_MARKER, AGENTS_END_MARKER);
  } catch {
    malformed = true;
  }

  if (malformed) {
    return { content: '', action: 'patch', malformed: true };
  }

  if (parsed === null) {
    const separator = existingContent.endsWith('\n') ? '\n' : '\n\n';
    return { content: existingContent + separator + newSection + '\n', action: 'patch', malformed: false };
  }

  // Check if existing content is already up to date
  const replaced = replaceManagedSection(parsed, newSection);
  return { content: replaced, action: 'patch', malformed: false };
}

export interface BuildChangePlanOptions {
  targetRoot: string;
  templateRoot: string;
  standards: ResolvedStandard[];
  detected: DetectedTechnology[];
  /** Whether detection found at least one supported technology */
  hasRecognizedStack: boolean;
}

/**
 * Build a complete change plan including standards files, README, and AGENTS.md.
 */
export async function buildChangePlan(options: BuildChangePlanOptions): Promise<ChangePlan> {
  const { targetRoot, templateRoot, standards, detected, hasRecognizedStack } = options;

  const changes: PlannedChange[] = [];
  const routingChanges: RoutingChange[] = [];

  // 1. Plan standards files
  const standardsChanges = await planStandardsFiles(standards, targetRoot, templateRoot);
  changes.push(...standardsChanges);

  // 2. Determine unsupported runners (for README notice)
  const unsupportedRunners: string[] = [];
  for (const tech of detected) {
    if (tech.id === 'jest' || tech.id === 'cypress') {
      unsupportedRunners.push(tech.id === 'jest' ? 'Jest' : 'Cypress');
    }
  }

  // 3. Plan README.md
  const readmePath = 'docs/standards/README.md';
  const absoluteReadmePath = path.join(targetRoot, readmePath);
  let existingReadmeContent: string | null = null;

  if (await fileExists(absoluteReadmePath)) {
    existingReadmeContent = await readFileText(absoluteReadmePath);
  }

  // Determine routing changes (activate/deactivate) only when we have a recognized stack
  let previousActiveIds = new Set<string>();
  if (existingReadmeContent !== null) {
    try {
      previousActiveIds = extractActiveIds(existingReadmeContent);
    } catch {
      // Malformed markers — extractActiveIds handles gracefully
    }
  }

  const currentActiveIds = new Set(standards.map((s) => s.id));

  if (hasRecognizedStack) {
    // Compute routing changes
    for (const id of currentActiveIds) {
      if (!previousActiveIds.has(id)) {
        routingChanges.push({ tech: id, action: 'activate' });
      }
    }
    for (const id of previousActiveIds) {
      if (!currentActiveIds.has(id)) {
        routingChanges.push({ tech: id, action: 'deactivate' });
      }
    }
  }
  // If no recognized stack, we preserve existing routing — no routing changes

  if (!hasRecognizedStack && previousActiveIds.size > 0 && existingReadmeContent !== null) {
    changes.push({
      path: readmePath,
      action: 'skip',
      reason: 'Preserving existing managed routing (zero-technology detection)',
    });
  } else {
    const { content: readmeContent, action: readmeAction, malformed: readmeMalformed } =
      buildReadmeContent(existingReadmeContent, standards, unsupportedRunners);

    if (readmeMalformed) {
      changes.push({
        path: readmePath,
        action: 'conflict',
        reason: 'Malformed or duplicate managed section markers in existing README',
      });
    } else {
      // Check if content actually changed (for idempotent reruns)
      if (existingReadmeContent !== null && readmeContent === existingReadmeContent) {
        changes.push({
          path: readmePath,
          action: 'skip',
          reason: 'No changes needed (content up to date)',
        });
      } else {
        changes.push({
          path: readmePath,
          action: readmeAction,
          reason: existingReadmeContent === null ? 'Creating standards routing index' : 'Updating managed routing section',
          content: readmeContent,
        });
      }
    }
  }

  // 4. Plan AGENTS.md
  const agentsPath = 'AGENTS.md';
  const absoluteAgentsPath = path.join(targetRoot, agentsPath);
  let existingAgentsContent: string | null = null;

  if (await fileExists(absoluteAgentsPath)) {
    existingAgentsContent = await readFileText(absoluteAgentsPath);
  }

  const { content: agentsContent, action: agentsAction, malformed: agentsMalformed } =
    buildAgentsContent(existingAgentsContent);

  if (agentsMalformed) {
    changes.push({
      path: agentsPath,
      action: 'conflict',
      reason: 'Malformed or duplicate managed section markers in existing AGENTS.md',
    });
  } else {
    if (existingAgentsContent !== null && agentsContent === existingAgentsContent) {
      changes.push({
        path: agentsPath,
        action: 'skip',
        reason: 'No changes needed (content up to date)',
      });
    } else {
      changes.push({
        path: agentsPath,
        action: agentsAction,
        reason: existingAgentsContent === null ? 'Creating AGENTS.md with standards reference' : 'Updating managed standards section',
        content: agentsContent,
      });
    }
  }

  return { changes, routingChanges };
}

/**
 * Run preflight validation and return errors.
 * This is a re-export of the core preflight for use in commands.
 */
export { preflightPlan };
