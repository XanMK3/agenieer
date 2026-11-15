import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { resolveTargetRoot, isSafeSymlink } from '@/core/project.js';

describe('core/project', () => {
  describe('resolveTargetRoot', () => {
    it('resolves current working directory when no cwd passed', async () => {
      const root = await resolveTargetRoot();
      expect(root).toBe(await fs.realpath(process.cwd()));
    });

    it('resolves explicit valid directory', async () => {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'agenieer-test-'));
      try {
        const root = await resolveTargetRoot(tmp);
        expect(root).toBe(await fs.realpath(tmp));
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
      }
    });

    it('throws when target directory does not exist', async () => {
      await expect(
        resolveTargetRoot('/non-existent-directory-xyz-123')
      ).rejects.toThrow('Target directory does not exist');
    });

    it('throws when target path is a file, not a directory', async () => {
      const tmpFile = path.join(os.tmpdir(), `test-file-${Date.now()}.txt`);
      await fs.writeFile(tmpFile, 'hello');
      try {
        await expect(resolveTargetRoot(tmpFile)).rejects.toThrow(
          'Target path is not a directory'
        );
      } finally {
        await fs.rm(tmpFile, { force: true });
      }
    });
  });

  describe('isSafeSymlink', () => {
    it('returns true for paths inside root', () => {
      expect(isSafeSymlink('/app/project/src/index.ts', '/app/project')).toBe(true);
      expect(isSafeSymlink('/app/project', '/app/project')).toBe(true);
    });

    it('returns false for paths outside root', () => {
      expect(isSafeSymlink('/app/other/index.ts', '/app/project')).toBe(false);
      expect(isSafeSymlink('/etc/passwd', '/app/project')).toBe(false);
    });
  });
});
