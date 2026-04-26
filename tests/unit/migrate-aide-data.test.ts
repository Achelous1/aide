/**
 * Tests for migrate-aide-data: rename-first migration ~/.aide → ~/.smalti.
 *
 *   1. ~/.aide doesn't exist           → no-op.
 *   2. ~/.smalti doesn't exist          → atomic rename.
 *   3. Both exist                       → directory merge with destination
 *                                         winning conflicts, then delete
 *                                         the now-emptied ~/.aide.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('../../src/main/utils/home', () => ({
  getHome: vi.fn(),
}));

import { getHome } from '../../src/main/utils/home';
import { migrateAideToSmalti } from '../../src/main/migrate-aide-data';

const mockedGetHome = vi.mocked(getHome);

describe('migrateAideToSmalti', () => {
  let tmpDir: string;
  let aideDir: string;
  let smaltiDir: string;
  let marker: string;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'migrate-test-'));
    mockedGetHome.mockReturnValue(tmpDir);
    aideDir = path.join(tmpDir, '.aide');
    smaltiDir = path.join(tmpDir, '.smalti');
    marker = path.join(smaltiDir, '.migrated-from-aide');
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns migrated:false with skipped:no-aide-dir when ~/.aide does not exist', async () => {
    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
    expect(result.deletedLegacy).toBeUndefined();
  });

  it('rename branch: ~/.smalti absent — atomic rename, marker written, ~/.aide gone', async () => {
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'settings.json'), '{"test":true}');

    const result = await migrateAideToSmalti();

    expect(result.migrated).toBe(true);
    expect(result.mode).toBe('renamed');
    expect(result.deletedLegacy).toBe(true);
    expect(fs.existsSync(smaltiDir)).toBe(true);
    expect(fs.existsSync(path.join(smaltiDir, 'settings.json'))).toBe(true);
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('rename branch: preserves nested file content', async () => {
    await fsp.mkdir(path.join(aideDir, 'plugins'), { recursive: true });
    const content = JSON.stringify({ version: 1, data: 'hello' });
    await fsp.writeFile(path.join(aideDir, 'settings.json'), content);
    await fsp.writeFile(path.join(aideDir, 'plugins', 'plugin.spec.json'), '{"id":"p1"}');

    await migrateAideToSmalti();

    expect(await fsp.readFile(path.join(smaltiDir, 'settings.json'), 'utf-8')).toBe(content);
    expect(
      await fsp.readFile(path.join(smaltiDir, 'plugins', 'plugin.spec.json'), 'utf-8'),
    ).toBe('{"id":"p1"}');
  });

  it('merge branch: both dirs exist — moves missing items, keeps dest winners, deletes source', async () => {
    // ~/.aide has: leftover.json (unique) + plugins/myplugin.json (unique)
    await fsp.mkdir(path.join(aideDir, 'plugins'), { recursive: true });
    await fsp.writeFile(path.join(aideDir, 'leftover.json'), 'old');
    await fsp.writeFile(path.join(aideDir, 'plugins', 'myplugin.json'), 'plugin-data');
    // ~/.smalti has: existing.json (will win conflicts in shared subdir)
    await fsp.mkdir(path.join(smaltiDir, 'plugins'), { recursive: true });
    await fsp.writeFile(path.join(smaltiDir, 'existing.json'), 'existing');

    const result = await migrateAideToSmalti();

    expect(result.migrated).toBe(true);
    expect(result.mode).toBe('merged');
    expect(result.deletedLegacy).toBe(true);

    // ~/.smalti now has its own files + the unique items moved over
    expect(await fsp.readFile(path.join(smaltiDir, 'existing.json'), 'utf-8')).toBe('existing');
    expect(await fsp.readFile(path.join(smaltiDir, 'leftover.json'), 'utf-8')).toBe('old');
    expect(
      await fsp.readFile(path.join(smaltiDir, 'plugins', 'myplugin.json'), 'utf-8'),
    ).toBe('plugin-data');

    // marker placed, source gone
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('merge branch: dest wins conflicts (file with same name in both)', async () => {
    await fsp.mkdir(aideDir);
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(path.join(aideDir, 'config.json'), 'aide-version');
    await fsp.writeFile(path.join(smaltiDir, 'config.json'), 'smalti-version');

    await migrateAideToSmalti();

    // Smalti's config.json wins
    expect(await fsp.readFile(path.join(smaltiDir, 'config.json'), 'utf-8')).toBe('smalti-version');
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('merge branch: keeps existing marker untouched if already present', async () => {
    await fsp.mkdir(aideDir);
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(marker, '2026-04-25T00:00:00Z');

    await migrateAideToSmalti();

    const markerContent = await fsp.readFile(marker, 'utf-8');
    expect(markerContent).toBe('2026-04-25T00:00:00Z');
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('subsequent runs are no-ops once ~/.aide is gone', async () => {
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'x'), '1');
    await migrateAideToSmalti();
    expect(fs.existsSync(aideDir)).toBe(false);

    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
    expect(result.deletedLegacy).toBeUndefined();
  });
});
