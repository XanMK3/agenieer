import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runInit, runGuidedSelector } from '@/tools/standards/commands/init.js';
import { runDetect } from '@/tools/standards/commands/detect.js';
import { resolveStandards } from '@/tools/standards/resolver.js';
import { renderReadmeSection } from '@/tools/standards/generation/readme.js';
import { extractActiveIds } from '@/tools/standards/generation/plan.js';
import type { DetectedTechnology, ReactTarget } from '@/tools/standards/types.js';
import * as prompts from '@clack/prompts';

vi.mock('@clack/prompts', () => ({
  select: vi.fn(), multiselect: vi.fn(), intro: vi.fn(), outro: vi.fn(), cancel: vi.fn(),
  isCancel: (value: unknown) => typeof value === 'symbol',
}));
let root: string;
beforeEach(async () => {
  vi.resetAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'agenieer-web-init-'));
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
async function write(file: string, content: string) {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), content);
}
async function deps(names: string[]) {
  await write('package.json', JSON.stringify({ dependencies: Object.fromEntries(names.map((name) => [name, '*'])) }));
}
const read = (file: string) => fs.readFile(path.join(root, file), 'utf8');
const initialize = (dryRun = false) => runInit({ targetRoot: root, nonInteractive: true, dryRun });
function tech(id: string, reactTarget?: ReactTarget): DetectedTechnology {
  return { id, reactTarget, evidence: [], confidence: 'high' };
}

describe('conditional resolution and routing', () => {
  it.each(['web', 'native', 'mixed', 'unknown'] as const)('resolves React %s', (target) => {
    const standards = resolveStandards([tech('react', target), tech('typescript')]);
    expect(standards.map((item) => item.id)).toEqual(['data-safety', 'typescript', ...(target === 'web' || target === 'mixed' ? ['html'] : []), 'react']);
  });
  it('keeps unspecified React unknown and preserves independent HTML', () => {
    expect(resolveStandards([tech('react')]).map((item) => item.id)).toEqual(['react']);
    expect(resolveStandards([tech('react', 'native'), tech('html')]).map((item) => item.id)).toEqual(['html', 'react']);
  });
  it('deduplicates shared requirements independently of detection order', () => {
    const input = [tech('react', 'web'), tech('vue'), tech('typescript'), tech('javascript'), tech('tailwind'), tech('css-modules'), tech('styled-components'), tech('vitest'), tech('playwright-test'), tech('react-testing-library')];
    const resolved = resolveStandards(input);
    expect(resolveStandards([...input].reverse())).toEqual(resolved);
    expect(resolved.map((item) => item.id)).toEqual(['data-safety', 'javascript', 'typescript', 'html', 'react', 'vue', 'css', 'tailwind', 'css-modules', 'styled-components', 'testing', 'vitest', 'playwright-test', 'react-testing-library']);
  });
  it('routes mixed content using task and framework context', () => {
    const standards = resolveStandards([tech('vue'), tech('react', 'mixed'), tech('typescript'), tech('javascript'), tech('css')]);
    const routing = renderReadmeSection(standards, []);
    expect(routing).toContain('Vue template markup → **Vue** + **HTML**');
    expect(routing).toContain('Vue composable or SFC script logic → **Vue**');
    expect(routing).toContain('React web component markup → **React** + **HTML**');
    expect(routing).toContain('React Native component or React hook logic → **React**');
    expect(routing).toContain('no HTML by default');
    expect(routing).toContain('Vue SFC style block → **CSS**');
    expect(routing).toContain('Standalone HTML → **HTML**');
    expect(routing).toContain('JSX/TSX alone does not establish React');
    expect(routing).not.toContain('src/components/**/*');
    expect(routing).not.toContain('src/hooks/**/*');
    for (const id of ['vue', 'javascript', 'typescript', 'css']) {
      expect(standards.find((item) => item.id === id)?.applicablePatterns).toContain('**/*.vue');
    }
    expect(extractActiveIds(routing)).toContain('html');
    expect(extractActiveIds(routing)).toContain('vue');
  });
});

