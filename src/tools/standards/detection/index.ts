import { DetectedTechnology } from '../types.js';
import { detectDependencies } from './dependencies.js';
import { detectConfigFiles } from './config-files.js';
import { detectSourceFiles } from './source-files.js';
import { detectTesting } from './testing.js';

export async function detectTechnologies(targetRoot: string): Promise<DetectedTechnology[]> {
  const depDetected = await detectDependencies(targetRoot);
  const configDetected = await detectConfigFiles(targetRoot);
  const sourceScan = await detectSourceFiles(targetRoot);

  const initialSignals = [...depDetected, ...configDetected, ...sourceScan.detected];

  const testScan = await detectTesting(targetRoot, initialSignals);
  const allSignals = [...initialSignals, ...testScan.detected];

  // Group signals by ID
  const map = new Map<string, {
    id: string;
    evidence: Set<string>;
    confidence: 'high' | 'medium' | 'low';
    category?: DetectedTechnology['category'];
  }>();

  for (const signal of allSignals) {
    if (!map.has(signal.id)) {
      map.set(signal.id, {
        id: signal.id,
        evidence: new Set(signal.evidence),
        confidence: signal.confidence,
        category: signal.category,
      });
    } else {
      const existing = map.get(signal.id)!;
      for (const ev of signal.evidence) {
        existing.evidence.add(ev);
      }
      if (signal.confidence === 'high') {
        existing.confidence = 'high';
      }
      if (!existing.category && signal.category) {
        existing.category = signal.category;
      }
    }
  }

  // JS / TS selection logic:
  // - If TypeScript is detected (by dep, config, or source files):
  //   Only keep JavaScript if genuine JS application code exists alongside TS.
  //   Tooling files (vite.config.js, eslint.config.js, etc.) do NOT cause JavaScript to be selected.
  // - If TypeScript is NOT detected:
  //   If JS files exist, select JavaScript.
  const hasTs = map.has('typescript');

  if (hasTs) {
    if (sourceScan.hasJsAppFiles) {
      // Genuinely mixed codebase
      if (!map.has('javascript')) {
        map.set('javascript', {
          id: 'javascript',
          evidence: new Set(['JavaScript application source files found in mixed TS/JS codebase']),
          confidence: 'high',
          category: 'language',
        });
      }
    } else {
      // TS application with only tooling/config JS files (or no JS files at all)
      map.delete('javascript');
    }
  } else {
    // No TS detected
    if (sourceScan.hasJsFiles || sourceScan.hasJsAppFiles) {
      if (!map.has('javascript')) {
        map.set('javascript', {
          id: 'javascript',
          evidence: new Set([`JavaScript source files found (${sourceScan.jsFiles.length} files)`]),
          confidence: 'high',
          category: 'language',
        });
      }
    }
  }

  // Convert map to array
  const result: DetectedTechnology[] = [];
  for (const item of map.values()) {
    result.push({
      id: item.id,
      evidence: Array.from(item.evidence),
      confidence: item.confidence,
      category: item.category,
    });
  }

  return result;
}
