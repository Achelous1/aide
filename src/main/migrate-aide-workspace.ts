/**
 * Per-workspace migration: <workspace>/.aide → <workspace>/.smalti
 *
 * Strategy mirrors migrateAideToSmalti() in migrate-aide-data.ts but operates
 * on a caller-supplied workspace path rather than the user home directory.
 *
 *   1. <ws>/.aide doesn't exist           → no-op.
 *   2. <ws>/.smalti doesn't exist          → atomic rename.
 *   3. Both exist                          → directory merge with destination
 *                                            winning conflicts, then delete
 *                                            the now-emptied <ws>/.aide.
 *
 * Marker (<ws>/.smalti/.migrated-from-aide) records that migration has run.
 * If the marker exists but <ws>/.aide has reappeared (e.g. partial failure
 * on a previous run), a fresh merge attempt is made and the marker preserved.
 *
 * Idempotent: marker present + no <ws>/.aide → skipped 'no-aide-dir'.
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { MigrateResult, mergeDirectory } from './migrate-aide-data';

export async function migrateAideWorkspace(workspacePath: string): Promise<MigrateResult> {
  const oldDir = path.join(workspacePath, '.aide');
  const newDir = path.join(workspacePath, '.smalti');
  const marker = path.join(newDir, '.migrated-from-aide');
  const warnings: string[] = [];

  if (!fs.existsSync(oldDir)) {
    return { migrated: false, skipped: 'no-aide-dir' };
  }

  // Same-path guard: should not arise in practice but protects against
  // workspacePath being exactly <parent>/.aide.
  if (path.resolve(oldDir) === path.resolve(newDir)) {
    return { migrated: false, skipped: 'same-path' };
  }

  // Branch 1: <ws>/.smalti doesn't exist — atomic rename.
  if (!fs.existsSync(newDir)) {
    try {
      await fsp.rename(oldDir, newDir);
    } catch (err) {
      // Cross-filesystem rename (EXDEV) — fall back to cp + rm.
      warnings.push(`rename ${oldDir} → ${newDir}: ${(err as Error).message}`);
      try {
        await fsp.cp(oldDir, newDir, { recursive: true });
        await fsp.rm(oldDir, { recursive: true, force: true });
      } catch (cpErr) {
        warnings.push(`cp fallback: ${(cpErr as Error).message}`);
        return { migrated: false, skipped: 'rename-and-copy-failed', warnings };
      }
    }
    try {
      await fsp.writeFile(marker, new Date().toISOString());
    } catch (err) {
      warnings.push(`marker write: ${(err as Error).message}`);
    }
    return { migrated: true, mode: 'renamed', deletedLegacy: true, warnings };
  }

  // Branch 2: both exist — merge, then drop the source.
  await mergeDirectory(oldDir, newDir, warnings);
  if (!fs.existsSync(marker)) {
    try {
      await fsp.writeFile(marker, new Date().toISOString());
    } catch (err) {
      warnings.push(`marker write: ${(err as Error).message}`);
    }
  }
  let deletedLegacy = false;
  try {
    await fsp.rm(oldDir, { recursive: true, force: true });
    deletedLegacy = !fs.existsSync(oldDir);
    if (!deletedLegacy) {
      warnings.push(`rm ${oldDir}: directory still present after rm — likely held by another process`);
    }
  } catch (err) {
    warnings.push(`rm ${oldDir}: ${(err as Error).message}`);
  }
  return { migrated: true, mode: 'merged', deletedLegacy, warnings };
}
