/**
 * Tests for findAppBundle — guards the name-agnostic .app discovery that
 * lets old AIDE installers and new smalti installers consume each other's
 * release zips without breaking on the rename.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { findAppBundle } from '../../src/main/updater/check';

describe('findAppBundle', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'find-app-test-'));
  });

  afterEach(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null when the directory does not exist', () => {
    expect(findAppBundle(path.join(tmpDir, 'nope'))).toBeNull();
  });

  it('returns null when no .app entry is present', async () => {
    await fsp.writeFile(path.join(tmpDir, 'README.txt'), '');
    await fsp.mkdir(path.join(tmpDir, 'subdir'));
    expect(findAppBundle(tmpDir)).toBeNull();
  });

  it('finds smalti.app (current brand)', async () => {
    await fsp.mkdir(path.join(tmpDir, 'smalti.app'));
    expect(findAppBundle(tmpDir)).toBe(path.join(tmpDir, 'smalti.app'));
  });

  it('finds AIDE.app (legacy brand) — old release zips still work', async () => {
    await fsp.mkdir(path.join(tmpDir, 'AIDE.app'));
    expect(findAppBundle(tmpDir)).toBe(path.join(tmpDir, 'AIDE.app'));
  });

  it('finds an arbitrary .app name (future rename safety)', async () => {
    await fsp.mkdir(path.join(tmpDir, 'somefuture.app'));
    expect(findAppBundle(tmpDir)).toBe(path.join(tmpDir, 'somefuture.app'));
  });

  it('ignores non-.app siblings', async () => {
    await fsp.writeFile(path.join(tmpDir, 'NOTES'), '');
    await fsp.writeFile(path.join(tmpDir, 'app.zip'), '');
    await fsp.mkdir(path.join(tmpDir, 'helper'));
    await fsp.mkdir(path.join(tmpDir, 'smalti.app'));
    expect(findAppBundle(tmpDir)).toBe(path.join(tmpDir, 'smalti.app'));
  });

  it('returns the resolved absolute path', async () => {
    await fsp.mkdir(path.join(tmpDir, 'smalti.app'));
    const result = findAppBundle(tmpDir);
    expect(result).not.toBeNull();
    expect(path.isAbsolute(result!)).toBe(true);
    expect(fs.existsSync(result!)).toBe(true);
  });
});
