/**
 * Tests for migrate-aide-workspace: per-workspace .aide → .smalti migration.
 *
 *   1. <ws>/.aide absent             → no-op (skipped: no-aide-dir).
 *   2. .aide only, .smalti absent    → atomic rename, marker written, .aide gone.
 *   3. Both exist                    → merge, dest wins conflicts, .aide deleted.
 *   4. File collision — dest content preserved.
 *   5. Nested files/directories preserved.
 *   6. Second call idempotent (marker present, .aide gone → no-aide-dir skip).
 *   7. Marker present but .aide reappeared → re-merge, marker preserved.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { migrateAideWorkspace } from '../../src/main/migrate-aide-workspace';

describe('migrateAideWorkspace', () => {
  let wsDir: string;
  let aideDir: string;
  let smaltiDir: string;
  let marker: string;

  beforeEach(async () => {
    wsDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ws-migrate-test-'));
    aideDir = path.join(wsDir, '.aide');
    smaltiDir = path.join(wsDir, '.smalti');
    marker = path.join(smaltiDir, '.migrated-from-aide');
  });

  afterEach(async () => {
    await fsp.rm(wsDir, { recursive: true, force: true });
  });

  // ── Case 1: .aide absent ──────────────────────────────────────────────────

  it('returns migrated:false skipped:no-aide-dir when .aide does not exist', async () => {
    const result = await migrateAideWorkspace(wsDir);
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
    expect(result.deletedLegacy).toBeUndefined();
  });

  // ── Case 2: rename branch ─────────────────────────────────────────────────

  it('rename branch: .smalti absent — atomic rename, marker written, .aide gone', async () => {
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'agent-todos.json'), '[]');

    const result = await migrateAideWorkspace(wsDir);

    expect(result.migrated).toBe(true);
    expect(result.mode).toBe('renamed');
    expect(result.deletedLegacy).toBe(true);
    expect(fs.existsSync(smaltiDir)).toBe(true);
    expect(fs.existsSync(path.join(smaltiDir, 'agent-todos.json'))).toBe(true);
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  // ── Case 3: merge branch ──────────────────────────────────────────────────

  it('merge branch: both exist — moves missing items, keeps dest winners, deletes .aide', async () => {
    await fsp.mkdir(path.join(aideDir, 'plugins'), { recursive: true });
    await fsp.writeFile(path.join(aideDir, 'leftover.json'), 'old');
    await fsp.writeFile(path.join(aideDir, 'plugins', 'spec.json'), 'plugin');
    await fsp.mkdir(path.join(smaltiDir, 'plugins'), { recursive: true });
    await fsp.writeFile(path.join(smaltiDir, 'existing.json'), 'existing');

    const result = await migrateAideWorkspace(wsDir);

    expect(result.migrated).toBe(true);
    expect(result.mode).toBe('merged');
    expect(result.deletedLegacy).toBe(true);
    expect(await fsp.readFile(path.join(smaltiDir, 'existing.json'), 'utf-8')).toBe('existing');
    expect(await fsp.readFile(path.join(smaltiDir, 'leftover.json'), 'utf-8')).toBe('old');
    expect(await fsp.readFile(path.join(smaltiDir, 'plugins', 'spec.json'), 'utf-8')).toBe('plugin');
    expect(fs.existsSync(marker)).toBe(true);
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  // ── Case 4: conflict — dest wins ─────────────────────────────────────────

  it('merge branch: dest wins file collision', async () => {
    await fsp.mkdir(aideDir);
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(path.join(aideDir, 'config.json'), 'aide-version');
    await fsp.writeFile(path.join(smaltiDir, 'config.json'), 'smalti-version');

    await migrateAideWorkspace(wsDir);

    expect(await fsp.readFile(path.join(smaltiDir, 'config.json'), 'utf-8')).toBe('smalti-version');
    expect(fs.existsSync(aideDir)).toBe(false);
  });

  // ── Case 5: nested files/directories preserved ────────────────────────────

  it('rename branch: preserves nested directory structure and file content', async () => {
    await fsp.mkdir(path.join(aideDir, 'plugins', 'agent-todo-board', 'src'), { recursive: true });
    const content = JSON.stringify({ tasks: [] });
    await fsp.writeFile(path.join(aideDir, 'plugins', 'agent-todo-board', 'src', 'index.js'), content);

    await migrateAideWorkspace(wsDir);

    const destFile = path.join(smaltiDir, 'plugins', 'agent-todo-board', 'src', 'index.js');
    expect(await fsp.readFile(destFile, 'utf-8')).toBe(content);
  });

  // ── Case 6: idempotent — second call skips ───────────────────────────────

  it('second call is a no-op when marker exists and .aide is gone', async () => {
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'x.json'), '1');
    await migrateAideWorkspace(wsDir);
    expect(fs.existsSync(aideDir)).toBe(false);

    const result = await migrateAideWorkspace(wsDir);
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
  });

  // ── Case 7: stale marker + .aide reappeared → re-merge ───────────────────

  it('re-merges when marker exists but .aide has reappeared, preserves marker', async () => {
    // Simulate: marker from previous run, .aide recreated externally.
    await fsp.mkdir(smaltiDir, { recursive: true });
    await fsp.writeFile(marker, '2026-04-01T00:00:00Z');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'stale.json'), 'stale');

    const result = await migrateAideWorkspace(wsDir);

    expect(result.migrated).toBe(true);
    expect(result.mode).toBe('merged');
    expect(fs.existsSync(path.join(smaltiDir, 'stale.json'))).toBe(true);
    expect(fs.existsSync(aideDir)).toBe(false);
    // Marker content was already present — kept as-is (merge branch doesn't overwrite).
    expect(await fsp.readFile(marker, 'utf-8')).toBe('2026-04-01T00:00:00Z');
  });
});
