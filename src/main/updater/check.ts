/**
 * Auto-update checker — polls the GitHub Releases API for the latest tag and
 * compares it to the running version. On new version: caches the metadata and
 * notifies the renderer. The user clicks "download" → DMG is fetched to the
 * Downloads directory and opened in Finder for the user to drag into
 * Applications. (We don't do in-place .app replacement yet — the build is
 * unsigned, so a real Squirrel auto-update would silently fail anyway.)
 */
import { app, BrowserWindow, net, shell } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile, spawn } from 'child_process';
import { IPC_CHANNELS } from '../ipc/channels';
import { getHome } from '../utils/home';

const REPO_OWNER = 'Achelous1';
// Repo was renamed aide → smalti in 2026-04. GitHub serves a 301 redirect
// for the legacy /Achelous1/aide URL, so older installs that still hit it
// will keep working — but new code should reference the canonical slug.
const REPO_NAME = 'smalti';
const RELEASES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export interface UpdateInfo {
  /** Latest tag from GitHub (e.g. "v0.0.2") */
  latestTag: string;
  /** Currently running app version (e.g. "0.0.1") */
  currentVersion: string;
  /** True if latestTag > currentVersion */
  hasUpdate: boolean;
  /** Download URL of the macOS DMG asset, if present */
  downloadUrl: string | null;
  /** Download URL of the .app.zip asset for in-place auto-install, if present */
  zipDownloadUrl: string | null;
  /** Human-readable release name */
  releaseName: string | null;
  /** Web URL of the release page (fallback for non-DMG platforms) */
  htmlUrl: string | null;
}

interface GithubAsset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  assets: GithubAsset[];
  prerelease: boolean;
  draft: boolean;
}

let cachedInfo: UpdateInfo | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let downloading = false;

/** Strip a leading "v" from a tag and split into numeric components for comparison */
export function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
}

/** Returns true if `a` is strictly greater than `b` (semver-ish, no prerelease support) */
export function isNewer(a: string, b: string): boolean {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.UPDATER_INFO_CHANGED, cachedInfo);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await net.fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `${REPO_NAME}-app`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return response.json() as Promise<T>;
}

/** Query GitHub for the latest release and update the cached info. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const release = await fetchJson<GithubRelease>(RELEASES_URL);
    if (release.draft || release.prerelease) {
      return cachedInfo; // Skip drafts and prereleases
    }

    const latestTag = release.tag_name;
    const currentVersion = app.getVersion();
    const dmgAsset = release.assets.find((a) => a.name.endsWith('.dmg'));
    const zipAsset = release.assets.find((a) => a.name.endsWith('.app.zip'));

    cachedInfo = {
      latestTag,
      currentVersion,
      hasUpdate: isNewer(latestTag, currentVersion),
      downloadUrl: dmgAsset?.browser_download_url ?? null,
      zipDownloadUrl: zipAsset?.browser_download_url ?? null,
      releaseName: release.name,
      htmlUrl: release.html_url,
    };

    broadcast();
    return cachedInfo;
  } catch (err) {
    console.warn('[updater] check failed:', (err as Error).message);
    return cachedInfo;
  }
}

/** Returns the cached update info (last known state). */
export function getCachedUpdateInfo(): UpdateInfo | null {
  return cachedInfo;
}

/**
 * Download the DMG asset to ~/Downloads and reveal it in Finder.
 * Falls back to opening the release page if no DMG asset is available
 * or the download fails.
 */
export async function downloadUpdate(): Promise<{ ok: boolean; path?: string; error?: string }> {
  if (downloading) return { ok: false, error: 'Already downloading' };
  if (!cachedInfo) return { ok: false, error: 'No update info — run check first' };

  // Fallback: open the release page in the browser
  if (!cachedInfo.downloadUrl) {
    if (cachedInfo.htmlUrl) {
      await shell.openExternal(cachedInfo.htmlUrl);
      return { ok: true };
    }
    return { ok: false, error: 'No download URL available' };
  }

  downloading = true;
  try {
    const downloadsDir = path.join(getHome(), 'Downloads');
    if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });
    const filename = `smalti-${cachedInfo.latestTag}.dmg`;
    const targetPath = path.join(downloadsDir, filename);

    const response = await net.fetch(cachedInfo.downloadUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(targetPath, buffer);

    // Reveal in Finder so the user can drag the DMG to Applications
    shell.showItemInFolder(targetPath);
    return { ok: true, path: targetPath };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    downloading = false;
  }
}

