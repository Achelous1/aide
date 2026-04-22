/**
 * TDD test for the napi-rs native read_tree binding.
 * This test will FAIL until the .node binary is built.
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
    type: entry.isDirectory() ? 'directory' : 'file',
  }));
}

// Resolve the built .node file — placed by napi build under src/main/native/
function resolveNativeModule(): string {
  const nativeDir = path.resolve(__dirname, '../../src/main/native');
  const files = fs.readdirSync(nativeDir).filter((f) => f.endsWith('.node'));
  if (files.length === 0) throw new Error(`No .node file found in ${nativeDir}`);
  return path.join(nativeDir, files[0]);
}

describe('native read_tree (napi-rs)', () => {
  let nativeMod: { readTree: (dir: string) => Array<{ name: string; path: string; type: string }> };
  let testDir: string;

  beforeAll(() => {
    const modPath = resolveNativeModule();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeMod = require(modPath);

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
});
