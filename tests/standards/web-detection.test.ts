import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectTechnologies } from '@/tools/standards/detection/index.js';
import { resolveStandards } from '@/tools/standards/resolver.js';
import { MAX_INSPECTED_BYTES, inspectionFiles } from '@/tools/standards/detection/inspection.js';

let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'agenieer-web-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
async function write(file: string, content = '') {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), content);
}
async function dependencies(names: string[], file = 'package.json') {
  await write(file, JSON.stringify({ dependencies: Object.fromEntries(names.map((name) => [name, '*'])) }));
}
async function ids() { return (await detectTechnologies(root)).map((technology) => technology.id); }

describe('HTML and exclusions', () => {
  it.each(['index.html', 'src/pages/page.html', 'public/page.htm'])('detects %s without a manifest', async (file) => {
    await write(file, '<h1>Hello</h1>');
    expect(await ids()).toEqual(['html']);
  });
  it.each(['dist', 'build', 'coverage', 'node_modules', '.git', '.next', '.nuxt', '.output', '.cache', '.vite', '.turbo', 'vendor', 'docs/standards', 'docs/examples', 'fixtures', '__fixtures__', '__mocks__', 'templates'])('ignores %s', async (directory) => {
    await write(`${directory}/index.html`);
    await write(`${directory}/Example.vue`, '<script lang="ts"></script><style></style>');
    await write(`${directory}/example.test.tsx`, "import { test } from 'vitest';");
    expect(await ids()).toEqual([]);
  });
  it('ignores HTML examples embedded in Markdown', async () => {
    await write('README.md', '```html\n<html></html>\n```');
    expect(await ids()).toEqual([]);
  });
});

describe('framework evidence', () => {
  it.each(['vue', 'nuxt', '@vitejs/plugin-vue', 'vue-loader', 'vue-tsc', '@vue/babel-plugin-jsx'])('recognizes %s alone', async (name) => {
    await dependencies([name]);
    expect(await ids()).toEqual(['vue']);
    expect(resolveStandards(await detectTechnologies(root)).map((standard) => standard.id)).toEqual(['html', 'vue']);
  });
  it.each(['vite', 'vue-router', 'pinia', 'preact', 'expo'])('does not infer frameworks from %s alone', async (name) => {
    await dependencies([name]);
    expect(await ids()).toEqual([]);
  });
  it.each(['js', 'ts'])('recognizes Vue imports in %s', async (extension) => {
    await write(`src/useCounter.${extension}`, "import { ref } from 'vue';");
    expect(await ids()).toContain('vue');
    expect(await ids()).not.toContain('react');
  });
  it.each([
    ['vite.config.ts', "import vue from '@vitejs/plugin-vue'; export default { plugins: [vue()] };", 'vue'],
    ['webpack.config.js', "export default { module: { rules: [{ loader: 'vue-loader' }] } };", 'vue'],
    ['vue.config.js', 'module.exports = {};', 'vue'],
    ['nuxt.config.ts', 'export default defineNuxtConfig({});', 'vue'],
    ['babel.config.js', "module.exports = { plugins: ['@vue/babel-plugin-jsx'] };", 'vue'],
    ['.babelrc', '{"presets":["@babel/preset-react"]}', 'react'],
  ])('recognizes static integration in %s', async (file, content, framework) => {
    await write(file, content);
    expect(await ids()).toContain(framework);
  });
  it.each(['jsx', 'tsx'])('keeps bare %s framework-neutral', async (extension) => {
    await write(`src/View.${extension}`, 'export const View = () => <div/>;');
    expect(await ids()).toEqual([extension === 'tsx' ? 'typescript' : 'javascript']);
  });
  it.each(['react', 'vue', 'preact'])('classifies %s + TSX', async (framework) => {
    await dependencies([framework]);
    await write('src/View.tsx', 'export const View = () => <div/>;');
    expect(await ids()).toEqual(framework === 'preact' ? ['typescript'] : [framework, 'typescript'].sort());
  });
  it.each(['react', 'vue', 'preact'])('classifies JSX import source %s', async (framework) => {
    await write('tsconfig.json', `{// comment\n "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "${framework}", }, }`);
    const detected = await detectTechnologies(root);
    expect(detected.map((item) => item.id)).toEqual(framework === 'preact' ? ['typescript'] : [framework, 'typescript'].sort());
    if (framework === 'react') expect(detected.find((item) => item.id === 'react')?.reactTarget).toBe('unknown');
  });
  it.each(['react/jsx-runtime', 'react/jsx-dev-runtime', 'vue/jsx-runtime', 'preact/jsx-runtime'])('classifies runtime %s', async (runtime) => {
    await write('src/View.tsx', `import { jsx } from '${runtime}';`);
    const detected = await detectTechnologies(root);
    expect(detected.map((item) => item.id)).toEqual(runtime.startsWith('preact') ? ['typescript'] : [runtime.split('/')[0], 'typescript'].sort());
    if (runtime.startsWith('react')) expect(detected.find((item) => item.id === 'react')?.reactTarget).toBe('unknown');
  });
  it('does not infer a framework from jsx preserve', async () => {
    await write('tsconfig.json', '{"compilerOptions":{"jsx":"preserve"}}');
    expect(await ids()).toEqual(['typescript']);
  });
  it('ignores commented configuration and source signals', async () => {
    await write('src/app.ts', "// import React from 'react';\n/* import { ref } from 'vue'; */");
    await write('vite.config.ts', "// import react from '@vitejs/plugin-react';");
    expect(await ids()).toEqual(['typescript']);
  });
  it.each([
    ['src/example.ts', `const example = "import React from 'react'"; const other = \`import { ref } from 'vue'\`;`],
    ['vite.config.ts', `const example = "import react from '@vitejs/plugin-react'";`],
    ['tsconfig.json', '{"compilerOptions":{"jsx":"react-jsx", "jsxImportSource":"preact"}}'],
    ['babel.config.ts', `export default { presets: [['@babel/preset-react', { runtime: 'automatic', importSource: 'preact' }]] };`],
  ])('does not infer React from text or alternative runtime in %s', async (file, content) => {
    await write(file, content);
    expect(await ids()).not.toContain('react');
  });
  it.each(['react', 'react-jsx', 'react-jsxdev'])('recognizes default JSX compiler mode %s without assuming web', async (mode) => {
    await write('tsconfig.json', JSON.stringify({ compilerOptions: { jsx: mode } }));
    expect((await detectTechnologies(root)).find((item) => item.id === 'react')?.reactTarget).toBe('unknown');
  });
  it('detects both frameworks independently', async () => {
    await dependencies(['react', 'vue']);
    await write('src/View.tsx');
    expect(await ids()).toEqual(['react', 'typescript', 'vue']);
  });
});

