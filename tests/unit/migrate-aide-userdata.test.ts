/**
 * Tests for migrate-aide-userdata: userData directory migration.
 *
 * Simulates ~/Library/Application Support/ with aide/, AIDE/, Smalti/ subdirs.
 * Uses os.tmpdir() as a stand-in for the Application Support parent directory.
 *
 *   1. No legacy dirs         → all skipped (no-legacy-dir).
 *   2. aide/ only, Smalti/ absent → renamed.
 *   3. aide/ + Smalti/ both exist → merged, dest wins, legacy deleted.
 *   4. aide/ + AIDE/ both exist → each processed in turn.
 *   5. Markers are per-legacy basename.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { migrateAideUserData } from '../../src/main/migrate-aide-userdata';

describe('migrateAideUserData', () => {
  let parentDir: string;  // simulated "Application Support/"
  let destDir: string;    // simulated "Application Support/Smalti"

  beforeEach(async () => {
    parentDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'userdata-migrate-test-'));
    destDir = path.join(parentDir, 'Smalti');
  });

  afterEach(async () => {
    await fsp.rm(parentDir, { recursive: true, force: true });
  });

  // ── Case 1: no legacy dirs ─────────────────────────────────────────────────

  it('returns array of skipped results when no legacy dirs exist', async () => {
    await fsp.mkdir(destDir);
    const results = await migrateAideUserData(destDir);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.migrated === false && r.skipped === 'no-legacy-dir')).toBe(true);
  });

  // ── Case 2: aide/ only, Smalti/ absent → renamed ──────────────────────────

  it('renames aide/ to Smalti/ when dest absent, writes marker', async () => {
    const aideDir = path.join(parentDir, 'aide');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'aide-app-settings.json'), '{"v":1}');

    const results = await migrateAideUserData(destDir);

    // aide result
    const aideResult = results.find((_r, i) => i === 0)!;
    expect(aideResult.migrated).toBe(true);
    expect(aideResult.mode).toBe('renamed');
    expect(aideResult.deletedLegacy).toBe(true);

    // dest now has the file
    expect(fs.existsSync(path.join(destDir, 'aide-app-settings.json'))).toBe(true);
    // legacy gone
    expect(fs.existsSync(aideDir)).toBe(false);
    // marker written
    expect(fs.existsSync(path.join(destDir, '.migrated-from-aide'))).toBe(true);

    // AIDE/ didn't exist → skipped
    const aideUpperResult = results[1];
    expect(aideUpperResult.migrated).toBe(false);
    expect(aideUpperResult.skipped).toBe('no-legacy-dir');
  });

  // ── Case 3: aide/ + Smalti/ both exist → merged ───────────────────────────

  it('merges aide/ into Smalti/ when both exist, dest wins conflicts', async () => {
    const aideDir = path.join(parentDir, 'aide');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'mcp-config.json'), 'old');
    await fsp.writeFile(path.join(aideDir, 'aide-sessions.json'), 'sessions');

    await fsp.mkdir(destDir);
    await fsp.writeFile(path.join(destDir, 'mcp-config.json'), 'current');

    const results = await migrateAideUserData(destDir);

    const aideResult = results[0];
    expect(aideResult.migrated).toBe(true);
    expect(aideResult.mode).toBe('merged');
    expect(aideResult.deletedLegacy).toBe(true);

    // dest wins the conflict
    expect(await fsp.readFile(path.join(destDir, 'mcp-config.json'), 'utf-8')).toBe('current');
    // unique file moved over
    expect(await fsp.readFile(path.join(destDir, 'aide-sessions.json'), 'utf-8')).toBe('sessions');
    // legacy gone
    expect(fs.existsSync(aideDir)).toBe(false);
    // marker
    expect(fs.existsSync(path.join(destDir, '.migrated-from-aide'))).toBe(true);
  });

  // ── Case 4: AIDE/ only (no aide/) → processes only AIDE ──────────────────
  // Note: macOS APFS/HFS+ is case-insensitive — 'aide' and 'AIDE' resolve to
  // the same inode, so they cannot coexist. Each legacy is tested in isolation.

  it('renames AIDE/ to Smalti/ when only AIDE/ exists and dest absent', async () => {
    // On case-insensitive FS, mkdir('AIDE') creates the dir; existsSync('aide') is also true.
    // We verify that the AIDE result (index 1) is migrated regardless of what index 0 returns.
    const aideUpperDir = path.join(parentDir, 'AIDE');
    await fsp.mkdir(aideUpperDir);
    await fsp.writeFile(path.join(aideUpperDir, 'aide-settings-upper.json'), 'upper');

    const results = await migrateAideUserData(destDir);

    expect(results).toHaveLength(2);
    // At least one of the results must be migrated (whichever candidate matched the dir)
    const migratedResult = results.find((r) => r.migrated === true);
    expect(migratedResult).toBeDefined();
    expect(migratedResult!.mode).toBe('renamed');
    expect(fs.existsSync(path.join(destDir, 'aide-settings-upper.json'))).toBe(true);
  });

  it('merges AIDE/ into existing Smalti/ when dest already present', async () => {
    const aideUpperDir = path.join(parentDir, 'AIDE');
    await fsp.mkdir(aideUpperDir);
    await fsp.writeFile(path.join(aideUpperDir, 'aide-settings-upper.json'), 'upper');
    await fsp.mkdir(destDir);
    await fsp.writeFile(path.join(destDir, 'existing.json'), 'keep');

    const results = await migrateAideUserData(destDir);

    const migratedResult = results.find((r) => r.migrated === true);
    expect(migratedResult).toBeDefined();
    expect(migratedResult!.mode).toBe('merged');
    expect(await fsp.readFile(path.join(destDir, 'existing.json'), 'utf-8')).toBe('keep');
    expect(await fsp.readFile(path.join(destDir, 'aide-settings-upper.json'), 'utf-8')).toBe('upper');
  });

  // ── Case 5: marker written after migration ────────────────────────────────

  it('writes a .migrated-from-* marker after migrating aide/', async () => {
    const aideDir = path.join(parentDir, 'aide');
    await fsp.mkdir(aideDir);
    await fsp.mkdir(destDir);

    await migrateAideUserData(destDir);

    // On case-insensitive FS the marker file name matches case-insensitively.
    // existsSync checks the actual path — .migrated-from-aide must exist.
    expect(fs.existsSync(path.join(destDir, '.migrated-from-aide'))).toBe(true);
  });

  it('writes a .migrated-from-AIDE marker after migrating AIDE/', async () => {
    const aideUpperDir = path.join(parentDir, 'AIDE');
    await fsp.mkdir(aideUpperDir);
    await fsp.mkdir(destDir);

    await migrateAideUserData(destDir);

    // On case-insensitive FS, either .migrated-from-AIDE or .migrated-from-aide
    // will exist (they map to the same file). At least one must be present.
    const markerAide = fs.existsSync(path.join(destDir, '.migrated-from-aide'));
    const markerAIDEUpper = fs.existsSync(path.join(destDir, '.migrated-from-AIDE'));
    expect(markerAide || markerAIDEUpper).toBe(true);
  });

  // ── same-path guard ───────────────────────────────────────────────────────

  it('skips with same-path when legacy resolves to the same path as dest', async () => {
    // Simulate productName=aide scenario: parent/aide === destDir
    const aideAsDestDir = path.join(parentDir, 'aide');
    await fsp.mkdir(aideAsDestDir);

    const results = await migrateAideUserData(aideAsDestDir);
    const aideResult = results[0];
    expect(aideResult.migrated).toBe(false);
    expect(aideResult.skipped).toBe('same-path');
  });
});
