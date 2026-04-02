import { app } from 'electron';
import { execSync } from 'child_process';
import { userInfo } from 'os';

/**
 * Packaged Electron apps on macOS launched from Finder don't inherit
 * the user's shell environment (PATH, SHELL, etc.).
 * This loads the login shell env so CLI tools (claude, zsh, etc.) are found.
 */
export function fixPackagedEnv(): void {
  if (!app.isPackaged || process.platform === 'win32') return;

  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const output = execSync(`${shell} -ilc 'env'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });

    for (const line of output.split('\n')) {
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      // PATH and HOME always override — Finder sets HOME=/ and PATH is minimal.
      // Other vars: set only if not already present.
      if (key === 'PATH' || key === 'HOME' || !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Fallback: ensure minimal PATH and correct HOME exist
    if (!process.env.PATH?.includes('/usr/local/bin')) {
      process.env.PATH = `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || '/usr/bin:/bin'}`;
    }
  }

  // Final safety net: Finder may set HOME=/ and the shell may not correct it.
  // os.userInfo().homedir uses getpwuid() which is always reliable.
  if (!process.env.HOME || process.env.HOME === '/') {
    try {
      process.env.HOME = userInfo().homedir;
    } catch { /* ignore */ }
  }
}
