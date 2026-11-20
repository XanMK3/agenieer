import { detectTechnologies } from '../detection/index.js';
import { logInfo, logError } from '@/core/logger.js';
import { resolveStandards } from '../resolver.js';

export async function runDetect(targetRoot: string): Promise<void> {
  logInfo(`Scanning: ${targetRoot}`);
  console.log('');

  let detected;
  try {
    detected = await detectTechnologies(targetRoot);
  } catch (err: any) {
    logError(`Detection failed: ${err.message}`);
    process.exit(1);
  }

  if (detected.length === 0) {
    console.log('No supported technologies detected.');
    console.log('');
    console.log('Run `agenieer standards init` to use the guided stack selector.');
    return;
  }

  // Report detected technologies with evidence
  console.log('Detected technologies:');
  console.log('');

  for (const tech of detected) {
    const categoryLabel = tech.category ? ` [${tech.category}]` : '';
    const confidenceLabel = tech.confidence !== 'high' ? ` (confidence: ${tech.confidence})` : '';
    console.log(`  ${tech.id}${categoryLabel}${confidenceLabel}`);
    if (tech.id === 'react') {
      console.log(`    Rendering target: ${tech.reactTarget ?? 'unknown'}`);
      for (const platform of ['web', 'native'] as const) {
        for (const evidence of tech.platformEvidence?.[platform] ?? []) console.log(`    ${platform}: ${evidence}`);
      }
    }
    for (const ev of tech.evidence) {
      console.log(`    - ${ev}`);
    }
  }

  console.log('');

  // Report applicable standards
  const standards = resolveStandards(detected);

  if (standards.length === 0) {
    console.log('No applicable standards resolved (unsupported technologies only).');
  } else {
    console.log('Applicable standards:');
    console.log('');
    for (const std of standards) {
      console.log(`  ${std.outputFile}`);
      if (std.id === 'html' && !detected.some((tech) => tech.id === 'html')) {
        console.log('    Inherited through Vue and/or web-capable React');
      }
      console.log(`    Patterns: ${std.applicablePatterns.slice(0, 3).join(', ')}${std.applicablePatterns.length > 3 ? ' ...' : ''}`);
      console.log(`    Context:  ${std.usageContext}`);
    }
  }

  // Report unsupported runners
  const unsupportedRunners = detected.filter((d) => d.id === 'jest' || d.id === 'cypress');
  if (unsupportedRunners.length > 0) {
    console.log('');
    console.log('Unsupported testing frameworks (no v0.1 template, general testing.md installed instead):');
    for (const runner of unsupportedRunners) {
      console.log(`  - ${runner.id}`);
      for (const ev of runner.evidence) {
        console.log(`      ${ev}`);
      }
    }
  }
}
