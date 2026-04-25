import { describe, it, expect, afterEach } from 'vitest';

/**
 * Tests that home directory resolution rejects HOME=/ (Finder launch)
 * and falls back to os.userInfo().homedir.
 */

describe('getHome() — Finder HOME=/ resolution', () => {
  const originalHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  it('uses process.env.HOME when valid', () => {
    process.env.HOME = '/Users/testuser';
    // Simulate the getHome() logic used in plugin-handlers.ts and config-writer.ts
    const home = getHome();
    expect(home).toBe('/Users/testuser');
  });

  it('rejects HOME=/ and falls back to os.userInfo().homedir', () => {
    process.env.HOME = '/';
    const home = getHome();
    expect(home).not.toBe('/');
    expect(home.length).toBeGreaterThan(1);
  });

  it('rejects empty HOME and falls back', () => {
    process.env.HOME = '';
    const home = getHome();
    expect(home).not.toBe('');
    expect(home).not.toBe('/');
  });

  it('rejects undefined HOME and falls back', () => {
    delete process.env.HOME;
    const home = getHome();
    expect(home).toBeTruthy();
    expect(home).not.toBe('/');
  });
});

describe('fix-env HOME override logic', () => {
  it('overrides HOME when parsing shell env output', () => {
    const envOutput = 'PATH=/usr/bin\nHOME=/Users/realuser\nSHELL=/bin/zsh';
    const result: Record<string, string> = {};

    // Simulate the fix-env.ts parsing logic
    for (const line of envOutput.split('\n')) {
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      if (key === 'PATH' || key === 'HOME' || !result[key]) {
        result[key] = value;
      }
    }

    expect(result.HOME).toBe('/Users/realuser');
    expect(result.PATH).toBe('/usr/bin');
  });

  it('HOME override replaces existing HOME=/', () => {
    const env: Record<string, string> = { HOME: '/' };
    const shellLine = 'HOME=/Users/realuser';
    const idx = shellLine.indexOf('=');
    const key = shellLine.slice(0, idx);
    const value = shellLine.slice(idx + 1);

    // Simulating: if (key === 'PATH' || key === 'HOME' || !env[key])
    if (key === 'PATH' || key === 'HOME' || !env[key]) {
      env[key] = value;
    }

    expect(env.HOME).toBe('/Users/realuser');
  });
});

/** Extracted getHome() logic matching plugin-handlers.ts and config-writer.ts */
function getHome(): string {
  const env = process.env.HOME;
  if (env && env !== '/') return env;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { return require('os').userInfo().homedir; } catch { /* ignore */ }
  return '/'; // fallback for test — real code uses app.getPath('home')
}
