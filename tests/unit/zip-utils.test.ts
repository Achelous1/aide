import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  packDirectoryToZipBuffer,
  packDirectoryToZipFile,
  unpackZipBufferToDirectory,
  unpackZipFileToDirectory,
  computeDirectoryContentHash,
  sha256OfBuffer,
} from '../../src/main/plugin/zip-utils';

let tmpRoot: string;
let tmpDirs: string[] = [];

function makeTmpDir(suffix = ''): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aide-zip-utils-${suffix}`));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(base: string, rel: string, content = 'hello'): void {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function readFile(base: string, rel: string): string {
  return fs.readFileSync(path.join(base, rel), 'utf8');
}

function exists(base: string, rel: string): boolean {
  return fs.existsSync(path.join(base, rel));
}

beforeEach(() => {
  tmpRoot = makeTmpDir('root-');
  tmpDirs = [tmpRoot];
});

afterEach(() => {
  for (const dir of tmpDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  tmpDirs = [];
});

describe('packDirectoryToZipBuffer / unpackZipBufferToDirectory', () => {
  it('round-trip Buffer: all files restored with same content', () => {
    const src = makeTmpDir('src-');
    writeFile(src, 'index.js', 'console.log("hello")');
    writeFile(src, 'README.md', '# test');

    const buf = packDirectoryToZipBuffer(src);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    const dest = makeTmpDir('dest-');
    unpackZipBufferToDirectory(buf, dest);

    expect(readFile(dest, 'index.js')).toBe('console.log("hello")');
    expect(readFile(dest, 'README.md')).toBe('# test');
  });

  it('round-trip File: packDirectoryToZipFile / unpackZipFileToDirectory', () => {
    const src = makeTmpDir('src-');
    writeFile(src, 'main.ts', 'export const x = 1;');

    const zipPath = path.join(makeTmpDir('zip-'), 'plugin.zip');
    packDirectoryToZipFile(src, zipPath);
    expect(fs.existsSync(zipPath)).toBe(true);

    const dest = makeTmpDir('dest-');
    unpackZipFileToDirectory(zipPath, dest);

    expect(readFile(dest, 'main.ts')).toBe('export const x = 1;');
  });

  it('nested directories: deep tree is preserved', () => {
    const src = makeTmpDir('src-');
    writeFile(src, 'src/index.js', 'index');
    writeFile(src, 'src/utils/helper.js', 'helper');
    writeFile(src, 'src/utils/math/calc.js', 'calc');

    const buf = packDirectoryToZipBuffer(src);
    const dest = makeTmpDir('dest-');
    unpackZipBufferToDirectory(buf, dest);

    expect(readFile(dest, 'src/index.js')).toBe('index');
    expect(readFile(dest, 'src/utils/helper.js')).toBe('helper');
    expect(readFile(dest, 'src/utils/math/calc.js')).toBe('calc');
  });

  it('empty directory: produces empty zip and unpacks to empty dest', () => {
    const src = makeTmpDir('src-');
    // empty — no files written

    const buf = packDirectoryToZipBuffer(src);
    expect(buf).toBeInstanceOf(Buffer);

    const dest = makeTmpDir('dest-');
    unpackZipBufferToDirectory(buf, dest);

    const entries = fs.readdirSync(dest);
    expect(entries).toHaveLength(0);
  });

  it('hidden files excluded from pack: .DS_Store, .git/, node_modules/ not in dest', () => {
    const src = makeTmpDir('src-');
    writeFile(src, 'index.js', 'real');
    writeFile(src, '.DS_Store', 'mac junk');
    writeFile(src, '.git/HEAD', 'ref: refs/heads/main');
    writeFile(src, 'node_modules/foo.js', 'dep');
    writeFile(src, '.hidden/secret.txt', 'secret');

    const buf = packDirectoryToZipBuffer(src);
    const dest = makeTmpDir('dest-');
    unpackZipBufferToDirectory(buf, dest);

    expect(readFile(dest, 'index.js')).toBe('real');
    expect(exists(dest, '.DS_Store')).toBe(false);
    expect(exists(dest, '.git')).toBe(false);
    expect(exists(dest, 'node_modules')).toBe(false);
    expect(exists(dest, '.hidden')).toBe(false);
  });
});

describe('computeDirectoryContentHash', () => {
  it('hidden files excluded from hash: .DS_Store presence does not change hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'index.js', 'same content');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'index.js', 'same content');
    writeFile(srcB, '.DS_Store', 'mac junk');

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).toBe(hashB.hex);
  });

  it('determinism: same content in two dirs → same hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'a.js', 'aaa');
    writeFile(srcA, 'b.js', 'bbb');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'a.js', 'aaa');
    writeFile(srcB, 'b.js', 'bbb');

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).toBe(hashB.hex);
    expect(hashA.algo).toBe('sha256');
  });

  it('sensitivity: single character change → different hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'index.js', 'hello world');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'index.js', 'hello World');

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).not.toBe(hashB.hex);
  });

  it('add/remove: adding a file changes hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'index.js', 'content');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'index.js', 'content');
    writeFile(srcB, 'extra.js', 'extra');

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).not.toBe(hashB.hex);
  });

  it('add/remove: removing a file changes hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'index.js', 'content');
    writeFile(srcA, 'utils.js', 'utils');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'index.js', 'content');

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).not.toBe(hashB.hex);
  });

  it('metadata independence: same content, different mtime → same hash', () => {
    const srcA = makeTmpDir('srcA-');
    writeFile(srcA, 'index.js', 'same content');

    const srcB = makeTmpDir('srcB-');
    writeFile(srcB, 'index.js', 'same content');

    // Artificially change mtime of srcB/index.js
    const past = new Date(2000, 0, 1);
    fs.utimesSync(path.join(srcB, 'index.js'), past, past);

    const hashA = computeDirectoryContentHash(srcA);
    const hashB = computeDirectoryContentHash(srcB);
    expect(hashA.hex).toBe(hashB.hex);
  });
});

/** Build a raw zip buffer with a single entry using the given raw fileName string.
 *  adm-zip.addFile() sanitizes paths, so we must craft the bytes directly. */
function buildRawZipWithEntry(entryName: string, content: Buffer): Buffer {
  function uint16LE(n: number): Buffer {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n);
    return b;
  }
  function uint32LE(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return b;
  }
  const fileName = Buffer.from(entryName);
  const localHeader = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // local file signature
    uint16LE(20), // version needed
    uint16LE(0), // flags
    uint16LE(0), // compression (stored)
    uint16LE(0), // mod time
    uint16LE(0), // mod date
    uint32LE(0), // crc32 (0 for test)
    uint32LE(content.length), // compressed size
    uint32LE(content.length), // uncompressed size
    uint16LE(fileName.length),
    uint16LE(0), // extra length
    fileName,
    content,
  ]);
  const cdEntry = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x01, 0x02]), // central dir signature
    uint16LE(20),
    uint16LE(20),
    uint16LE(0),
    uint16LE(0),
    uint16LE(0),
    uint16LE(0),
    uint32LE(0),
    uint32LE(content.length),
    uint32LE(content.length),
    uint16LE(fileName.length),
    uint16LE(0),
    uint16LE(0),
    uint16LE(0),
    uint16LE(0),
    uint32LE(0),
    uint32LE(0), // offset of local header
    fileName,
  ]);
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]), // end of central dir
    uint16LE(0),
    uint16LE(0),
    uint16LE(1),
    uint16LE(1),
    uint32LE(cdEntry.length),
    uint32LE(localHeader.length),
    uint16LE(0),
  ]);
  return Buffer.concat([localHeader, cdEntry, eocd]);
}

describe('path traversal guard', () => {
  it('throws on entry with ../ path traversal', () => {
    const malBuf = buildRawZipWithEntry('../escape.txt', Buffer.from('malicious'));
    const dest = makeTmpDir('dest-');
    expect(() => unpackZipBufferToDirectory(malBuf, dest)).toThrow(/path traversal/i);
  });

  it('throws on entry with absolute path', () => {
    const malBuf = buildRawZipWithEntry('/etc/passwd', Buffer.from('malicious'));
    const dest = makeTmpDir('dest-');
    expect(() => unpackZipBufferToDirectory(malBuf, dest)).toThrow(/path traversal/i);
  });
});

describe('sha256OfBuffer', () => {
  it('produces known hex for "hello"', () => {
    const result = sha256OfBuffer(Buffer.from('hello'));
    // echo -n "hello" | sha256sum => 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(result.hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result.algo).toBe('sha256');
    expect(result.toString()).toBe(
      'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
});
