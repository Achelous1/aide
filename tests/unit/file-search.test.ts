import { describe, it, expect } from 'vitest';
import type { FileTreeNode } from '../../src/types/ipc';
import { matchNode, filterTree } from '../../src/renderer/utils/file-search';

function file(name: string, path = `/${name}`): FileTreeNode {
  return { name, path, type: 'file' };
}
function dir(name: string, children: FileTreeNode[] = [], path = `/${name}`): FileTreeNode {
  return { name, path, type: 'directory', children };
}

describe('matchNode', () => {
  it('returns true for an empty query', () => {
    expect(matchNode('foo.ts', '')).toBe(true);
  });
  it('is case insensitive', () => {
    expect(matchNode('README.md', 'readme')).toBe(true);
    expect(matchNode('index.ts', 'IDX')).toBe(false);
  });
  it('matches a substring anywhere in the name', () => {
    expect(matchNode('file-search.ts', 'search')).toBe(true);
    expect(matchNode('file-search.ts', 'xyz')).toBe(false);
  });
});

describe('filterTree', () => {
  it('returns the input unchanged when the query is empty', () => {
    const tree = [file('a.ts'), dir('src', [file('b.ts')])];
    expect(filterTree(tree, '')).toBe(tree);
  });

  it('keeps files whose name matches and drops the rest', () => {
    const tree = [file('foo.ts'), file('bar.md')];
    expect(filterTree(tree, 'foo')).toEqual([file('foo.ts')]);
  });

  it('keeps ancestor directories when a descendant matches, pruning non-matching siblings', () => {
    const tree = [
      dir('src', [
        dir('utils', [file('file-search.ts'), file('logger.ts')]),
        file('index.ts'),
      ]),
      dir('tests', [file('unrelated.test.ts')]),
    ];
    const result = filterTree(tree, 'search');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('src');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children?.[0].name).toBe('utils');
    expect(result[0].children?.[0].children?.map((c) => c.name)).toEqual(['file-search.ts']);
  });

  it('keeps all children when the directory name itself matches', () => {
    const original = dir('search', [file('a.ts'), file('b.ts')]);
    const result = filterTree([original], 'search');
    expect(result[0]).toBe(original);
    expect(result[0].children?.map((c) => c.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('drops directories whose descendants do not match', () => {
    const tree = [dir('src', [file('x.ts')]), dir('docs', [file('y.md')])];
    expect(filterTree(tree, 'unknown')).toEqual([]);
  });

  it('is case insensitive', () => {
    const tree = [file('README.md'), file('index.ts')];
    expect(filterTree(tree, 'readme')).toEqual([file('README.md')]);
  });

  it('does not mutate the input tree', () => {
    const utils = dir('utils', [file('file-search.ts'), file('logger.ts')]);
    const src = dir('src', [utils]);
    const tree = [src];
    filterTree(tree, 'search');
    expect(src.children).toHaveLength(1);
    expect(utils.children).toHaveLength(2);
  });
});
