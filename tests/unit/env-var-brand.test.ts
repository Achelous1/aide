import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function gitGrepCount(pattern: string, pathspec: string[]): number {
  try {
    const out = execSync(
      `git grep -nE "${pattern}" -- ${pathspec.join(' ')}`,
      { cwd: ROOT, encoding: 'utf-8' }
    );
    return out.trim() === '' ? 0 : out.trim().split('\n').length;
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { status?: number };
    if (err.status === 1) return 0;
    throw e;
  }
}

describe('smalti env var migration (D4)', () => {
  const srcTs = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js'];

  it('uses SMALTI_* prefix for new env reads/writes', () => {
    // sanity: at least one SMALTI_ reference in src
    expect(gitGrepCount('SMALTI_[A-Z_]+', srcTs)).toBeGreaterThan(0);
  });

  it('has a back-compat fallback for AIDE_* somewhere (TODO(task_reb_f03) marker)', () => {
    // Back-compat shim must exist and be tagged for future removal
    expect(gitGrepCount('TODO\\(task_reb_f03\\)', srcTs)).toBeGreaterThan(0);
  });

  // Negative: no direct set of _AIDE_ENV_FIX_FAILED anymore (should be _SMALTI_ENV_FIX_FAILED)
  it('internal flag _AIDE_ENV_FIX_FAILED is migrated to _SMALTI_ENV_FIX_FAILED', () => {
    expect(gitGrepCount('_AIDE_ENV_FIX_FAILED', srcTs)).toBe(0);
    expect(gitGrepCount('_SMALTI_ENV_FIX_FAILED', srcTs)).toBeGreaterThan(0);
  });
});