describe('guided selection', () => {
  it.each([
    ['html', 'none', undefined, ['html']],
    ['javascript', 'vue', undefined, ['data-safety', 'javascript', 'html', 'vue']],
    ['typescript', 'vue', undefined, ['data-safety', 'typescript', 'html', 'vue']],
    ['typescript', 'react', 'web', ['data-safety', 'typescript', 'html', 'react']],
    ['typescript', 'react', 'native', ['data-safety', 'typescript', 'react']],
    ['javascript', 'react', 'mixed', ['data-safety', 'javascript', 'html', 'react']],
    ['javascript', 'react', 'unknown', ['data-safety', 'javascript', 'react']],
  ])('selects %s / %s / %s', async (language, framework, target, expected) => {
    vi.mocked(prompts.select).mockResolvedValueOnce(language).mockResolvedValueOnce(framework);
    if (target) vi.mocked(prompts.select).mockResolvedValueOnce(target);
    vi.mocked(prompts.multiselect).mockResolvedValue([]);
    const selected = await runGuidedSelector();
    expect(selected).not.toBeNull();
    expect(resolveStandards(selected ?? []).map((item) => item.id)).toEqual(expected);
    expect(prompts.select).toHaveBeenCalledWith(expect.objectContaining({ options: expect.arrayContaining([expect.objectContaining({ value: 'html' })]) }));
    if (framework === 'react') expect(prompts.select).toHaveBeenCalledWith(expect.objectContaining({ initialValue: 'unknown' }));
  });
  it('preserves styling/testing selections and cancellation', async () => {
    vi.mocked(prompts.select).mockResolvedValueOnce('typescript').mockResolvedValueOnce('react').mockResolvedValueOnce('native');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['tailwind']).mockResolvedValueOnce(['vitest', 'react-testing-library']);
    expect(resolveStandards(await runGuidedSelector() ?? []).map((item) => item.id)).toEqual(['data-safety', 'typescript', 'react', 'css', 'tailwind', 'testing', 'vitest', 'react-testing-library']);
    vi.mocked(prompts.select).mockResolvedValueOnce('typescript').mockResolvedValueOnce('react').mockResolvedValueOnce(Symbol('cancel'));
    expect(await runGuidedSelector()).toBeNull();
  });
  it('initializes an empty HTML-only project through the selector', async () => {
    vi.mocked(prompts.select).mockResolvedValueOnce('html');
    vi.mocked(prompts.multiselect).mockResolvedValue([]);
    expect(await runInit({ targetRoot: root })).toBe(0);
    expect(await fs.readdir(path.join(root, 'docs/standards'))).toEqual(['README.md', 'html.md']);
    expect(await fs.readdir(root)).toEqual(['AGENTS.md', 'docs']);
  });
});

describe('initialization lifecycle and reporting', () => {
  it.each([
    [['react-dom'], ['react-native'], false],
    [['react-dom', 'vue'], ['react-dom'], true],
    [['react-dom', 'vue'], ['react-native'], false],
    [['vue'], ['typescript'], false],
  ] as const)('deactivates routes from %j to %j while retaining files', async (before, after, keepHtml) => {
    await deps([...before]);
    expect(await initialize()).toBe(0);
    await write('docs/standards/html.md', 'Customized HTML\n');
    if (before.some((name) => name === 'vue')) await write('docs/standards/vue.md', 'Customized Vue\n');
    const agents = await read('AGENTS.md');
    await deps([...after]);
    expect(await initialize()).toBe(0);
    expect(extractActiveIds(await read('docs/standards/README.md')).has('html')).toBe(keepHtml);
    expect(extractActiveIds(await read('docs/standards/README.md')).has('vue')).toBe(false);
    expect(await read('docs/standards/html.md')).toBe('Customized HTML\n');
    expect(await read('AGENTS.md')).toBe(agents);
    await deps([...before]);
    expect(await initialize()).toBe(0);
    expect(extractActiveIds(await read('docs/standards/README.md'))).toContain('html');
    expect(await read('docs/standards/html.md')).toBe('Customized HTML\n');
    if (before.some((name) => name === 'vue')) expect(await read('docs/standards/vue.md')).toBe('Customized Vue\n');
  });
  it('preserves customized standards, unmanaged text, and idempotence', async () => {
    await deps(['vue', 'react-dom']);
    await write('docs/standards/react.md', 'Customized React\n');
    await write('docs/standards/README.md', 'Personal notes\n');
    expect(await initialize()).toBe(0);
    const first = await read('docs/standards/README.md');
    expect(first).toContain('Personal notes\n');
    expect(await initialize()).toBe(0);
    expect(await read('docs/standards/README.md')).toBe(first);
    expect(await read('docs/standards/react.md')).toBe('Customized React\n');
    for (const match of first.matchAll(/\]\(([^)]+\.md)\)/g)) {
      await expect(fs.stat(path.join(root, 'docs/standards', match[1]))).resolves.toBeDefined();
    }
    expect(prompts.select).not.toHaveBeenCalled();
  });
  it('dry run writes nothing', async () => {
    await deps(['vue', 'react-dom']);
    const before = await fs.readdir(root);
    expect(await initialize(true)).toBe(0);
    expect(await fs.readdir(root)).toEqual(before);
  });
  it('preserves HTML-only manual routing when no technology is detected', async () => {
    await write('index.html', '<h1>Hello</h1>');
    expect(await initialize()).toBe(0);
    const routing = await read('docs/standards/README.md');
    await fs.unlink(path.join(root, 'index.html'));
    expect(await initialize()).toBe(0);
    expect(await read('docs/standards/README.md')).toBe(routing);
  });
  it('preserves partial conflict behavior with new templates', async () => {
    await deps(['vue']);
    await write('AGENTS.md', '<!-- agenieer:standards:start -->\n');
    expect(await initialize()).toBe(2);
    expect(await read('docs/standards/vue.md')).toContain('# Vue.js');
    expect(await read('docs/standards/html.md')).toContain('# HTML');
  });
  it('reports targets and inheritance separately from detection', async () => {
    await deps(['react-dom', 'react-native', 'vue']);
    await runDetect(root);
    const output = vi.mocked(console.log).mock.calls.flat().join('\n');
    expect(output).toContain('Rendering target: mixed');
    expect(output).toContain('web:');
    expect(output).toContain('native:');
    expect(output).toContain('Inherited through Vue and/or web-capable React');
    expect(output.split('Applicable standards:')[0]).not.toContain('  html');
  });
});
