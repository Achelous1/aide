/**
 * Tests for migrate-aide-data (D8): copy + cleanup migration ~/.aide → ~/.smalti.
 *
 * The migration is now copy + delete: it keeps ~/.smalti as the source of truth
 * and drops ~/.aide once the marker (~/.smalti/.migrated-from-aide) is in place.
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

  it('first-time migration: copies, writes marker, and deletes legacy ~/.aide', async () => {
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'settings.json'), '{"test":true}');

    const result = await migrateAideToSmalti();

    expect(result.migrated).toBe(true);
    expect(result.deletedLegacy).toBe(true);
    expect(result.skipped).toBeUndefined();
    // ~/.smalti now contains the data
    expect(fs.existsSync(smaltiDir)).toBe(true);
    expect(fs.existsSync(path.join(smaltiDir, 'settings.json'))).toBe(true);
    // marker lives inside ~/.smalti
    expect(fs.existsSync(marker)).toBe(true);
    // ~/.aide is gone
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('preserves file contents during copy', async () => {
    await fsp.mkdir(aideDir);
    const content = JSON.stringify({ version: 1, data: 'hello' });
    await fsp.writeFile(path.join(aideDir, 'settings.json'), content);
    await fsp.mkdir(path.join(aideDir, 'plugins'), { recursive: true });
    await fsp.writeFile(path.join(aideDir, 'plugins', 'plugin.spec.json'), '{"id":"p1"}');

    await migrateAideToSmalti();

    const copiedSettings = await fsp.readFile(path.join(smaltiDir, 'settings.json'), 'utf-8');
    expect(copiedSettings).toBe(content);
    const copiedPlugin = await fsp.readFile(
      path.join(smaltiDir, 'plugins', 'plugin.spec.json'),
      'utf-8',
    );
    expect(copiedPlugin).toBe('{"id":"p1"}');
  });

  it('cleanup pass: when both dirs exist, writes missing marker and deletes ~/.aide', async () => {
    // Simulate user state: ~/.smalti was set up (e.g. by an installer) but
    // ~/.aide wasn't cleaned up yet, and no marker has been written.
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'leftover.json'), 'old');
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(path.join(smaltiDir, 'existing.json'), 'existing');

    const result = await migrateAideToSmalti();

    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('already-migrated');
    expect(result.deletedLegacy).toBe(true);
    // ~/.smalti contents untouched
    const existing = await fsp.readFile(path.join(smaltiDir, 'existing.json'), 'utf-8');
    expect(existing).toBe('existing');
    // marker is now in place
    expect(fs.existsSync(marker)).toBe(true);
    // ~/.aide is gone
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('cleanup pass: idempotent when marker already exists', async () => {
    await fsp.mkdir(aideDir);
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(marker, '2026-04-25T00:00:00Z');

    const result = await migrateAideToSmalti();

    expect(result.skipped).toBe('already-migrated');
    expect(result.deletedLegacy).toBe(true);
    // marker keeps its original value (not overwritten)
    const markerContent = await fsp.readFile(marker, 'utf-8');
    expect(markerContent).toBe('2026-04-25T00:00:00Z');
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  it('subsequent runs are no-ops once ~/.aide has been removed', async () => {
    // Run once to set up the migrated state
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'x'), '1');
    await migrateAideToSmalti();
    expect(fs.existsSync(aideDir)).toBe(false);

    // Second run finds nothing to do
    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
    expect(result.deletedLegacy).toBeUndefined();
  });
});