describe('React targets', () => {
  it.each([
    [['react'], 'unknown'], [['react', 'react-dom'], 'web'],
    [['react', 'react-native'], 'native'], [['react', 'expo', 'react-native'], 'native'],
    [['react-dom', 'react-native'], 'mixed'], [['next'], 'web'], [['gatsby'], 'web'],
    [['@remix-run/react'], 'web'], [['@react-router/dev'], 'web'],
    [['@vitejs/plugin-react'], 'web'], [['react-native-web', 'react-dom'], 'mixed'],
  ] as const)('classifies dependencies %j as %s', async (names, target) => {
    await dependencies([...names]);
    const detected = await detectTechnologies(root);
    expect(detected.find((item) => item.id === 'react')?.reactTarget).toBe(target);
    expect(resolveStandards(detected).some((item) => item.id === 'html')).toBe(target === 'web' || target === 'mixed');
  });
  it.each([
    ['react-dom/client', 'web'], ['react-dom/server', 'web'], ['react-native', 'native'], ['react', 'unknown'],
  ])('classifies imports from %s as %s', async (module, target) => {
    await write('src/main.tsx', `import * as runtime from '${module}';`);
    expect((await detectTechnologies(root)).find((item) => item.id === 'react')?.reactTarget).toBe(target);
  });
  it.each([
    ['next.config.js', 'export default {};', 'web'],
    ['gatsby-config.js', 'module.exports = {};', 'web'],
    ['react-native.config.js', 'module.exports = {};', 'native'],
    ['metro.config.js', "const { getDefaultConfig } = require('expo/metro-config');", 'native'],
    ['babel.config.js', "module.exports = { presets: ['babel-preset-expo'] };", 'native'],
  ])('classifies platform configuration %s as %s', async (file, content, target) => {
    await write(file, content);
    expect((await detectTechnologies(root)).find((item) => item.id === 'react')?.reactTarget).toBe(target);
  });
  it('combines separate applications and reports concrete evidence', async () => {
    await dependencies(['react-dom'], 'apps/web/package.json');
    await dependencies(['react-native'], 'apps/mobile/package.json');
    const react = (await detectTechnologies(root)).find((item) => item.id === 'react');
    expect(react?.reactTarget).toBe('mixed');
    expect(react?.platformEvidence?.web.join()).toContain('apps/web/package.json');
    expect(react?.platformEvidence?.native.join()).toContain('apps/mobile/package.json');
  });
  it('keeps independently detected HTML in a native repository', async () => {
    await dependencies(['react-native']);
    await write('public/index.html');
    expect(resolveStandards(await detectTechnologies(root)).map((item) => item.id)).toContain('html');
  });
});

