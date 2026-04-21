import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileIndex } from '../../src/main/ipc/file-index';

let tmpRoot: string;

function writeFile(rel: string, content = ''): string {
  const full = path.join(tmpRoot, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

function mkDir(rel: string): string {
  const full = path.join(tmpRoot, rel);
  fs.mkdirSync(full, { recursive: true });
  return full;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aide-file-index-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('FileIndex.initialize', () => {
  it('walks the workspace recursively and indexes files + directories', async () => {
    writeFile('src/utils/logger.ts');
    writeFile('src/utils/file-search.ts');
    writeFile('src/index.ts');
    writeFile('README.md');

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    // 3 dirs (src, src/utils, implicit none) + 4 files = 3 + 4 = 7? Actually:
    // root-level entries: src (dir), README.md (file)
    // src: utils (dir), index.ts (file)
    // utils: logger.ts, file-search.ts
    // Total indexed: src, src/utils, src/utils/logger.ts, src/utils/file-search.ts, src/index.ts, README.md
    expect(index.size()).toBe(6);
  });

  it('honours watcher-exclusions (skips node_modules, .git, dist)', async () => {
    writeFile('node_modules/left/index.js');
    writeFile('.git/config');
    writeFile('dist/bundle.js');
    writeFile('src/kept.ts');

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    const tree = index.search('kept');
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('src');
    expect(tree[0].children?.[0].name).toBe('kept.ts');

    expect(index.search('index.js')).toEqual([]);
    expect(index.search('config')).toEqual([]);
    expect(index.search('bundle')).toEqual([]);
  });
});

describe('FileIndex.search', () => {
  it('returns an empty tree for an empty query', async () => {
    writeFile('a.ts');
    const index = new FileIndex();
    await index.initialize(tmpRoot);
    expect(index.search('')).toEqual([]);
    expect(index.search('   ')).toEqual([]);
  });

  it('matches files across the full workspace, not just top level', async () => {
    writeFile('a/b/c/deeply-nested.ts');
    writeFile('top.ts');

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    const tree = index.search('deeply');
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('a');
    expect(tree[0].children?.[0].name).toBe('b');
    expect(tree[0].children?.[0].children?.[0].name).toBe('c');
    expect(tree[0].children?.[0].children?.[0].children?.[0].name).toBe('deeply-nested.ts');
  });

  it('is case insensitive', async () => {
    writeFile('README.md');
    const index = new FileIndex();
    await index.initialize(tmpRoot);
    expect(index.search('readme')[0].name).toBe('README.md');
    expect(index.search('README')[0].name).toBe('README.md');
  });

  it('pulls the whole subtree when a directory name matches the query', async () => {
    writeFile('components/SearchBar/index.tsx');
    writeFile('components/SearchBar/styles.css');
    writeFile('components/Other.tsx');

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    const tree = index.search('SearchBar');
    // components → SearchBar → [index.tsx, styles.css]
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('components');
    const searchBarDir = tree[0].children?.find((c) => c.name === 'SearchBar');
    expect(searchBarDir).toBeDefined();
    expect(searchBarDir?.children?.map((c) => c.name).sort()).toEqual(['index.tsx', 'styles.css']);
    // Sibling that does not match is pruned
    expect(tree[0].children?.find((c) => c.name === 'Other.tsx')).toBeUndefined();
  });

  it('sorts directories before files and alphabetically within each group', async () => {
    writeFile('match-zebra.ts');
    writeFile('match-alpha.ts');
    mkDir('match-dir');
    writeFile('match-dir/readme.md');

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    const tree = index.search('match');
    const names = tree.map((n) => n.name);
    expect(names).toEqual(['match-dir', 'match-alpha.ts', 'match-zebra.ts']);
  });

  it('respects the limit', async () => {
    for (let i = 0; i < 50; i++) writeFile(`match-${i}.ts`);

    const index = new FileIndex();
    await index.initialize(tmpRoot);

    const tree = index.search('match', 10);
    expect(tree.length).toBeLessThanOrEqual(10);
  });
});

describe('FileIndex incremental updates', () => {
  it('addPath makes a new file discoverable immediately', async () => {
    const index = new FileIndex();
    await index.initialize(tmpRoot);
    expect(index.search('newfile')).toEqual([]);

    const full = writeFile('sub/newfile.ts');
    index.addPath(full, 'file');
    // Parent dir wasn't auto-added; add it too for a realistic chokidar sequence.
    index.addPath(path.join(tmpRoot, 'sub'), 'directory');

    const tree = index.search('newfile');
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('sub');
  });

  it('removePath drops the entry', async () => {
    const full = writeFile('gone.ts');
    const index = new FileIndex();
    await index.initialize(tmpRoot);
    expect(index.search('gone')).toHaveLength(1);

    index.removePath(full);
    expect(index.search('gone')).toEqual([]);
  });

  it('removeDir drops the directory and all descendants', async () => {
    writeFile('wiped/inner/file.ts');
    writeFile('kept/file.ts');
    const index = new FileIndex();
    await index.initialize(tmpRoot);

    index.removeDir(path.join(tmpRoot, 'wiped'));
    expect(index.search('file.ts').map((n) => n.name)).toEqual(['kept']);
  });

  it('clear wipes the index', async () => {
    writeFile('a.ts');
    const index = new FileIndex();
    await index.initialize(tmpRoot);
    expect(index.size()).toBeGreaterThan(0);

    index.clear();
    expect(index.size()).toBe(0);
    // After clear there is no root path, so searches are empty.
    expect(index.search('a')).toEqual([]);
  });
});
