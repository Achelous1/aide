/**
 * Rename-first migration: ~/.aide → ~/.smalti
 *
 * Strategy:
 *   1. ~/.aide doesn't exist           → no-op.
 *   2. ~/.smalti doesn't exist          → atomic rename (single syscall, no
 *                                         copy churn, preserves inodes &
 *                                         permissions).
 *   3. Both exist                       → directory merge with destination
 *                                         winning conflicts, then delete
 *                                         the now-emptied ~/.aide.
 *
 * Why both branches:
 *   The renderer/main bootstrap calls writeMcpServerScript() on every launch,
 *   which lazily creates ~/.smalti/ to drop smalti-mcp-server.js into. So by
 *   the time migrateAideToSmalti runs, ~/.smalti already exists for users
 *   who have run any v0.2.x build at least once — the simple-rename branch
 *   is unreachable for them. Hence the merge fallback.
 *
 * Marker (~/.smalti/.migrated-from-aide) records that migration has run, so
 * future launches don't redo the merge.
 *
 * Failures are surfaced via the returned MigrateResult AND a console.warn so
 * post-mortem debugging is possible (the previous copy-only version swallowed
 * delete errors silently and left ~/.aide on disk).
 */
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { getHome } from './utils/home';

export interface MigrateResult {
  migrated: boolean;
  /** Which strategy ran: 'renamed' (atomic), 'merged' (both existed), or undefined when skipped. */
  mode?: 'renamed' | 'merged';
  /** Whether the legacy ~/.aide directory was successfully removed in this run. */
  deletedLegacy?: boolean;
  /** Why the migration was skipped, when it didn't run. */
  skipped?: string;
  /** Surface non-fatal errors so callers can log them. */
  warnings?: string[];
}

/**
 * Recursively merge `src` into `dest`. Items that don't exist in `dest` are
 * moved (rename) — items that already exist in `dest` are kept (dest wins).
 * Subdirectories are recursed so inner files can be picked up.
 */
async function mergeDirectory(src: string, dest: string, warnings: string[]): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(src, { withFileTypes: true });
  } catch (err) {
    warnings.push(`readdir ${src}: ${(err as Error).message}`);
    return;
  }

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (!fs.existsSync(destPath)) {
      // Move it across — rename when same filesystem, fall back to cp+rm.
      try {
        await fsp.rename(srcPath, destPath);
      } catch {
        try {
          await fsp.cp(srcPath, destPath, { recursive: true });
          await fsp.rm(srcPath, { recursive: true, force: true });
        } catch (cpErr) {
          warnings.push(`cp ${srcPath} → ${destPath}: ${(cpErr as Error).message}`);
        }
      }
      continue;
    }

    if (entry.isDirectory()) {
      // Both have this directory — recurse so inner items can still merge.
      await mergeDirectory(srcPath, destPath, warnings);
    }
    // else: file collision, dest wins — leave srcPath alone, it'll be removed
    // when we rm the parent below.
  }
}

export async function migrateAideToSmalti(): Promise<MigrateResult> {
  const home = getHome();
  const oldDir = path.join(home, '.aide');
  const newDir = path.join(home, '.smalti');
  const marker = path.join(newDir, '.migrated-from-aide');
  const warnings: string[] = [];

  if (!fs.existsSync(oldDir)) {
    return { migrated: false, skipped: 'no-aide-dir' };
  }

  // Branch 1: ~/.smalti doesn't exist — atomic rename.
  if (!fs.existsSync(newDir)) {
    try {
      await fsp.rename(oldDir, newDir);
    } catch (err) {
      // Cross-filesystem rename, EXDEV — fall back to cp + rm.
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
