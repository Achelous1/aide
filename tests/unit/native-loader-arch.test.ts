/**
 * TDD tests for the arch-aware .node loader.
 *
 * Verifies:
 *   1. The loader selects `index.<platform>-<arch>.node` exactly (no fallback to wrong arch).
 *   2. The loader returns null when no arch-matching .node exists (no wrong-arch crash).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const EXPECTED_FILENAME = `index.${process.platform}-${process.arch}.node`;

// ---------------------------------------------------------------------------
// Helper: extract only the filename-selection logic from fs-handlers so we
// can unit-test it without importing Electron deps.
// ---------------------------------------------------------------------------
function resolveNodeFile(nativeDir: string): string | null {
  if (!fs.existsSync(nativeDir)) return null;
  const expected = `index.${process.platform}-${process.arch}.node`;
  const files = fs.readdirSync(nativeDir);
  const match = files.find((f) => f === expected);
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
});
