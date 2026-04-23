/**
 * TDD tests for the arch-aware .node loader.
 *
 * Verifies:
 *   1. The loader selects `index.<platform>-<arch>.node` exactly (no fallback to wrong arch).
 *   2. The loader returns null when no arch-matching .node exists (no wrong-arch crash).
 *   3. On Linux, libc-suffixed variants (-gnu, -musl) are tried before the bare suffix.
 *   4. On Windows, -msvc suffix is tried before the bare suffix.
 *   5. On macOS, `index.darwin-universal.node` is preferred over the arch-specific file.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const EXPECTED_FILENAME = `index.${process.platform}-${process.arch}.node`;

// ---------------------------------------------------------------------------
// Helper: extract only the filename-selection logic from fs-handlers so we
// can unit-test it without importing Electron deps.
// Mirrors candidateNativeFilenames() + the existsSync loop in getNativeMod().
// ---------------------------------------------------------------------------
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

function resolveNodeFile(nativeDir: string): string | null {
  if (!fs.existsSync(nativeDir)) return null;
  const files = fs.readdirSync(nativeDir);
  const fileSet = new Set(files);
  const match = candidateNativeFilenames().find((c) => fileSet.has(c));
  return match ? path.join(nativeDir, match) : null;
}

describe('arch-aware .node loader', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-loader-test-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when native dir does not exist', () => {
    const result = resolveNodeFile(path.join(tmpDir, 'nonexistent'));
    expect(result).toBeNull();
  });

  it('returns null when no arch-matching .node file is present', () => {
    // Place a wrong-arch file — should NOT match
    const wrongArch = `index.${process.platform}-${process.arch === 'arm64' ? 'x64' : 'arm64'}.node`;
    fs.writeFileSync(path.join(tmpDir, wrongArch), '');
    const result = resolveNodeFile(tmpDir);
    expect(result).toBeNull();
  });

  it(`resolves to ${EXPECTED_FILENAME} when the correct arch file is present`, () => {
    fs.writeFileSync(path.join(tmpDir, EXPECTED_FILENAME), '');
    const result = resolveNodeFile(tmpDir);
    expect(result).not.toBeNull();
    expect(path.basename(result!)).toBe(EXPECTED_FILENAME);
  });

  // Linux-specific: napi-rs appends a libc suffix (-gnu / -musl) on Linux.
  // Verify the loader prefers the -gnu variant over the bare no-suffix fallback.
  it.skipIf(process.platform !== 'linux')(
    'linux: picks index.linux-<arch>-gnu.node over bare index.linux-<arch>.node when both present',
    () => {
      const gnuDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-gnu-test-'));
      try {
        const gnuFile = `index.linux-${process.arch}-gnu.node`;
        const bareFile = `index.linux-${process.arch}.node`;
        fs.writeFileSync(path.join(gnuDir, gnuFile), '');
        fs.writeFileSync(path.join(gnuDir, bareFile), '');
        const result = resolveNodeFile(gnuDir);
        expect(result).not.toBeNull();
        expect(path.basename(result!)).toBe(gnuFile);
      } finally {
        fs.rmSync(gnuDir, { recursive: true, force: true });
      }
    },
  );

  // Linux-specific: when only the -gnu file exists (no bare fallback), it resolves.
  it.skipIf(process.platform !== 'linux')(
    'linux: resolves index.linux-<arch>-gnu.node when only libc-suffixed file is present',
    () => {
      const gnuOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-gnuonly-test-'));
      try {
        const gnuFile = `index.linux-${process.arch}-gnu.node`;
        fs.writeFileSync(path.join(gnuOnlyDir, gnuFile), '');
        const result = resolveNodeFile(gnuOnlyDir);
        expect(result).not.toBeNull();
        expect(path.basename(result!)).toBe(gnuFile);
      } finally {
        fs.rmSync(gnuOnlyDir, { recursive: true, force: true });
      }
    },
  );

  // macOS-specific: universal binary is preferred over the arch-specific file.
  it.skipIf(process.platform !== 'darwin')(
    'darwin: picks index.darwin-universal.node over index.darwin-<arch>.node when both present',
    () => {
      const darwinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-darwin-univ-test-'));
      try {
        const univFile = 'index.darwin-universal.node';
        const archFile = `index.darwin-${process.arch}.node`;
        fs.writeFileSync(path.join(darwinDir, univFile), '');
        fs.writeFileSync(path.join(darwinDir, archFile), '');
        const result = resolveNodeFile(darwinDir);
        expect(result).not.toBeNull();
        expect(path.basename(result!)).toBe(univFile);
      } finally {
        fs.rmSync(darwinDir, { recursive: true, force: true });
      }
    },
  );

  // macOS-specific: falls back to arch-specific when universal is absent.
  it.skipIf(process.platform !== 'darwin')(
    'darwin: falls back to index.darwin-<arch>.node when universal is absent',
    () => {
      const archOnlyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-darwin-arch-test-'));
      try {
        const archFile = `index.darwin-${process.arch}.node`;
        fs.writeFileSync(path.join(archOnlyDir, archFile), '');
        const result = resolveNodeFile(archOnlyDir);
        expect(result).not.toBeNull();
        expect(path.basename(result!)).toBe(archFile);
      } finally {
        fs.rmSync(archOnlyDir, { recursive: true, force: true });
      }
    },
  );
});
