import { useCallback, useEffect, useState } from 'react';
import type { FileTreeNode } from '../../../types/ipc';

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);

  if (node.type === 'directory') {
    const sortedChildren = node.children
      ? [...node.children].sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
      : [];

    return (
      <div>
        <div
          className="flex items-center gap-1 px-1 py-[2px] cursor-pointer hover:bg-aide-surface-hover text-aide-text-secondary text-[13px] font-mono select-none"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setExpanded((e) => !e)}
        >
          <span className="text-[10px] text-aide-text-tertiary w-3 shrink-0">
            {expanded ? '▼' : '▶'}
          </span>
          <span className="truncate">{node.name}</span>
        </div>
        {expanded && sortedChildren.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center px-1 py-[2px] cursor-pointer hover:bg-aide-surface-hover text-aide-text-primary text-[13px] font-mono select-none"
      style={{ paddingLeft: `${8 + depth * 12 + 16}px` }}
      onClick={() => console.log(node.path)}
    >
      <span className="truncate">{node.name}</span>
    </div>
  );
}

interface FileExplorerProps {
  cwd: string;
}

export function FileExplorer({ cwd }: FileExplorerProps) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);

  const loadTree = useCallback(() => {
    window.aide.fs.readTree(cwd).then((nodes) => {
      const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setTree(sorted);
    }).catch(() => {
      // ignore errors
    });
  }, [cwd]);

  useEffect(() => {
    loadTree();
    const unsub = window.aide.fs.onChanged(loadTree);
    return unsub;
  }, [loadTree]);

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  );
}
