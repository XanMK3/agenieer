import path from 'node:path';
import fs from 'node:fs/promises';
import { ResolvedStandard } from '../resolver.js';
import { PlannedChange } from '@/core/change-plan.js';
import { fileExists } from '@/core/filesystem.js';

/**
 * Plan file create/skip actions for each resolved standard.
 * Never plans deletion or overwriting.
 *
 * @param standards - Resolved standards to plan
 * @param targetRoot - Absolute path to target repository root
 * @param templateRoot - Absolute path to the templates/standards directory
 */
export async function planStandardsFiles(
  standards: ResolvedStandard[],
  targetRoot: string,
  templateRoot: string
): Promise<PlannedChange[]> {
  const changes: PlannedChange[] = [];

  for (const standard of standards) {
    const outputPath = standard.outputFile; // relative: docs/standards/...
    const absoluteOutputPath = path.join(targetRoot, outputPath);
    const absoluteTemplatePath = path.join(templateRoot, standard.templateFile);

    const alreadyExists = await fileExists(absoluteOutputPath);

    if (alreadyExists) {
      changes.push({
        path: outputPath,
        action: 'skip',
        reason: 'file already exists (preserved)',
      });
    } else {
      // Read template content
      let templateContent: string;
      try {
        templateContent = await fs.readFile(absoluteTemplatePath, 'utf8');
      } catch {
        changes.push({
          path: outputPath,
          action: 'conflict',
          reason: `Template file not found: ${standard.templateFile}`,
        });
        continue;
      }

      changes.push({
        path: outputPath,
        action: 'create',
        reason: `Creating from template: ${standard.templateFile}`,
        content: templateContent,
      });
    }
  }

  return changes;
}
