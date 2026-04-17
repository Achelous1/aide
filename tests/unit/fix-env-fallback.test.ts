import { describe, it, expect } from 'vitest';
import { FALLBACK_PATH, ensureMinimumPath, resolveHomeDir } from '../../src/main/fix-env';

describe('FALLBACK_PATH', () => {
  it('contains /usr/local/bin and /opt/homebrew/bin', () => {
    expect(FALLBACK_PATH).toContain('/usr/local/bin');
    expect(FALLBACK_PATH).toContain('/opt/homebrew/bin');
    expect(FALLBACK_PATH).toContain('/bin');
    expect(FALLBACK_PATH).toContain('/usr/bin');
  });
});

describe('ensureMinimumPath', () => {
  it('returns FALLBACK_PATH when given undefined', () => {
    expect(ensureMinimumPath(undefined)).toBe(FALLBACK_PATH);
  });

  it('returns FALLBACK_PATH when given empty string', () => {
    expect(ensureMinimumPath('')).toBe(FALLBACK_PATH);
  });

  it('returns path as-is when it already contains /usr/local/bin', () => {
    const p = '/usr/local/bin:/other/path';
    expect(ensureMinimumPath(p)).toBe(p);
  });

  it('returns path as-is when it already contains /opt/homebrew/bin', () => {
    const p = '/opt/homebrew/bin:/some/other';
    expect(ensureMinimumPath(p)).toBe(p);
  });

  it('prepends FALLBACK_PATH when path has none of the fallback segments', () => {
    const p = '/some/other/only';
    const result = ensureMinimumPath(p);
    expect(result).toBe(`${FALLBACK_PATH}:${p}`);
  });

  it('returns path as-is when it already contains /usr/bin (a fallback segment)', () => {
    // /usr/bin is one of the FALLBACK_PATH segments, so no prepend should occur
    const p = '/usr/bin:/bin';
    const result = ensureMinimumPath(p);
    expect(result).toBe(p);
  });
});

describe('resolveHomeDir', () => {
  it('returns getUserInfoHomedir() when HOME is "/"', () => {
    const result = resolveHomeDir('/', () => '/Users/alice');
    expect(result).toBe('/Users/alice');
  });

  it('returns getUserInfoHomedir() when HOME is undefined', () => {
    const result = resolveHomeDir(undefined, () => '/Users/alice');
    expect(result).toBe('/Users/alice');
  });

  it('returns getUserInfoHomedir() when HOME is empty string', () => {
    const result = resolveHomeDir('', () => '/Users/alice');
    expect(result).toBe('/Users/alice');
  });

  it('returns HOME as-is when it is a valid path', () => {
    const result = resolveHomeDir('/Users/bob', () => '/Users/alice');
    expect(result).toBe('/Users/bob');
  });

  it('returns /tmp when HOME is "/" and getUserInfoHomedir throws', () => {
    const result = resolveHomeDir('/', () => { throw new Error('getpwuid failed'); });
    expect(result).toBe('/tmp');
  });

  it('returns /tmp when HOME is undefined and getUserInfoHomedir throws', () => {
    const result = resolveHomeDir(undefined, () => { throw new Error('getpwuid failed'); });
    expect(result).toBe('/tmp');
  });
});
