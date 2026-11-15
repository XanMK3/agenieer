import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

/**
 * Reads a text file using UTF-8 encoding.
 */
export async function readFileText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

/**
 * Writes content to a file atomically by creating a temporary sibling file
 * and renaming it into place. Ensures parent directories exist.
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const tmpPath = `${filePath}.${Date.now()}.${randomSuffix}.tmp`;

  try {
    await fs.writeFile(tmpPath, content, 'utf8');
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    try {
      await fs.unlink(tmpPath);
    } catch {
      // Ignore cleanup error if temp file was not created or already removed
    }
    throw err;
  }
}

/**
 * Checks whether a path exists and is a file.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Checks whether a path exists and is a directory.
 */
export async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Lists files matching pattern(s) inside a directory, bounded to that directory.
 */
export async function listFiles(
  dir: string,
  pattern: string | string[],
  options?: fg.Options
): Promise<string[]> {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  return fg(patterns, {
    cwd: dir,
    dot: true,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'],
    ...options,
  });
}

/**
 * Returns true if a path is located inside the docs/standards/ directory.
 */
export function isStandardsDir(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /(?:^|\/)docs\/standards(?:\/|$)/.test(normalized);
}
