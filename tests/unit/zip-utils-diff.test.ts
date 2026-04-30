import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { diffDirectories } from '../../src/main/plugin/zip-utils';

let tmpDirs: string[] = [];

function makeTmpDir(suffix = ''): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aide-diff-${suffix}`));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(base: string, rel: string, content = 'hello'): void {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

beforeEach(() => {
  tmpDirs = [];
});

afterEach(() => {
  for (const dir of tmpDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  tmpDirs = [];
});

describe('diffDirectories', () => {
  it('identical trees → all arrays empty', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'same');
    writeFile(a, 'utils.js', 'util');
    writeFile(b, 'index.js', 'same');
    writeFile(b, 'utils.js', 'util');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('file only in B → added', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'base');
    writeFile(b, 'index.js', 'base');
    writeFile(b, 'new.js', 'new file');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual(['new.js']);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('file only in A → removed', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'base');
    writeFile(a, 'old.js', 'old file');
    writeFile(b, 'index.js', 'base');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(['old.js']);
    expect(diff.modified).toEqual([]);
  });

  it('same file name, different content → modified', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'original');
    writeFile(b, 'index.js', 'changed');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual(['index.js']);
  });

  it('plugin.spec.json differences are ignored', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'same');
    writeFile(a, 'plugin.spec.json', '{"version":"0.1.0"}');
    writeFile(b, 'index.js', 'same');
    writeFile(b, 'plugin.spec.json', '{"version":"0.2.0","source":{}}');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('.DS_Store / .git / node_modules differences are ignored', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'index.js', 'same');
    writeFile(b, 'index.js', 'same');
    writeFile(b, '.DS_Store', 'mac junk');
    writeFile(b, '.git/HEAD', 'ref: refs/heads/main');
    writeFile(b, 'node_modules/foo.js', 'dep');

    const diff = diffDirectories(a, b);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it('nested directory paths are classified correctly', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    writeFile(a, 'src/index.js', 'original');
    writeFile(a, 'src/utils/helper.js', 'helper');
    writeFile(b, 'src/index.js', 'changed');
    writeFile(b, 'src/utils/new.js', 'new util');

    const diff = diffDirectories(a, b);

    expect(diff.modified).toEqual(['src/index.js']);
    expect(diff.added).toEqual(['src/utils/new.js']);
    expect(diff.removed).toEqual(['src/utils/helper.js']);
  });

  it('result arrays are sorted alphabetically', () => {
    const a = makeTmpDir('a-');
    const b = makeTmpDir('b-');
    // modified: z-file, a-file (expect sorted a-file, z-file)
    writeFile(a, 'z-file.js', 'old');
    writeFile(a, 'a-file.js', 'old');
    writeFile(b, 'z-file.js', 'new');
    writeFile(b, 'a-file.js', 'new');
    // added: z-add, a-add
    writeFile(b, 'z-add.js', 'add');
    writeFile(b, 'a-add.js', 'add');
    // removed: z-rm, a-rm
    writeFile(a, 'z-rm.js', 'rm');
    writeFile(a, 'a-rm.js', 'rm');

    const diff = diffDirectories(a, b);

    expect(diff.modified).toEqual(['a-file.js', 'z-file.js']);
    expect(diff.added).toEqual(['a-add.js', 'z-add.js']);
    expect(diff.removed).toEqual(['a-rm.js', 'z-rm.js']);
  });
});
