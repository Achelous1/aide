/**
 * One-time copy-only migration: ~/.aide → ~/.smalti
 *
 * Uses copy (NOT rename/move) so the user's ~/.aide is preserved for rollback.
 * A marker file ~/.aide/.migrated-to-smalti prevents re-attempts on subsequent launches.
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { getHome } from './utils/home';

export interface MigrateResult {
  migrated: boolean;
  skipped?: string;
}

export async function migrateAideToSmalti(): Promise<MigrateResult> {
  const home = getHome();
  const oldDir = path.join(home, '.aide');
  const newDir = path.join(home, '.smalti');
  const marker = path.join(oldDir, '.migrated-to-smalti');

  if (!fs.existsSync(oldDir)) {
    return { migrated: false, skipped: 'no-aide-dir' };
  }
  if (fs.existsSync(newDir)) {
    return { migrated: false, skipped: 'smalti-dir-exists' };
  }
  if (fs.existsSync(marker)) {
    return { migrated: false, skipped: 'already-migrated' };
  }

  // Copy (NOT move) for safety — user can always rollback by removing ~/.smalti
  await fsp.cp(oldDir, newDir, { recursive: true });

  // Write marker so next launch does not re-attempt
  await fsp.writeFile(marker, new Date().toISOString());

  return { migrated: true };
}
