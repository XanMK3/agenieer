import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Resolves target root to an absolute path, validates it exists and is a directory,
 * and ensures canonical realpath resolution.
 */
export async function resolveTargetRoot(cwd?: string): Promise<string> {
  const target = cwd ? path.resolve(process.cwd(), cwd) : process.cwd();
  try {
    const stat = await fs.stat(target);
    if (!stat.isDirectory()) {
      throw new Error(`Target path is not a directory: ${target}`);
    }
    const realRoot = await fs.realpath(target);
    return realRoot;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Target directory does not exist: ${target}`);
    }
    throw err;
  }
}

/**
 * Checks whether a path stays safely inside the target root without escaping it.
 */
export function isSafeSymlink(resolvedPath: string, root: string): boolean {
  const normalizedRoot = path.resolve(root);
  const normalizedPath = path.resolve(resolvedPath);
  const relative = path.relative(normalizedRoot, normalizedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
