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

/** Deterministic sha256 of directory contents (content-based, metadata-independent). */
export function computeDirectoryContentHash(dir: string): ContentHash {
  const files = walkFiles(dir);
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
