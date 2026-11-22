import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveStandards } from '@/tools/standards/resolver.js';
import { renderReadmeSection } from '@/tools/standards/generation/readme.js';
import { extractActiveIds } from '@/tools/standards/generation/plan.js';

const resolve = (...ids: string[]) => resolveStandards(ids.map((id) => ({ id, evidence: [], confidence: 'high' })));
const template = (name: string) => fs.readFile(path.resolve('templates/standards', `${name}.md`), 'utf8');

describe('Asynchronous Concurrency integration', () => {
  it.each(['javascript', 'typescript', 'react', 'vue'])('inherits through %s without requiring other language evidence', (id) => {
    const standards = resolve(id);
    const shared = standards.filter((s) => s.id === 'async-concurrency');
    expect(shared).toHaveLength(1);
    expect(shared[0].applicablePatterns).toEqual([]);
    expect(shared[0].outputFile).toBe('docs/standards/async-concurrency.md');
    expect(standards.map((s) => s.id)).toContain(id);
    if (id === 'vue') expect(standards.map((s) => s.id)).toContain('html');
  });
  it.each(['html', 'css', 'testing'])('does not select for %s alone', (id) => {
    expect(resolve(id).map((s) => s.id)).not.toContain('async-concurrency');
  });
  it.each([
    ['javascript'], ['typescript'], ['react'], ['vue'],
    ['javascript', 'typescript', 'react', 'vue'], ['html', 'css'],
  ])('renders contextual routing for %j', async (...ids) => {
    const standards = resolve(...ids);
    const output = renderReadmeSection(standards, []);
    expect(extractActiveIds(output)).toEqual(new Set(standards.map((s) => s.id)));
    const patterns = output.split('## Applicable File Patterns')[1].split('## Composition Examples')[0];
    expect(patterns).not.toContain('async-concurrency');
    const active = standards.some((s) => s.id === 'async-concurrency');
    expect(output.includes('[Asynchronous Concurrency](async-concurrency.md)')).toBe(active);
    if (active) expect(output).toContain('Read when introducing, modifying, or reviewing asynchronous work');
    const examples = output.split('## Composition Examples')[1];
    for (const [id, title] of [['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['react', 'React'], ['vue', 'Vue'], ['data-safety', 'Data Safety']]) {
      if (!ids.includes(id) && !standards.some((s) => s.id === id)) expect(examples).not.toContain(`**${title}**`);
    }
    for (const match of output.matchAll(/\]\(([^)]+\.md)\)/g)) {
      await expect(fs.stat(path.resolve('templates/standards', match[1]))).resolves.toBeDefined();
    }
    for (const line of (await template('async-concurrency')).split('\n').filter((line) => line.startsWith('- '))) {
      expect(output).not.toContain(line);
    }
  });
  it('retains the compact contract and delegates generic rules from framework templates', async () => {
    const shared = await template('async-concurrency');
    for (const obligation of ['latest-wins, parallel, serialized, deduplicated/shared, or transactional', 'active consumers', 'AbortController', 'AbortSignal', "Propagate the owner's signal", 'after asynchronous boundaries', 'data, errors, loading, progress, completion', 'newer-operation cleanup', 'operation identity independently of item identity', 'aborted signal alone', 'Preserve real errors', 'unhandled rejections', 'listeners, timers, subscriptions, readers, streams', 'does not guarantee rollback', 'serialization, transactions, version checks, or idempotency', 'A → B → A', 'non-cancellable operations', 'deterministic tests']) {
      expect(shared).toContain(obligation);
    }
    expect(await template('javascript')).not.toContain('Cancel superseded requests');
    expect(await template('react')).toContain('not event handlers or ordinary data flow');
    expect(await template('react')).toContain('development lifecycle re-runs');
    expect(await template('vue')).toContain("APIs supported by the project's Vue version");
    for (const name of ['react', 'vue']) expect(await template(name)).toContain('Follow Asynchronous Concurrency');
  });
});
