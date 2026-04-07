import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileTreeNode } from '../../../types/ipc';
import { emitFileEvent } from '../../lib/event-bus';

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  revealPath: string | null;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

function TreeNode({ node, depth, selectedPath, onSelect, revealPath, nodeRefs }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      nodeRefs.current.set(node.path, ref.current);
    }
    return () => { nodeRefs.current.delete(node.path); };
  }, [node.path, nodeRefs]);

  // Auto-expand ancestor when a child is being revealed
  useEffect(() => {
    if (revealPath && node.type === 'directory' && revealPath.startsWith(node.path + '/')) {
      setExpanded(true);
    }
  }, [revealPath, node.path, node.type]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'directory') {
      setExpanded((v) => !v);
    } else {
      onSelect(node.path);
      emitFileEvent('file:clicked', { filePath: node.path });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (node.type === 'file') {
      onSelect(node.path);
      emitFileEvent('file:right-clicked', { filePath: node.path });
    }
  };

  const isSelected = selectedPath === node.path;

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
          ref={ref}
          className="flex items-center gap-1 px-1 py-[2px] cursor-pointer hover:bg-aide-surface-hover text-aide-text-secondary text-[13px] font-mono select-none"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <span className="text-[10px] text-aide-text-tertiary w-3 shrink-0">
            {expanded ? '▼' : '▶'}
          </span>
          <span className="truncate">{node.name}</span>
        </div>
        {expanded && sortedChildren.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
            revealPath={revealPath}
            nodeRefs={nodeRefs}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`flex items-center px-1 py-[2px] cursor-pointer text-[13px] font-mono select-none ${
        isSelected
          ? 'bg-aide-surface-elevated text-aide-text-primary'
          : 'hover:bg-aide-surface-hover text-aide-text-primary'
      }`}
      style={{ paddingLeft: `${8 + depth * 12 + 16}px` }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
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
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [revealPath, setRevealPath] = useState<string | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const loadTree = useCallback(() => {
    window.aide.fs.readTree(cwd).then((nodes) => {
      const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setTree(sorted);
    }).catch(() => {});
  }, [cwd]);

  useEffect(() => {
    loadTree();
    const unsub = window.aide.fs.onChanged(loadTree);
    return unsub;
  }, [loadTree]);

  // Plugin → FILES listeners
  useEffect(() => {
    const unsubReveal = window.aide.files.onReveal((filePath) => {
      setRevealPath(filePath);
      setSelectedPath(filePath);
      // Scroll into view after tree re-renders with expanded state
      requestAnimationFrame(() => {
        nodeRefs.current.get(filePath)?.scrollIntoView({ block: 'nearest' });
      });
    });
    const unsubSelect = window.aide.files.onSelect((filePath) => {
      setSelectedPath(filePath);
    });
    const unsubRefresh = window.aide.files.onRefresh(() => {
      loadTree();
    });
    return () => {
      unsubReveal();
      unsubSelect();
      unsubRefresh();
    };
  }, [loadTree]);

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={setSelectedPath}
          revealPath={revealPath}
          nodeRefs={nodeRefs}
        />
      ))}
    </div>
  );
}