describe('Vue SFC embedded languages', () => {
  it.each([
    ['<script></script>', ['javascript', 'vue']],
    ['<script setup></script>', ['javascript', 'vue']],
    ['<script lang="ts"></script>', ['typescript', 'vue']],
    ["<script setup lang='ts'></script>", ['typescript', 'vue']],
    ['<script lang = ts setup ></script>', ['typescript', 'vue']],
    ['<script lang="ts"></script><script setup lang="ts"></script>', ['typescript', 'vue']],
    ['<style></style>', ['css', 'vue']],
    ['<style scoped></style>', ['css', 'vue']],
    ["<style scoped lang='scss'></style>", ['css', 'vue']],
    ['<style lang="sass" scoped></style>', ['css', 'vue']],
    ['<style lang="less"></style>', ['vue']],
    ['<template><div>Hello</div></template>', ['vue']],
    ['<template>{{ "<template>" }} {{ "<script>" }}</template><script setup></script>', ['javascript', 'vue']],
    ['<!-- <script lang="ts"></script><style></style> --><template/>', ['vue']],
    ['<script lang="ts>', ['vue']],
    ['<script lang="ts" lang="js"></script>', ['vue']],
    ['<script lang="ts"=bad></script>', ['vue']],
    ['ordinary text <script lang="ts"></script>', ['vue']],
    ['<template><pre>&lt;script&gt;</pre><template><div/></template></template><style/>', ['css', 'vue']],
    ['<script>const example = "<style lang=\\"scss\\">";</script>', ['javascript', 'vue']],
    ['<script src="https://example.com/app.js"></script>', ['vue']],
    ['<script src="./missing.js"></script>', ['vue']],
    ['<script src="./missing" lang="ts"></script>', ['typescript', 'vue']],
    ['<style src="./missing" lang="scss"/>', ['css', 'vue']],
  ])('classifies %s', async (content, expected) => {
    await write('src/View.vue', content);
    expect(await ids()).toEqual(expected);
  });
  it('does not select tooling JavaScript for TS-only SFCs', async () => {
    await write('src/View.vue', '<script setup lang="ts"></script>');
    await write('vite.config.js', "import vue from '@vitejs/plugin-vue';");
    expect(await ids()).toEqual(['typescript', 'vue']);
  });
  it('retains application JavaScript from an SFC alongside TypeScript', async () => {
    await write('src/View.vue', '<script setup></script>');
    await write('src/main.ts');
    expect(await ids()).toEqual(['javascript', 'typescript', 'vue']);
  });
  it('resolves local external block extensions and imports', async () => {
    await write('src/View.vue', '<script src="./logic.ts"/><style src="./theme.scss"/>');
    await write('src/logic.ts', "import { ref } from 'vue';");
    await write('src/theme.scss');
    const detected = await detectTechnologies(root);
    expect(detected.find((item) => item.id === 'typescript')?.evidence.join()).toContain('Vue script');
    expect(detected.find((item) => item.id === 'css')?.evidence.join()).toContain('Vue style');
  });
  it('skips oversized contents without losing extension evidence', async () => {
    await write('src/View.vue', ' '.repeat(MAX_INSPECTED_BYTES) + '<script lang="ts"></script>');
    expect(await ids()).toEqual(['vue']);
  });
  it('bounds enumeration deterministically', async () => {
    await Promise.all(Array.from({ length: 505 }, (_, index) => write(`src/${String(index).padStart(3, '0')}.vue`)));
    const files = await inspectionFiles(root, (file) => file.endsWith('.vue'));
    expect(files).toHaveLength(500);
    expect(files[0]).toBe('src/000.vue');
    expect(files.at(-1)).toBe('src/499.vue');
    expect(await inspectionFiles(root, (file) => file.endsWith('.vue'))).toEqual(files);
  });
  it('rejects external SFC sources escaping the repository', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'agenieer-external-'));
    try {
      await fs.writeFile(path.join(outside, 'external.ts'), "import React from 'react-dom';");
      await fs.symlink(outside, path.join(root, 'linked'));
      await write('View.vue', '<script src="./linked/external.ts"/>');
      expect(await ids()).toEqual(['vue']);
    } finally { await fs.rm(outside, { recursive: true, force: true }); }
  });
  it('does not follow source symlinks', async () => {
    await fs.symlink(path.join(root, '..'), path.join(root, 'outside'));
    expect(await inspectionFiles(root, () => true)).toEqual([]);
  });
});
