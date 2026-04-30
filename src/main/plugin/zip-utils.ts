import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface ContentHash {
  algo: 'sha256';
  hex: string;
  /** Convenience: "sha256:<hex>" */
  toString(): string;
}

function makeContentHash(hex: string): ContentHash {
  return {
    algo: 'sha256',
    hex,
    toString() {
      return `sha256:${hex}`;
    },
  };
}

/** Returns true if the path segment should be excluded (hidden files/dirs, node_modules). */
function isExcluded(name: string): boolean {
  // node_modules and Thumbs.db are explicit exclusions
  if (name === 'node_modules' || name === 'Thumbs.db') return true;
  // Any name starting with '.' is excluded (.DS_Store, .git, .hidden, etc.)
  if (name.startsWith('.')) return true;
  return false;
}

/**
 * Returns true if a relative path should be excluded from content hashing.
 * plugin.spec.json contains registry metadata (source block) that changes on
 * every push, so including it would make the hash unstable across push/pull
 * cycles. All other files determine whether the plugin's logic has changed.
 */
function isExcludedFromHash(rel: string): boolean {
  // Normalise to forward slashes for cross-platform comparison
  const normalized = rel.split(path.sep).join('/');
  return normalized === 'plugin.spec.json';
}

/**
 * Walk a directory recursively, returning sorted relative file paths.
 * Skips excluded entries (hidden files/dirs, node_modules).
 */
function walkFiles(dir: string, base: string = dir): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (isExcluded(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, base));
    } else if (entry.isFile()) {
      results.push(path.relative(base, fullPath));
    }
  }
  return results.sort();
}

/** Pack a directory tree into a zip Buffer. Excludes hidden files. */
export function packDirectoryToZipBuffer(srcDir: string): Buffer {
  const zip = new AdmZip();
  const files = walkFiles(srcDir);
  for (const rel of files) {
    const fullPath = path.join(srcDir, rel);
    const content = fs.readFileSync(fullPath);
    // Use forward slashes for zip entry names (cross-platform)
    zip.addFile(rel.split(path.sep).join('/'), content);
  }
  return zip.toBuffer();
}

/** Pack into a zip file on disk. */
export function packDirectoryToZipFile(srcDir: string, destZipPath: string): void {
  const buf = packDirectoryToZipBuffer(srcDir);
  fs.mkdirSync(path.dirname(destZipPath), { recursive: true });
  fs.writeFileSync(destZipPath, buf);
}

/** Guard: throws if the resolved destination path escapes the destDir. */
function assertSafeEntry(entryName: string, destDir: string): void {
  const resolvedDest = path.resolve(destDir);
  const resolvedEntry = path.resolve(destDir, entryName);
  if (!resolvedEntry.startsWith(resolvedDest + path.sep) && resolvedEntry !== resolvedDest) {
    throw new Error(
      `Path traversal detected: entry "${entryName}" escapes destination directory`,
    );
  }
}

/** Unpack a zip Buffer into a directory. Throws on path traversal. */
export function unpackZipBufferToDirectory(zipBuf: Buffer, destDir: string): void {
  const zip = new AdmZip(zipBuf);
  const entries = zip.getEntries();
  for (const entry of entries) {
    assertSafeEntry(entry.entryName, destDir);
    if (entry.isDirectory) continue;
    const destPath = path.join(destDir, entry.entryName);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, entry.getData());
  }
}

/** Unpack a zip file on disk into a directory. Throws on path traversal. */
export function unpackZipFileToDirectory(srcZipPath: string, destDir: string): void {
  const buf = fs.readFileSync(srcZipPath);
  unpackZipBufferToDirectory(buf, destDir);
}

/** Deterministic sha256 of directory contents (content-based, metadata-independent).
 *  Excludes plugin.spec.json so that registry metadata updates (source block) do not
 *  change the content hash of the plugin logic itself.
 */
export function computeDirectoryContentHash(dir: string): ContentHash {
  const files = walkFiles(dir).filter((rel) => !isExcludedFromHash(rel));
  const parts: string[] = [];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(dir, rel));
    const fileHex = crypto.createHash('sha256').update(content).digest('hex');
    // Use forward slashes for cross-platform determinism
    parts.push(`${rel.split(path.sep).join('/')}:${fileHex}\n`);
  }
  const combined = parts.join('');
  const hex = crypto.createHash('sha256').update(combined).digest('hex');
  return makeContentHash(hex);
}

/** sha256 of a single Buffer. */
export function sha256OfBuffer(buf: Buffer): ContentHash {
  const hex = crypto.createHash('sha256').update(buf).digest('hex');
  return makeContentHash(hex);
}

/**
 * Compute file-level diff between two directory trees. Honors the same
 * hidden/excluded-from-hash rules as computeDirectoryContentHash.
 *
 * Returns relative paths (forward-slash separated) of files that differ.
 * `added`: in B, not in A.
 * `removed`: in A, not in B.
 * `modified`: present in both with different sha256 of content.
 */
export interface DirectoryDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

export function diffDirectories(srcA: string, srcB: string): DirectoryDiff {
  function buildMap(dir: string): Map<string, string> {
    const map = new Map<string, string>();
    const files = walkFiles(dir).filter((rel) => !isExcludedFromHash(rel));
    for (const rel of files) {
      const content = fs.readFileSync(path.join(dir, rel));
      const hex = crypto.createHash('sha256').update(content).digest('hex');
      map.set(rel.split(path.sep).join('/'), hex);
    }
    return map;
  }

  const mapA = buildMap(srcA);
  const mapB = buildMap(srcB);

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const [key, hashB] of mapB) {
    if (!mapA.has(key)) {
      added.push(key);
    } else if (mapA.get(key) !== hashB) {
      modified.push(key);
    }
  }

  for (const key of mapA.keys()) {
    if (!mapB.has(key)) {
      removed.push(key);
    }
  }

  added.sort();
  removed.sort();
  modified.sort();

  return { added, removed, modified };
}
