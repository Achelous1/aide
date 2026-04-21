import type { FileTreeNode } from '../../types/ipc';

export function matchNode(name: string, query: string): boolean {
  if (!query) return true;
  return name.toLowerCase().includes(query.toLowerCase());
}

/**
 * Filter file tree nodes by a case-insensitive substring query on node names.
 *
 * - Empty query returns the input unchanged.
 * - File nodes are kept only when their name matches.
 * - Directory nodes are kept when the directory's own name matches (children preserved as-is)
 *   or when at least one already-loaded descendant matches (non-matching siblings pruned).
 *
 * Only traverses already-loaded `children`; unloaded subtrees are not fetched.
 */
export function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const out: FileTreeNode[] = [];
  for (const node of nodes) {
    const nameMatches = node.name.toLowerCase().includes(q);
    if (node.type === 'file') {
      if (nameMatches) out.push(node);
      continue;
    }
    if (nameMatches) {
      out.push(node);
      continue;
    }
    if (node.children && node.children.length > 0) {
      const filtered = filterTree(node.children, query);
      if (filtered.length > 0) out.push({ ...node, children: filtered });
    }
  }
  return out;
}
