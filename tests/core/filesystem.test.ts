import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import {
  readFileText,
  writeFileAtomic,
  fileExists,
  dirExists,
  listFiles,
  isStandardsDir,
} from '@/core/filesystem.js';

describe('core/filesystem', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agenieer-fs-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('writeFileAtomic & readFileText', () => {
    it('creates parent dirs and writes file atomically', async () => {
      const targetFile = path.join(tmpDir, 'deep', 'nested', 'file.txt');
      await writeFileAtomic(targetFile, 'hello world');

      const content = await readFileText(targetFile);
      expect(content).toBe('hello world');

      // Verify no leftover .tmp files
      const dirContents = await fs.readdir(path.join(tmpDir, 'deep', 'nested'));
      expect(dirContents).toEqual(['file.txt']);
    });

    it('overwrites existing file cleanly', async () => {
      const targetFile = path.join(tmpDir, 'file.txt');
      await writeFileAtomic(targetFile, 'initial');
      expect(await readFileText(targetFile)).toBe('initial');

      await writeFileAtomic(targetFile, 'updated');
      expect(await readFileText(targetFile)).toBe('updated');
    });
  });

  describe('fileExists & dirExists', () => {
    it('accurately identifies files and directories', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'content');

      expect(await fileExists(filePath)).toBe(true);
      expect(await dirExists(filePath)).toBe(false);

      expect(await dirExists(tmpDir)).toBe(true);
      expect(await fileExists(tmpDir)).toBe(false);

      expect(await fileExists(path.join(tmpDir, 'nope'))).toBe(false);
      expect(await dirExists(path.join(tmpDir, 'nope'))).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('lists files matching pattern bounded to dir', async () => {
      await fs.writeFile(path.join(tmpDir, 'a.ts'), '');
      await fs.writeFile(path.join(tmpDir, 'b.js'), '');
      await fs.mkdir(path.join(tmpDir, 'sub'));
      await fs.writeFile(path.join(tmpDir, 'sub', 'c.ts'), '');

      const tsFiles = await listFiles(tmpDir, '**/*.ts');
      expect(tsFiles.sort()).toEqual(['a.ts', 'sub/c.ts']);
    });
  });

  describe('isStandardsDir', () => {
    it('identifies paths inside docs/standards/', () => {
      expect(isStandardsDir('docs/standards/typescript.md')).toBe(true);
      expect(isStandardsDir('/root/project/docs/standards/testing/vitest.md')).toBe(true);
      expect(isStandardsDir('src/docs/standards/foo.md')).toBe(true);
      expect(isStandardsDir('src/components/Button.tsx')).toBe(false);
      expect(isStandardsDir('docs/other/README.md')).toBe(false);
    });
  });
});