/**
 * Find the `.app` bundle inside an extracted update directory by suffix.
 *
 * Name-agnostic so the brand transition (AIDE.app → smalti.app, or any future
 * rename) cannot break the installer. Returns the full absolute path or
 * `null` if no `.app` entry is present.
 *
 * Exported for unit testing.
 */
export function findAppBundle(extractedDir: string): string | null {
  if (!fs.existsSync(extractedDir)) return null;
  const entry = fs.readdirSync(extractedDir).find((name) => name.endsWith('.app'));
  return entry ? path.join(extractedDir, entry) : null;
}

/**
 * Build the bash update script as a string. Exported for unit testing.
 */
export function buildUpdateScript(params: {
  appPath: string;
  newAppPath: string;
  tmpDir: string;
}): string {
  const { appPath, newAppPath, tmpDir } = params;
  return [
    '#!/bin/bash',
    'sleep 3',
    // Remove quarantine on extracted app (legacy defense)
    `xattr -rd com.apple.quarantine "${newAppPath}" 2>/dev/null || true`,
    // Try direct replacement first; escalate to admin dialog if needed
    `if rm -rf "${appPath}" 2>/dev/null && cp -R "${newAppPath}" "${appPath}" 2>/dev/null; then`,
    '  echo "Replaced directly"',
    'else',
    `  osascript -e "do shell script \\"rm -rf '${appPath}' && cp -R '${newAppPath}' '${appPath}'\\" with administrator privileges" 2>/dev/null`,
    'fi',
    // Clear ALL extended attributes on the installed app — defends against
    // quarantine/provenance/other xattrs interfering with hardened runtime.
    `xattr -cr "${appPath}" 2>/dev/null || true`,
    // Clean up temp directory and relaunch
    `rm -rf "${tmpDir}"`,
    `open "${appPath}"`,
  ].join('\n');
}

/**
 * Download .app.zip, extract it, spawn a detached shell script that waits for
 * the app to quit then replaces the .app bundle and relaunches.
 * Falls back to downloadUpdate() if no zip asset is present.
 */
export async function installUpdate(): Promise<{ ok: boolean; error?: string }> {
  if (!app.isPackaged) {
    return { ok: false, error: 'Auto-install only available in packaged app' };
  }
  if (!cachedInfo?.zipDownloadUrl) {
    // No zip asset — fall back to the DMG download path
    return downloadUpdate();
  }
  if (downloading) return { ok: false, error: 'Already downloading' };
  downloading = true;

  try {
    // 1. Download .app.zip to a temp directory
    const tmpDir = path.join(os.tmpdir(), `smalti-update-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, 'app.zip');

    const response = await net.fetch(cachedInfo.zipDownloadUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(zipPath, buffer);

    // 2. Extract using ditto (preserves .app structure, symlinks, resource forks)
    await new Promise<void>((resolve, reject) => {
      execFile('ditto', ['-x', '-k', zipPath, tmpDir], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 3. Find the .app bundle inside the extracted directory.
    // Name-agnostic so the brand transition (AIDE.app → smalti.app, or any
    // future rename) can't break the installer.
    const newAppPath = findAppBundle(tmpDir);
    if (!newAppPath) {
      throw new Error('No .app bundle found in zip');
    }

    // 4. Determine current .app bundle path from the executable path
    const exePath = app.getPath('exe');
    const appPath = exePath.replace(/\.app\/Contents\/.*$/, '.app');

    // 5. Write the update shell script
    const scriptPath = path.join(tmpDir, 'update.sh');
    const script = buildUpdateScript({ appPath, newAppPath, tmpDir });

    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    // 6. Spawn the script detached so it outlives the app process
    spawn('bash', [scriptPath], { detached: true, stdio: 'ignore' }).unref();

    // 7. Quit — the script will relaunch the updated app after 3 s
    app.quit();
    return { ok: true };
  } catch (err) {
    downloading = false;
    return { ok: false, error: (err as Error).message };
  }
}

/** Start periodic polling. Call once after app.ready. */
export function startUpdatePolling(): void {
  // Initial check on startup (give the window a moment to register)
  setTimeout(() => { void checkForUpdate(); }, 5000);
  // Then poll every hour
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { void checkForUpdate(); }, POLL_INTERVAL_MS);
}

export function stopUpdatePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
