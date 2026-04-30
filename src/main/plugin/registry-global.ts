import fs from 'fs';
import path from 'path';
import { getHome } from '../utils/home';
import {
  packDirectoryToZipBuffer,
  unpackZipBufferToDirectory,
  computeDirectoryContentHash,
} from './zip-utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RegistryIndex {
  version: 1;
  plugins: Record<string, { latest: string; name: string; updatedAt: string }>;
}

export interface PluginMeta {
  id: string;
  name: string;
  description: string;
  latest: string;
  history: Array<{ version: string; contentHash: string; publishedAt: string }>;
}

export interface RegistrySummary {
  id: string;
  name: string;
  description: string;
  latest: string;
}

export type SyncStatus = 'synced' | 'update-available' | 'locally-modified' | 'unknown';

export interface RegistryDiff {
  registryId: string;
  status: SyncStatus;
  installedVersion: string | null;
  latestVersion: string | null;
  installedContentHash: string | null;
  workspaceContentHash: string;
}

export interface PushOptions {
  id: string;
  name: string;
  description: string;
  version: string;
}

export interface PushResult {
  version: string;
  contentHash: string;
  /** True if this push was idempotent (same version + same hash already existed). */
  idempotent: boolean;
}

// ---------------------------------------------------------------------------
// Internal state (test override)
// ---------------------------------------------------------------------------

let _registryRootOverride: string | null = null;

/**
 * Test-only: override the registry root path. Pass null to reset to default.
 */
export function _setRegistryRootForTesting(p: string | null): void {
  _registryRootOverride = p;
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Resolve the global registry root path (~/.smalti/registry). Uses getHome(). */
export function getRegistryRoot(): string {
  if (_registryRootOverride !== null) return _registryRootOverride;
  return path.join(getHome(), '.smalti', 'registry');
}

function pluginDir(id: string): string {
  return path.join(getRegistryRoot(), 'plugins', id);
}

function versionDir(id: string, version: string): string {
  return path.join(pluginDir(id), 'versions', version);
}

function indexPath(): string {
  return path.join(getRegistryRoot(), 'index.json');
}

function metaPath(id: string): string {
  return path.join(pluginDir(id), 'meta.json');
}

// ---------------------------------------------------------------------------
// Atomic write helper
// ---------------------------------------------------------------------------

function atomicWriteFile(targetPath: string, data: string | Buffer): void {
  const tmpPath = targetPath + '.tmp.' + process.pid + '.' + Date.now();
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, targetPath);
}

// ---------------------------------------------------------------------------
// SemVer helpers
// ---------------------------------------------------------------------------

function parseSemver(s: string): [number, number, number] {
  const parts = s.split('.');
  return [parseInt(parts[0] ?? '0', 10), parseInt(parts[1] ?? '0', 10), parseInt(parts[2] ?? '0', 10)];
}

/** Returns -1 if a < b, 0 if equal, 1 if a > b */
function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const [aMaj, aMin, aPat] = parseSemver(a);
  const [bMaj, bMin, bPat] = parseSemver(b);
  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPat !== bPat) return aPat > bPat ? 1 : -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Index R/W
// ---------------------------------------------------------------------------

function readIndex(): RegistryIndex {
  const p = indexPath();
  if (!fs.existsSync(p)) return { version: 1, plugins: {} };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as RegistryIndex;
  } catch {
    return { version: 1, plugins: {} };
  }
}

function writeIndex(idx: RegistryIndex): void {
  const p = indexPath();
  atomicWriteFile(p, JSON.stringify(idx, null, 2));
}

// ---------------------------------------------------------------------------
// Meta R/W
// ---------------------------------------------------------------------------

function readMeta(id: string): PluginMeta | null {
  const p = metaPath(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as PluginMeta;
  } catch {
    return null;
  }
}

