/**
 * Copy + cleanup migration: ~/.aide → ~/.smalti
 *
 * Algorithm:
 *   1. ~/.aide doesn't exist           → no-op (already clean or never used).
 *   2. ~/.smalti doesn't exist          → copy ~/.aide → ~/.smalti, write marker
 *                                         (~/.smalti/.migrated-from-aide), delete ~/.aide.
 *   3. Both ~/.aide and ~/.smalti exist → ensure marker is present, then delete
 *                                         ~/.aide. ~/.smalti is treated as the
 *                                         active directory of record.
 *
 * Marker lives inside ~/.smalti/ (not ~/.aide/) so it survives the legacy delete
 * and remains a stable signal that the migration ran.
 *
 * Delete failures are non-fatal — we report deletedLegacy:false but still
 * advance ~/.smalti as the source of truth.
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { getHome } from './utils/home';

export interface MigrateResult {
  migrated: boolean;
  /** Whether the legacy ~/.aide directory was successfully removed in this run. */
  deletedLegacy?: boolean;
  skipped?: string;
}

export async function migrateAideToSmalti(): Promise<MigrateResult> {
  const home = getHome();
  const oldDir = path.join(home, '.aide');
  const newDir = path.join(home, '.smalti');
  const marker = path.join(newDir, '.migrated-from-aide');

  if (!fs.existsSync(oldDir)) {
    return { migrated: false, skipped: 'no-aide-dir' };
  }

  if (fs.existsSync(newDir)) {
    // ~/.smalti already exists — either a previous migration or a manual setup.
    // Ensure the marker is in place, then drop legacy ~/.aide.
    if (!fs.existsSync(marker)) {
      try {
        await fsp.writeFile(marker, new Date().toISOString());
      } catch {
        // best-effort marker write
      }
    }
    try {
      await fsp.rm(oldDir, { recursive: true, force: true });
      return { migrated: false, skipped: 'already-migrated', deletedLegacy: true };
    } catch {
      return { migrated: false, skipped: 'already-migrated', deletedLegacy: false };
    }
  }

  // First-time migration: copy ~/.aide → ~/.smalti, then delete legacy.
  await fsp.cp(oldDir, newDir, { recursive: true });
  await fsp.writeFile(marker, new Date().toISOString());

  try {
    await fsp.rm(oldDir, { recursive: true, force: true });
    return { migrated: true, deletedLegacy: true };
  } catch {
    return { migrated: true, deletedLegacy: false };
  }
}
