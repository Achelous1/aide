/**
 * TDD test for the napi-rs native read_tree binding.
 * Skipped automatically when the arch-matching .node binary is absent.
 *
 * Verifies that the Rust implementation returns the same shape
 * as the existing JS readTree for the same directory.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// The JS reference implementation (copied inline to avoid importing Electron deps)
function jsReadTree(dirPath: string): Array<{ name: string; path: string; type: string }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.map((entry) => ({
    name: entry.name,
    path: path.join(dirPath, entry.name),
    // NOTE: Dirent.isDirectory() returns false for symlinks — matches Rust file_type() semantics.
    type: entry.isDirectory() ? 'directory' : 'file',
  }));
}

// Resolve the built .node file using arch-aware matching.
// Returns null if the arch-matching binary is absent — no fallback to wrong arch.
function resolveNativeModule(): string | null {
  const nativeDir = path.resolve(__dirname, '../../src/main/native');
  const expected = `index.${process.platform}-${process.arch}.node`;
  if (!fs.existsSync(nativeDir)) return null;
  const files = fs.readdirSync(nativeDir);
  const match = files.find((f) => f === expected);
  return match ? path.join(nativeDir, match) : null;
}

const nativeModPath = resolveNativeModule();

describe.skipIf(nativeModPath === null)('native read_tree (napi-rs)', () => {
  let nativeMod: { readTree: (dir: string) => Array<{ name: string; path: string; type: string }> };
  let testDir: string;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeMod = require(nativeModPath!);

    // Create a temp dir with known contents
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-native-test-'));
    fs.writeFileSync(path.join(testDir, 'file1.txt'), 'a');
    fs.writeFileSync(path.join(testDir, 'file2.txt'), 'b');
    fs.mkdirSync(path.join(testDir, 'subdir'));
  });

  it('returns 3 entries for a dir with 2 files + 1 subdir', () => {
    const result = nativeMod.readTree(testDir);
    expect(result).toHaveLength(3);
  });

  it('entry shapes match JS reference implementation', () => {
    const rustResult = nativeMod.readTree(testDir).sort((a, b) => a.name.localeCompare(b.name));
    const jsResult = jsReadTree(testDir).sort((a, b) => a.name.localeCompare(b.name));

    expect(rustResult).toHaveLength(jsResult.length);
    for (let i = 0; i < jsResult.length; i++) {
      expect(rustResult[i].name).toBe(jsResult[i].name);
      expect(rustResult[i].path).toBe(jsResult[i].path);
      expect(rustResult[i].type).toBe(jsResult[i].type);
    }
  });

  it('returns empty array for non-existent path', () => {
    const result = nativeMod.readTree('/nonexistent/path/aide-spike-xyz');
    expect(result).toEqual([]);
  });

  it('symlink parity: Rust and JS classify symlinks identically', () => {
    // Only run on platforms that support symlinks (Unix)
    const symlinkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-sym-test-'));
    try {
      const regularFile = path.join(symlinkDir, 'regular.txt');
      const subdir = path.join(symlinkDir, 'subdir');
      const symToFile = path.join(symlinkDir, 'sym_to_file');
      const symToDir = path.join(symlinkDir, 'sym_to_dir');
      const brokenSym = path.join(symlinkDir, 'broken_sym');

      fs.writeFileSync(regularFile, 'hello');
      fs.mkdirSync(subdir);
      fs.symlinkSync(regularFile, symToFile);
      fs.symlinkSync(subdir, symToDir);
      fs.symlinkSync(path.join(symlinkDir, 'does_not_exist'), brokenSym);

      const rustResult = nativeMod
        .readTree(symlinkDir)
        .sort((a, b) => a.name.localeCompare(b.name));
      const jsResult = jsReadTree(symlinkDir).sort((a, b) => a.name.localeCompare(b.name));

      expect(rustResult).toHaveLength(jsResult.length);
      for (let i = 0; i < jsResult.length; i++) {
        expect(rustResult[i].name).toBe(jsResult[i].name);
        expect(rustResult[i].type).toBe(jsResult[i].type,
          `type mismatch for "${jsResult[i].name}": Rust="${rustResult[i].type}" JS="${jsResult[i].type}"`);
      }
    } finally {
      fs.rmSync(symlinkDir, { recursive: true, force: true });
    }
  });
});
