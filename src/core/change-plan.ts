import path from 'node:path';
import fs from 'node:fs';

export type ChangeAction = 'create' | 'skip' | 'patch' | 'conflict';

export interface PlannedChange {
  path: string;        // relative to target repo root
  action: ChangeAction;
  reason: string;
  content?: string;    // for create/patch
}

export interface RoutingChange {
  tech: string;
  action: 'activate' | 'deactivate';
}

export interface ChangePlan {
  changes: PlannedChange[];
  routingChanges: RoutingChange[];
}

/**
 * Preflight validation for a ChangePlan.
 * Checks for path traversal and references to files that will not exist.
 * Returns an array of error strings; an empty array means preflight passed.
 */
export function preflightPlan(plan: ChangePlan, targetRoot: string): string[] {
  const errors: string[] = [];
  const normalizedRoot = path.resolve(targetRoot);

  // Set of all files that will exist in the repo after changes are applied
  const existingOrCreatedPaths = new Set<string>();

  for (const change of plan.changes) {
    // 1. Path safety check
    const resolvedPath = path.resolve(normalizedRoot, change.path);
    const relative = path.relative(normalizedRoot, resolvedPath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      errors.push(`Path traversal detected: "${change.path}" escapes target root "${targetRoot}"`);
      continue;
    }

    if (change.action === 'create' || change.action === 'patch') {
      if (typeof change.content !== 'string') {
        errors.push(`Change for "${change.path}" with action "${change.action}" requires content`);
      }
    }

    // Normalized relative path with forward slashes
    const normalizedRelPath = relative.replace(/\\/g, '/');

    if (change.action === 'create' || change.action === 'skip') {
      existingOrCreatedPaths.add(normalizedRelPath);
    }
  }

  // 2. Validate links in generated docs/standards/README.md
  const readmeChange = plan.changes.find(
    (c) => c.path.replace(/\\/g, '/') === 'docs/standards/README.md' && c.content
  );

  if (readmeChange && readmeChange.content) {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(readmeChange.content)) !== null) {
      const rawTarget = match[2].trim();
      // Skip web links, email, mailto, and anchor-only links
      if (/^(https?:|mailto:|#)/.test(rawTarget)) {
        continue;
      }

      // Remove anchor part if any
      const [linkPath] = rawTarget.split('#');
      if (!linkPath) {
        continue;
      }

      // Standards README is in docs/standards/
      // Links in README are relative to docs/standards/
      const resolvedFromStandardsDir = path.posix.normalize(
        path.posix.join('docs/standards', linkPath)
      );

      // Check path traversal in link
      if (resolvedFromStandardsDir.startsWith('..')) {
        errors.push(`README link "${rawTarget}" points outside target repository`);
        continue;
      }

      // Check if file is planned or exists on disk
      const fullDiskPath = path.resolve(normalizedRoot, resolvedFromStandardsDir);
      const existsOnDisk = fs.existsSync(fullDiskPath);
      const plannedToExist = existingOrCreatedPaths.has(resolvedFromStandardsDir);

      if (!existsOnDisk && !plannedToExist) {
        errors.push(
          `README references file "${rawTarget}" (${resolvedFromStandardsDir}) which does not exist and is not planned to be created`
        );
      }
    }
  }

  return errors;
}
