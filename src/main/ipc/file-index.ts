import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { FileTreeNode } from '../../types/ipc';
import { WATCHER_EXCLUSIONS } from './watcher-exclusions';

export interface FileIndexEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

/**
 * Mirrors the matcher semantics in `crates/aide-core/src/watcher.rs`:
 *   `**∕<name>/**` → any path component equals <name>
 *   `**∕*.<ext>`   → filename suffix match
 * Other patterns fall back to a substring check on the full path.
 */
function matchesExclusion(fullPath: string, pattern: string): boolean {
  const inner = pattern
    .replace(/^\*\*\//, '')
    .replace(/\/\*\*$/, '')
    .replace(/^\*\*/, '');

  // `**/<name>/**` form — component match.
  if (!inner.includes('/') && !inner.includes('*') && inner.length > 0) {
    const components = fullPath.split(/[/\\]/);
    return components.includes(inner);
  }
  // `**/*.<ext>` form — filename suffix match.
  const suffixMatch = inner.match(/^\*\.(.+)$/);
  if (suffixMatch) {
    return fullPath.endsWith(`.${suffixMatch[1]}`);
  }
  return fullPath.includes(inner);
}

function isExcluded(fullPath: string): boolean {
  for (const pattern of WATCHER_EXCLUSIONS) {
    if (matchesExclusion(fullPath, pattern)) return true;
  }
  return false;
}

async function walkDir(dirPath: string, entries: Map<string, FileIndexEntry>): Promise<void> {
  let dirents: fs.Dirent[];
  try {
    dirents = await fsPromises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  const subDirs: string[] = [];
  for (const dirent of dirents) {
    const full = path.join(dirPath, dirent.name);
    if (isExcluded(full)) continue;
    if (dirent.isDirectory()) {
      entries.set(full, { name: dirent.name, path: full, type: 'directory' });
      subDirs.push(full);
    } else if (dirent.isFile() || dirent.isSymbolicLink()) {
      entries.set(full, { name: dirent.name, path: full, type: 'file' });
    }
  }

  // Concurrent child directory walk, bounded by Node's implicit FD limit.
  await Promise.all(subDirs.map((d) => walkDir(d, entries)));
}

interface BuildTreeNode {
  entry: FileIndexEntry;
  children: Map<string, BuildTreeNode>;
}

function compareTreeChildren(a: FileTreeNode, b: FileTreeNode): number {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function buildFileTree(matches: FileIndexEntry[], rootPath: string): FileTreeNode[] {
  const rootChildren = new Map<string, BuildTreeNode>();

  const ensurePath = (targetPath: string, entry: FileIndexEntry): BuildTreeNode | null => {
    if (targetPath === rootPath || !targetPath.startsWith(rootPath + path.sep)) return null;

    const relative = targetPath.slice(rootPath.length + 1);
    const parts = relative.split(path.sep).filter(Boolean);
    if (parts.length === 0) return null;

    let cursor = rootChildren;
    let parent: BuildTreeNode | null = null;
    let accumulated = rootPath;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      accumulated = path.join(accumulated, name);
      const isLeaf = i === parts.length - 1;

      let node = cursor.get(name);
      if (!node) {
        const nodeEntry: FileIndexEntry = isLeaf
          ? entry
          : { name, path: accumulated, type: 'directory' };
        node = { entry: nodeEntry, children: new Map() };
        cursor.set(name, node);
      } else if (isLeaf) {
        // Upgrade to the real entry metadata in case synthesized earlier as a directory.
        node.entry = entry;
      }

      parent = node;
      cursor = node.children;
    }

    return parent;
  };

  for (const match of matches) {
    ensurePath(match.path, match);
  }

  const toTree = (node: BuildTreeNode): FileTreeNode => {
    const children = Array.from(node.children.values()).map(toTree);
    children.sort(compareTreeChildren);
    return {
      name: node.entry.name,
      path: node.entry.path,
      type: node.entry.type,
      children: node.entry.type === 'directory' ? children : undefined,
    };
  };

  const out = Array.from(rootChildren.values()).map(toTree);
  out.sort(compareTreeChildren);
  return out;
}

export class FileIndex {
  private entries = new Map<string, FileIndexEntry>();
  private rootPath: string | null = null;
  private initializingFor: string | null = null;

  async initialize(workspacePath: string): Promise<void> {
    this.entries.clear();
    this.rootPath = workspacePath;
    this.initializingFor = workspacePath;
    const entries = new Map<string, FileIndexEntry>();
    try {
      await walkDir(workspacePath, entries);
    } catch {
      // Leave index empty on catastrophic failure; subsequent events still populate.
    }
    // Guard against a workspace switch that happened mid-walk.
    if (this.initializingFor === workspacePath) {
      this.entries = entries;
      this.initializingFor = null;
    }
  }

  clear(): void {
    this.entries.clear();
    this.rootPath = null;
    this.initializingFor = null;
  }

  addPath(fullPath: string, type: 'file' | 'directory'): void {
    if (!this.rootPath) return;
    if (isExcluded(fullPath)) return;
    this.entries.set(fullPath, { name: path.basename(fullPath), path: fullPath, type });
  }

  removePath(fullPath: string): void {
    this.entries.delete(fullPath);
  }

  removeDir(fullPath: string): void {
    // Remove the directory and all descendants under it.
    this.entries.delete(fullPath);
    const prefix = fullPath + path.sep;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  /**
   * Case-insensitive substring search on file and folder names.
   * A matching directory implicitly includes all of its descendants so the
   * folder surfaces with its contents, mirroring the existing inline-filter UX.
   * Returns a reconstructed tree relative to the workspace root.
   */
  search(query: string, limit = 500): FileTreeNode[] {
    if (!this.rootPath) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matchedDirs = new Set<string>();
    for (const entry of this.entries.values()) {
      if (entry.type === 'directory' && entry.name.toLowerCase().includes(q)) {
        matchedDirs.add(entry.path);
      }
    }

    const root = this.rootPath;
    const results: FileIndexEntry[] = [];
    for (const entry of this.entries.values()) {
      if (results.length >= limit) break;
      const selfMatch = entry.name.toLowerCase().includes(q);
      if (selfMatch) {
        results.push(entry);
        continue;
      }
      // Ancestor-is-matched-dir check: walk up until root.
      let parent = path.dirname(entry.path);
      let ancestorHit = false;
      while (parent.length >= root.length && parent.startsWith(root)) {
        if (matchedDirs.has(parent)) { ancestorHit = true; break; }
        if (parent === root) break;
        const next = path.dirname(parent);
        if (next === parent) break;
        parent = next;
      }
      if (ancestorHit) results.push(entry);
    }

    return buildFileTree(results, root);
  }

  /** Test-only helper — expose entry count. */
  size(): number {
    return this.entries.size;
  }
}