function writeMeta(meta: PluginMeta): void {
  atomicWriteFile(metaPath(meta.id), JSON.stringify(meta, null, 2));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Ensure registry root exists. Idempotent. Safe to call multiple times. */
export function ensureRegistryRoot(): void {
  fs.mkdirSync(getRegistryRoot(), { recursive: true });
}

/** Push a workspace plugin directory to the global registry. */
export function pushPlugin(workspacePluginDir: string, opts: PushOptions): PushResult {
  const { id, name, description, version } = opts;

  ensureRegistryRoot();

  const contentHashObj = computeDirectoryContentHash(workspacePluginDir);
  const contentHash = contentHashObj.toString();

  const vDir = versionDir(id, version);
  const zipFilePath = path.join(vDir, 'plugin.zip');
  const hashFilePath = path.join(vDir, 'contentHash.txt');

  // Check if this (id, version) already exists
  if (fs.existsSync(zipFilePath)) {
    const existingHash = fs.readFileSync(hashFilePath, 'utf8').trim();
    if (existingHash === contentHash) {
      // Idempotent — same content
      return { version, contentHash, idempotent: true };
    }
    // Same version, different content — immutable violation
    throw new Error(`version is immutable: ${id}@${version} already exists with different content`);
  }

  // New version — write zip + contentHash atomically
  fs.mkdirSync(vDir, { recursive: true });

  const zipBuf = packDirectoryToZipBuffer(workspacePluginDir);
  atomicWriteFile(zipFilePath, zipBuf);
  atomicWriteFile(hashFilePath, contentHash);

  // Update meta.json
  const now = new Date().toISOString();
  let meta = readMeta(id);
  if (meta === null) {
    meta = { id, name, description, latest: version, history: [] };
  }
  meta.history.push({ version, contentHash, publishedAt: now });
  // Update latest only if this version is semver-greater
  if (compareSemver(version, meta.latest) > 0) {
    meta.latest = version;
  }
  fs.mkdirSync(pluginDir(id), { recursive: true });
  writeMeta(meta);

  // Update index.json
  const idx = readIndex();
  idx.plugins[id] = { latest: meta.latest, name, updatedAt: now };
  writeIndex(idx);

  return { version, contentHash, idempotent: false };
}

/** Pull a plugin version's zip into destDir (unpacked). Returns contentHash. */
export function pullPlugin(id: string, version: string, destDir: string): { contentHash: string } {
  const vDir = versionDir(id, version);
  const zipFilePath = path.join(vDir, 'plugin.zip');
  const hashFilePath = path.join(vDir, 'contentHash.txt');

  if (!fs.existsSync(zipFilePath)) {
    throw new Error(`Plugin not found: ${id}@${version}`);
  }

  const buf = fs.readFileSync(zipFilePath);
  unpackZipBufferToDirectory(buf, destDir);

  const contentHash = fs.readFileSync(hashFilePath, 'utf8').trim();
  return { contentHash };
}

/** List all plugins in the registry from index.json. Empty array if registry is empty. */
export function listPlugins(): RegistrySummary[] {
  const idx = readIndex();
  return Object.entries(idx.plugins).map(([id, entry]) => ({
    id,
    name: entry.name,
    description: getPluginMeta(id)?.description ?? '',
    latest: entry.latest,
  }));
}

/** Read a plugin's full meta.json. null if not found. */
export function getPluginMeta(id: string): PluginMeta | null {
  return readMeta(id);
}

/** Compute the diff/status for a workspace plugin against the global registry. */
export function diffPlugin(
  id: string,
  workspacePluginDir: string,
  source: { installedVersion: string; installedContentHash: string },
): RegistryDiff {
  const currentHashObj = computeDirectoryContentHash(workspacePluginDir);
  const workspaceContentHash = currentHashObj.toString();

  const meta = getPluginMeta(id);

  if (meta === null) {
    return {
      registryId: id,
      status: 'unknown',
      installedVersion: source.installedVersion,
      latestVersion: null,
      installedContentHash: source.installedContentHash,
      workspaceContentHash,
    };
  }

  const latestVersion = meta.latest;
  const isDirty = workspaceContentHash !== source.installedContentHash;

  let status: SyncStatus;
  const cmp = compareSemver(latestVersion, source.installedVersion);

  if (cmp > 0) {
    // Registry has a newer version
    // workspace dirty takes priority (D3: "locally-modified wins over update-available")
    status = isDirty ? 'locally-modified' : 'update-available';
  } else {
    // latestVersion <= installedVersion (synced or workspace ahead)
    status = isDirty ? 'locally-modified' : 'synced';
  }

  return {
    registryId: id,
    status,
    installedVersion: source.installedVersion,
    latestVersion,
    installedContentHash: source.installedContentHash,
    workspaceContentHash,
  };
}

/** Remove a plugin completely from the registry (all versions + meta + index entry). */
export function removePlugin(id: string): void {
  const pDir = pluginDir(id);
  if (fs.existsSync(pDir)) {
    fs.rmSync(pDir, { recursive: true, force: true });
  }

  const idx = readIndex();
  if (id in idx.plugins) {
    delete idx.plugins[id];
    writeIndex(idx);
  }
}
