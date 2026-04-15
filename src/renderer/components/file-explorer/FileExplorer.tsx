import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileTreeNode, FsReadTreeError } from '../../../types/ipc';
import { emitFileEvent } from '../../lib/event-bus';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { usePluginStore } from '../../stores/plugin-store';
import { PermissionBanner } from './PermissionBanner';

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
  const [fetchedChildren, setFetchedChildren] = useState<FileTreeNode[] | undefined>(node.children);
  const [childError, setChildError] = useState<FsReadTreeError | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      nodeRefs.current.set(node.path, ref.current);
    }
    return () => { nodeRefs.current.delete(node.path); };
  }, [node.path, nodeRefs]);

  // Lazy-fetch children when a directory is expanded for the first time
  useEffect(() => {
    if (!expanded || node.type !== 'directory') return;
    window.aide.fs.readTreeWithError(node.path)
      .then(({ nodes: children, error }) => {
        setFetchedChildren(children);
        setChildError(error ?? null);
      })
      .catch(() => {});
  }, [expanded, node.path, node.type]);

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

  const handleRetryChild = () => {
    setChildError(null);
    setFetchedChildren(undefined);
    // Re-trigger the lazy-fetch effect by toggling expanded
    setExpanded(false);
    requestAnimationFrame(() => setExpanded(true));
  };

  const isSelected = selectedPath === node.path;
  const hasChildError = childError !== null;

  if (node.type === 'directory') {
    const sortedChildren = fetchedChildren
      ? [...fetchedChildren].sort((a, b) => {
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
          title={hasChildError ? 'Access denied — click to retry' : undefined}
        >
          <span className="text-[10px] text-aide-text-tertiary w-3 shrink-0">
            {expanded ? '▼' : '▶'}
          </span>
          <span className={`truncate ${hasChildError ? 'text-[#5C5E6A]' : ''}`}>{node.name}</span>
          {hasChildError && (
            <span
              style={{ color: '#F59E0B', fontSize: '11px', marginLeft: 'auto', paddingRight: '4px' }}
              onClick={(e) => { e.stopPropagation(); handleRetryChild(); }}
            >
              ⚠
            </span>
          )}
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

// Track recent EPERM paths to avoid rapid retry loops (5s cooldown)
const epermCooldown = new Map<string, number>();

export function FileExplorer({ cwd }: FileExplorerProps) {
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [revealPath, setRevealPath] = useState<string | null>(null);
  const [error, setError] = useState<FsReadTreeError | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedPath(filePath);
    useWorkspaceStore.getState().setSelectedFilePath(filePath);

    // Auto-open plugin if one claims this file extension
    const ext = filePath.includes('.')
      ? '.' + filePath.split('.').pop()!.toLowerCase()
      : '';
    if (ext) {
      const plugins = usePluginStore.getState().plugins;
      const match = plugins.find((p) => p.fileAssociations?.includes(ext));
      if (match) {
        usePluginStore.getState().activate(match.id);
      }
    }
  }, []);

  const loadTree = useCallback(() => {
    window.aide.fs.readTreeWithError(cwd).then(({ nodes, error: err }) => {
      const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setTree(sorted);
      if (err) {
        setError(err);
        setDismissed(false);
        if (err.code === 'EPERM') {
          epermCooldown.set(cwd, Date.now());
        }
      } else {
        setError(null);
      }
    }).catch(() => {});
  }, [cwd]);

  useEffect(() => {
    loadTree();
    const unsub = window.aide.fs.onChanged(loadTree);
    return unsub;
  }, [loadTree]);

  // Auto-retry on window focus when EPERM (user may have granted access)
  useEffect(() => {
    if (error?.code !== 'EPERM') return;
    const handler = () => {
      const last = epermCooldown.get(cwd) ?? 0;
      if (Date.now() - last < 5000) return;
      loadTree();
    };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [error, cwd, loadTree]);

  // Plugin → FILES listeners
  useEffect(() => {
    const unsubReveal = window.aide.files.onReveal((filePath) => {
      setRevealPath(filePath);
      handleFileSelect(filePath);
      // Scroll into view after tree re-renders with expanded state
      requestAnimationFrame(() => {
        nodeRefs.current.get(filePath)?.scrollIntoView({ block: 'nearest' });
      });
    });
    const unsubSelect = window.aide.files.onSelect((filePath) => {
      handleFileSelect(filePath);
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

  const handleRetry = useCallback(() => {
    setDismissed(false);
    epermCooldown.delete(cwd);
    loadTree();
  }, [cwd, loadTree]);

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {error && !dismissed && (
        <PermissionBanner
          errorCode={error.code}
          errorPath={error.path}
          errorMessage={error.message}
          onRetry={handleRetry}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {!error && tree.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: '8px',
            color: '#5C5E6A',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>Folder is empty</span>
        </div>
      )}

      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={handleFileSelect}
          revealPath={revealPath}
          nodeRefs={nodeRefs}
        />
      ))}
    </div>
  );
}
