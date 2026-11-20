import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';

export const COMMON_IGNORE = [
  '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/coverage/**',
  '**/.next/**', '**/.nuxt/**', '**/.output/**', '**/.cache/**', '**/.turbo/**',
  '**/.vite/**', '**/vendor/**', '**/docs/standards/**', '**/templates/**',
  '**/fixtures/**', '**/__fixtures__/**', '**/__mocks__/**', '**/docs/examples/**',
];
export const MAX_INSPECTED_FILES = 500;
export const MAX_INSPECTED_BYTES = 128 * 1024;

/** Deterministic bounded traversal; oversized directories contribute no evidence. */
export async function inspectionFiles(root: string, accepts: (file: string) => boolean): Promise<string[]> {
  const files: string[] = [];
  let visited = 0;
  const ignored = new Set(COMMON_IGNORE.flatMap((pattern) => {
    const match = /^\*\*\/([^/*]+)\/\*\*$/.exec(pattern);
    return match ? [match[1]] : [];
  }));
  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > 20 || visited >= 10000 || files.length >= MAX_INSPECTED_FILES) return;
    const entries: Dirent[] = [];
    try {
      const handle = await fs.opendir(path.join(root, directory));
      for await (const entry of handle) {
        entries.push(entry);
        if (entries.length > 2000) return;
      }
    } catch { return; }
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      if (++visited > 10000 || files.length >= MAX_INSPECTED_FILES) break;
      const file = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name) && !/(?:^|\/)docs\/(?:standards|examples)$/.test(file)) await walk(file, depth + 1);
      } else if (entry.isFile() && accepts(file)) files.push(file);
    }
  }
  await walk('', 0);
  return files.sort();
}

/** Skip oversized files rather than interpreting truncated declarations. */
export async function inspectText(root: string, file: string): Promise<string | undefined> {
  let handle;
  try {
    const realRoot = await fs.realpath(root);
    const realFile = await fs.realpath(path.resolve(root, file));
    if (!realFile.startsWith(realRoot + path.sep)) return undefined;
    handle = await fs.open(realFile, 'r');
    const buffer = Buffer.alloc(MAX_INSPECTED_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_INSPECTED_BYTES) return undefined;
    return buffer.subarray(0, bytesRead).toString('utf8');
  } catch {
    return undefined;
  } finally {
    await handle?.close();
  }
}

/** Preserve quoted values for static inspection while removing comments. */
export function withoutComments(text: string): string {
  return text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/g,
    (token) => token.startsWith('//') || token.startsWith('/*') ? ' ' : token);
}
