import { app } from 'electron';
import { execSync } from 'child_process';
import { userInfo } from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Minimum PATH segments guaranteed for pty.spawn to find CLI tools.
 * Covers Homebrew (Apple Silicon + Intel) and standard system paths.
 */
export const FALLBACK_PATH = '/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin';

/**
 * Ensures process.env.PATH contains at least the fallback segments.
 * Returns currentPath unchanged if it already has any of the well-known
 * fallback directories; otherwise prepends FALLBACK_PATH.
 * This prevents pty.spawn failures even when the login shell returns a
 * truncated PATH (e.g. auto-update `open` re-launch inherits Finder env).
 */
export function ensureMinimumPath(currentPath: string | undefined): string {
  if (!currentPath) return FALLBACK_PATH;
  const segments = FALLBACK_PATH.split(':');
  const hasAny = segments.some((seg) => currentPath.split(':').includes(seg));
  if (hasAny) return currentPath;
  return `${FALLBACK_PATH}:${currentPath}`;
}

/**
 * Resolves a reliable home directory, rejecting '/' (Finder launch artifact).
 * Falls back to os.userInfo().homedir (getpwuid-based), then '/tmp' as
 * last resort if userInfo throws.
 */
export function resolveHomeDir(
  envHome: string | undefined,
  getUserInfoHomedir: () => string,
): string {
  if (envHome && envHome !== '/') return envHome;
  try {
    return getUserInfoHomedir();
  } catch {
    return '/tmp';
  }
}

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
    // Fallback: ensure minimal PATH + try to detect nvm's default node
    process.env._SMALTI_ENV_FIX_FAILED = '1';
    const homedir = (() => { try { return userInfo().homedir; } catch { return process.env.HOME || '/'; } })();
    let extraPaths = '/usr/local/bin:/opt/homebrew/bin';

    // Try to find nvm's current default node binary
    try {
      const nvmDir = process.env.NVM_DIR || path.join(homedir, '.nvm');
      const versionsDir = path.join(nvmDir, 'versions', 'node');
      let resolvedVersion: string | null = null;

      // Resolve the default alias, following one level of indirection.
      // e.g. "lts/*" is not a real file — try "lts/<name>" files in the alias dir.
      const defaultAlias = path.join(nvmDir, 'alias', 'default');
      if (fs.existsSync(defaultAlias)) {
        let alias = fs.readFileSync(defaultAlias, 'utf-8').trim();
        if (!alias.startsWith('v')) {
          // Try to follow alias indirection (e.g. "lts/iron" → read that file)
          const indirectFile = path.join(nvmDir, 'alias', alias);
          if (fs.existsSync(indirectFile)) {
            alias = fs.readFileSync(indirectFile, 'utf-8').trim();
          } else if (alias.startsWith('lts/') || alias === 'lts/*') {
            // "lts/*" is a special nvm alias — resolve by picking the highest
            // versioned file under ~/.nvm/alias/lts/
            const ltsDir = path.join(nvmDir, 'alias', 'lts');
            if (fs.existsSync(ltsDir)) {
              const ltsVersions = fs.readdirSync(ltsDir)
                .map((name) => {
                  try { return fs.readFileSync(path.join(ltsDir, name), 'utf-8').trim(); } catch { return ''; }
                })
                .filter((v) => v.startsWith('v'))
                .sort((a, b) => {
                  const parse = (s: string) => s.slice(1).split('.').map(Number);
                  const [ma, mi, mp] = parse(a);
                  const [mb, mib, mpb] = parse(b);
                  return (mb - ma) || (mib - mi) || (mpb - mp);
                });
              if (ltsVersions[0]) alias = ltsVersions[0];
            }
          }
        }
        if (alias.startsWith('v')) resolvedVersion = alias;
      }

      // Last resort: pick the highest installed version numerically
      if (!resolvedVersion && fs.existsSync(versionsDir)) {
        const installed = fs.readdirSync(versionsDir)
          .filter((v) => /^v\d+/.test(v))
          .sort((a, b) => {
            const parse = (s: string) => s.slice(1).split('.').map(Number);
            const [ma, mi, mp] = parse(a);
            const [mb, mib, mpb] = parse(b);
            return (mb - ma) || (mib - mi) || (mpb - mp);
          });
        if (installed[0]) resolvedVersion = installed[0];
      }

      if (resolvedVersion) {
        const nvmNodeBin = path.join(versionsDir, resolvedVersion, 'bin');
        if (fs.existsSync(nvmNodeBin)) {
          extraPaths = `${nvmNodeBin}:${extraPaths}`;
        }
      }
    } catch { /* ignore nvm detection errors */ }

    process.env.PATH = `${extraPaths}:${process.env.PATH || '/usr/bin:/bin'}`;
  }

  // Always guarantee minimum PATH — covers both the happy path (login shell
  // returned a truncated PATH) and the catch path above.
  process.env.PATH = ensureMinimumPath(process.env.PATH);

  // Final safety net: Finder may set HOME=/ and the shell may not correct it.
  // resolveHomeDir uses getpwuid() which is always reliable.
  process.env.HOME = resolveHomeDir(process.env.HOME, () => userInfo().homedir);
}
