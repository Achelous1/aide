/**
 * TDD tests for migrate-aide-data (D8)
 * Tests the ~/.aide → ~/.smalti copy-only migration logic.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

// We'll test the module by mocking getHome to return a temp directory
vi.mock('../../src/main/utils/home', () => ({
  getHome: vi.fn(),
}));

import { getHome } from '../../src/main/utils/home';
import { migrateAideToSmalti } from '../../src/main/migrate-aide-data';

const mockedGetHome = vi.mocked(getHome);

describe('migrateAideToSmalti', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'migrate-test-'));
    mockedGetHome.mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns migrated:false with skipped:no-aide-dir when ~/.aide does not exist', async () => {
    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('no-aide-dir');
  });

  it('returns migrated:false with skipped:smalti-dir-exists when ~/.smalti already exists', async () => {
    await fsp.mkdir(path.join(tmpDir, '.aide'));
    await fsp.mkdir(path.join(tmpDir, '.smalti'));

    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('smalti-dir-exists');
  });

  it('returns migrated:false with skipped:already-migrated when marker exists', async () => {
    const aideDir = path.join(tmpDir, '.aide');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, '.migrated-to-smalti'), new Date().toISOString());

    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('already-migrated');
  });

  it('copies ~/.aide to ~/.smalti and writes marker on success', async () => {
    const aideDir = path.join(tmpDir, '.aide');
    const smaltiDir = path.join(tmpDir, '.smalti');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'settings.json'), '{"test":true}');

    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(true);
    expect(result.skipped).toBeUndefined();

    // ~/.smalti should exist
    expect(fs.existsSync(smaltiDir)).toBe(true);
    // marker should be written in ~/.aide
    expect(fs.existsSync(path.join(aideDir, '.migrated-to-smalti'))).toBe(true);
    // ~/.aide should still exist (copy-only, not move)
    expect(fs.existsSync(aideDir)).toBe(true);
  });

  it('preserves file contents in copy', async () => {
    const aideDir = path.join(tmpDir, '.aide');
    const smaltiDir = path.join(tmpDir, '.smalti');
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
      'utf-8'
    );
    expect(copiedPlugin).toBe('{"id":"p1"}');
  });

  it('does not overwrite existing ~/.smalti even if partially populated', async () => {
    const aideDir = path.join(tmpDir, '.aide');
    const smaltiDir = path.join(tmpDir, '.smalti');
    await fsp.mkdir(aideDir);
    await fsp.writeFile(path.join(aideDir, 'old.json'), 'old');
    await fsp.mkdir(smaltiDir);
    await fsp.writeFile(path.join(smaltiDir, 'existing.json'), 'existing');

    const result = await migrateAideToSmalti();
    expect(result.migrated).toBe(false);
    expect(result.skipped).toBe('smalti-dir-exists');
    // existing.json should remain untouched
    const existing = await fsp.readFile(path.join(smaltiDir, 'existing.json'), 'utf-8');
    expect(existing).toBe('existing');
  });
});
