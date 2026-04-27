/**
 * userData directory migration: legacy Electron userData dirs → current Smalti userData.
 *
 * Strategy (per legacy candidate):
 *   1. Legacy dir doesn't exist          → skip (no-legacy-dir).
 *   2. Legacy === dest                   → skip (same-path).
 *   3. Dest doesn't exist                → atomic rename.
 *   4. Both exist                        → merge, dest wins conflicts, delete legacy.
 *
 * Candidates searched inside the same parent as destUserData:
 *   - 'aide'  (v0.1.x productName)
 *   - 'AIDE'  (v0.0.x productName)
 *
 * Each legacy produces one MigrateResult. Marker written per legacy:
 *   <dest>/.migrated-from-<legacyBasename>
 *
 * The function is electron-free so tests can inject destUserData without
 * importing `app`. Production callers pass `app.getPath('userData')`.
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { MigrateResult, mergeDirectory } from './migrate-aide-data';

const LEGACY_BASENAMES = ['aide', 'AIDE'] as const;

export async function migrateAideUserData(destUserData: string): Promise<MigrateResult[]> {
  const parent = path.dirname(destUserData);
  const results: MigrateResult[] = [];

  for (const basename of LEGACY_BASENAMES) {
    const legacyDir = path.join(parent, basename);
    const marker = path.join(destUserData, `.migrated-from-${basename}`);

    // Skip if legacy doesn't exist.
    if (!fs.existsSync(legacyDir)) {
      results.push({ migrated: false, skipped: 'no-legacy-dir' });
      continue;
    }

    // Guard: legacy and dest are the same path (e.g. productName happens to match).
    if (path.resolve(legacyDir) === path.resolve(destUserData)) {
      results.push({ migrated: false, skipped: 'same-path' });
      continue;
    }

    const warnings: string[] = [];

    // Branch 1: dest doesn't exist — atomic rename.
    if (!fs.existsSync(destUserData)) {
      try {
        await fsp.rename(legacyDir, destUserData);
      } catch (err) {
        warnings.push(`rename ${legacyDir} → ${destUserData}: ${(err as Error).message}`);
        try {
          await fsp.cp(legacyDir, destUserData, { recursive: true });
          await fsp.rm(legacyDir, { recursive: true, force: true });
        } catch (cpErr) {
          warnings.push(`cp fallback: ${(cpErr as Error).message}`);
          results.push({ migrated: false, skipped: 'rename-and-copy-failed', warnings });
          continue;
        }
      }
      try {
        await fsp.writeFile(marker, new Date().toISOString());
      } catch (err) {
        warnings.push(`marker write: ${(err as Error).message}`);
      }
      results.push({ migrated: true, mode: 'renamed', deletedLegacy: true, warnings });
      continue;
    }

    // Branch 2: both exist — merge, then drop legacy.
    await mergeDirectory(legacyDir, destUserData, warnings);
    if (!fs.existsSync(marker)) {
      try {
        await fsp.writeFile(marker, new Date().toISOString());
      } catch (err) {
        warnings.push(`marker write: ${(err as Error).message}`);
      }
    }
    let deletedLegacy = false;
    try {
      await fsp.rm(legacyDir, { recursive: true, force: true });
      deletedLegacy = !fs.existsSync(legacyDir);
      if (!deletedLegacy) {
        warnings.push(`rm ${legacyDir}: directory still present after rm — likely held by another process`);
      }
    } catch (err) {
      warnings.push(`rm ${legacyDir}: ${(err as Error).message}`);
    }
    results.push({ migrated: true, mode: 'merged', deletedLegacy, warnings });
  }

  return results;
}
