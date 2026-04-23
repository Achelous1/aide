/**
 * TDD test for the napi-rs native read_tree binding.
 * Skipped automatically when the arch-matching .node binary is absent.
 *
 * Verifies that the Rust implementation returns the same shape
 * as the existing JS readTree for the same directory.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

// Resolve the built .node file using arch-aware candidate matching.
// napi-rs appends a libc suffix on Linux (-gnu/-musl) and Windows (-msvc).
// Returns null if no arch-matching binary is found — no fallback to wrong arch.
function candidateNativeFilenames(): string[] {
  const base = `index.${process.platform}-${process.arch}`;
  if (process.platform === 'darwin') {
    // Prefer universal (lipo-merged arm64+x64) when present; fall back to arch-specific.
    return [`index.darwin-universal.node`, `${base}.node`];
  }
  if (process.platform === 'linux') {
    return [`${base}-gnu.node`, `${base}-musl.node`, `${base}.node`];
  }
  if (process.platform === 'win32') {
    return [`${base}-msvc.node`, `${base}.node`];
  }
  return [`${base}.node`];
}

function resolveNativeModule(): string | null {
  const nativeDir = path.resolve(__dirname, '../../src/main/native');
  if (!fs.existsSync(nativeDir)) return null;
  const files = new Set(fs.readdirSync(nativeDir));
  const match = candidateNativeFilenames().find((c) => files.has(c));
  return match ? path.join(nativeDir, match) : null;
}

const nativeModPath = resolveNativeModule();

// On Linux CI the native module MUST exist because build:native ran first.
// Silent skip here would turn a broken Linux Rust toolchain into a green CI.
if (process.env.CI === 'true' && process.platform === 'linux' && nativeModPath === null) {
  throw new Error(
    'native module missing on Linux CI — build:native likely failed silently. ' +
      'Check the Build native module step output.',
  );
}

// Check at module level whether the binary exports readTreeWithError.
// Older binaries (compiled before the binding was added) only export readTree.
// skipIf conditions are evaluated at describe-definition time, before beforeAll runs,
// so we need the answer available synchronously here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hasReadTreeWithError: boolean = nativeModPath !== null &&
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  typeof (require(nativeModPath) as Record<string, unknown>).readTreeWithError === 'function';

describe.skipIf(nativeModPath === null)('native read_tree (napi-rs)', () => {
  let nativeMod: {
    readTree: (dir: string) => Array<{ name: string; path: string; type: string }>;
    readTreeWithError: (dir: string) => { nodes: Array<{ name: string; path: string; type: string }>; error: { code: string; path: string; message: string } | null | undefined };
  };
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

  afterAll(() => {
    if (testDir) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
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

  it('trailing-slash parity: output is identical with or without trailing separator', () => {
    // Lock in the contract that Rust and JS both normalise trailing separators.
    // Use path.sep so Windows uses '\' and POSIX uses '/' — mixing separators
    // would produce paths like `C:\tmp/file` that differ from `C:\tmp\file`.
    const withSlash = testDir.endsWith(path.sep) ? testDir : testDir + path.sep;
    const rustWithout = nativeMod.readTree(testDir).sort((a, b) => a.name.localeCompare(b.name));
    const rustWith = nativeMod.readTree(withSlash).sort((a, b) => a.name.localeCompare(b.name));
    const jsWithout = jsReadTree(testDir).sort((a, b) => a.name.localeCompare(b.name));
    const jsWith = jsReadTree(withSlash).sort((a, b) => a.name.localeCompare(b.name));

    expect(rustWith).toHaveLength(rustWithout.length);
    expect(jsWith).toHaveLength(jsWithout.length);
    for (let i = 0; i < rustWithout.length; i++) {
      expect(rustWith[i].name).toBe(rustWithout[i].name);
      expect(rustWith[i].path).toBe(rustWithout[i].path, 'Rust path must not have double-slash');
      expect(jsWith[i].path).toBe(jsWithout[i].path, 'JS path must not have double-slash');
    }
  });

  // ── Option<T> napi-rs serialization ────────────────────────────────────────
  // Pins the actual wire format that napi-rs 2.x uses for Option<T> fields.
  // napi-rs serializes None as `null` (not `undefined`).
  //
  // NOTE: The TS interface declares `error?: FsReadTreeError` (undefined-typed),
  // but napi-rs actually serializes None as `null`. There is a divergence between
  // the declared TS type and the runtime value. A follow-up subtask will decide
  // whether to patch the TS type to `error?: FsReadTreeError | null` or to
  // normalize the value to `undefined` in the IPC handler.
  //
  // Skipped when the binary predates the readTreeWithError export (local dev with
  // older rustc). On Linux CI where build:native runs, this MUST execute.
  describe.skipIf(!hasReadTreeWithError)(
    'readTreeWithError Option<T> serialization (napi-rs → undefined)',
    () => {
      it('error field is undefined when read succeeds — matches TS optional field semantics', () => {
        const result = nativeMod.readTreeWithError(testDir);
        expect(result).toHaveProperty('nodes');
        // napi-rs 2.x serializes Option::None as undefined (not null), which
        // matches the TS type `error?: FsReadTreeError`. Confirmed on Linux CI.
        // If this assertion fails after a napi-rs upgrade, the serialization
        // contract changed and callers must be audited.
        expect(result.error).toBeUndefined();
      });

      it('error field has {code, path, message} shape when path does not exist', () => {
        const nonexistent = '/does-not-exist-aide-spike-xyz-99999';
        const result = nativeMod.readTreeWithError(nonexistent);
        expect(result.nodes).toHaveLength(0);
        // error must be non-null with the expected shape
        expect(result.error).not.toBeNull();
        expect(result.error).not.toBeUndefined();
        expect(result.error).toHaveProperty('code', 'ENOENT');
        expect(result.error).toHaveProperty('path', nonexistent);
        expect(result.error).toHaveProperty('message');
        expect(typeof result.error!.message).toBe('string');
      });
    },
  );

  // Non-UTF8 filename handling: Rust skips entries with non-UTF8 names while
  // Node.js (on Linux) can represent them. On macOS/APFS the OS rejects creation
  // of non-UTF8 filenames entirely, so this test is gated to Linux.
  // Contract: Rust skips the entry; JS may include it. Both must handle the dir
  // without throwing.
  it.skipIf(process.platform !== 'linux')(
    'non-UTF8 filenames: Rust skips, neither implementation throws',
    () => {
      const nonUtf8Dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-utf8-test-'));
      try {
        fs.writeFileSync(path.join(nonUtf8Dir, 'valid.txt'), 'ok');
        // Write a file with invalid UTF-8 bytes in its name. We must pass the
        // path as a Buffer — converting to string (even via 'binary' encoding)
        // lets Node re-encode to valid UTF-8 before the syscall (0xFF → 0xC3 0xBF),
        // which would defeat the whole point of the test.
        const invalidName = Buffer.from([0x66, 0xff, 0x6f]); // "f<invalid>o"
        const bufferPath = Buffer.concat([Buffer.from(nonUtf8Dir + path.sep), invalidName]);
        fs.writeFileSync(bufferPath, 'bad');

        const rustResult = nativeMod.readTree(nonUtf8Dir);
        // Rust must skip the non-UTF8 entry and return only valid.txt.
        expect(rustResult).toHaveLength(1);
        expect(rustResult[0].name).toBe('valid.txt');

        // JS must not throw — just returns whatever it can.
        expect(() => jsReadTree(nonUtf8Dir)).not.toThrow();

        // Assert the documented JS/Rust divergence: JS sees both entries,
        // Rust skips the non-UTF8 one. Regression guard — if JS ever starts
        // skipping too, this intentionally breaks to surface the contract change.
        const jsEntries = jsReadTree(nonUtf8Dir);
        expect(jsEntries.length).toBeGreaterThanOrEqual(2); // JS sees ASCII file AND non-UTF8 entry
        expect(rustResult).toHaveLength(1); // Rust skips the non-UTF8 entry
      } finally {
        fs.rmSync(nonUtf8Dir, { recursive: true, force: true });
      }
    },
  );
});

// ── napi error-message format tests (#B2 / #B4) ────────────────────────────
// Verify that io::Error from Rust is surfaced with a Node-style "ENOENT: ..."
// prefix AND contains the path, so callers can pattern-match on err.message.
// These tests run against the real .node binary.

// Check whether the binary exports readFile (added in PR-B).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hasReadFile: boolean = nativeModPath !== null &&
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  typeof (require(nativeModPath!) as Record<string, unknown>).readFile === 'function';

describe.skipIf(!hasReadFile)('napi fs-op error message format (PR-B #B2/#B4)', () => {
  type FsMod = {
    readFile: (path: string) => string;
    writeFile: (path: string, content: string) => void;
    deletePath: (path: string) => void;
  };

  // nativeModPath may be null on platforms without a built .node (e.g. Windows
  // CI where build:native is intentionally skipped). skipIf above prevents the
  // it() blocks from running, but describe callbacks still execute at collect
  // time — so guard the require to avoid `require(null)` throwing here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fsMod = (nativeModPath !== null ? require(nativeModPath) : null) as FsMod;

  it('readFile on nonexistent path rejects with ENOENT: prefix in message', () => {
    const nonexistent = '/nonexistent-aide-test-b2/nope.txt';
    expect(() => fsMod.readFile(nonexistent)).toThrow(/^ENOENT:/);
  });

  it('readFile error message contains the path', () => {
    const nonexistent = '/nonexistent-aide-test-b4/nope.txt';
    let caught: Error | undefined;
    try {
      fsMod.readFile(nonexistent);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain(nonexistent);
  });

  it('writeFile on path with missing parent rejects with ENOENT: prefix in message', () => {
    const badPath = '/nonexistent-aide-test-b2-write/out.txt';
    expect(() => fsMod.writeFile(badPath, 'data')).toThrow(/^ENOENT:/);
  });

  it('deletePath on nonexistent path rejects with ENOENT: prefix in message', () => {
    const nonexistent = '/nonexistent-aide-test-b2-delete/gone';
    expect(() => fsMod.deletePath(nonexistent)).toThrow(/^ENOENT:/);
  });
});
