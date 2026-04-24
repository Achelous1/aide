import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

// Cross-platform pattern scanner via `git grep` (works on Windows CI).
// git grep exits 1 when no matches — that is the pass state.
function gitGrepCount(pattern: string, pathspec: string[]): number {
  try {
    const out = execSync(
      `git grep -n "${pattern}" -- ${pathspec.join(' ')}`,
      { cwd: ROOT, encoding: 'utf-8' }
    );
    return out.trim() === '' ? 0 : out.trim().split('\n').length;
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { status?: number };
    // git grep exits 1 when no matches — that is the pass state
    if (err.status === 1) return 0;
    throw e;
  }
}

describe('smalti log prefix migration (D5)', () => {
  const srcPathspec = ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js'];

  it('has zero [AIDE] literal in src/', () => {
    expect(gitGrepCount('\\[AIDE\\]', srcPathspec)).toBe(0);
  });

  it('uses [smalti] prefix somewhere in src/ (sanity)', () => {
    expect(gitGrepCount('\\[smalti\\]', srcPathspec)).toBeGreaterThan(0);
  });
});
