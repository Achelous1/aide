import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useAgentStore } from '../../stores/agent-store';
import { useTerminalStore } from '../../stores/terminal-store';
import { useLayoutStore } from '../../stores/layout-store';
import { isSplitLayout, type AgentStatus, type LayoutNode, type TerminalTab } from '../../../types/ipc';
import { StatusDot, StatusBadge } from './StatusIndicator';
import { UpdateNotice } from '../updater/UpdateNotice';
import { AgentDropdown } from '../terminal/AgentDropdown';

/** Recursively collect all tabs from a layout tree (source of truth for visible tabs). */
function collectPaneTabs(node: LayoutNode): TerminalTab[] {
  if (isSplitLayout(node)) {
    return node.children.flatMap(collectPaneTabs);
  }
  return node.tabs;
}

export function WorkspaceNav() {
  const { workspaces, activeWorkspaceId, navExpanded, setActive, toggleNav, addWorkspace, removeWorkspace, renameWorkspace } = useWorkspaceStore();
  const { sessionStatuses } = useAgentStore();
  const { workspaceTabs, activeTabId, setActiveTab } = useTerminalStore();
  // Subscribe to layout so this component re-renders when active workspace tabs change
  const layout = useLayoutStore((s) => s.layout);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dropdownWorkspaceId, setDropdownWorkspaceId] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.aide?.agent?.onStatus) return;
    const unsubscribe = window.aide.agent.onStatus((sessionId, status) => {
      useAgentStore.getState().setStatus(sessionId, status);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!contextMenuId) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuId]);

  const handleContextMenu = (e: React.MouseEvent, wsId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuId(wsId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleStartRename = (ws: { id: string; name: string }) => {
    setContextMenuId(null);
    setEditingWorkspaceId(ws.id);
    setEditingName(ws.name);
  };

  const handleCommitRename = async (id: string) => {
    const name = editingName.trim();
    if (name) {
      renameWorkspace(id, name);
      await window.aide.workspace.rename(id, name);
    }
    setEditingWorkspaceId(null);
  };

  const handleCancelRename = () => {
    setEditingWorkspaceId(null);
  };

  const handleShowInFinder = (path: string) => {
    setContextMenuId(null);
    window.aide.workspace.showInFinder(path);
  };

  // Get tabs for a given workspace (active: from layout tree; inactive: from saved snapshot).
  // Excludes plugin tabs and sorts alphabetically by title.
  const getTabsForWorkspace = (workspaceId: string): TerminalTab[] => {
    const rawTabs = workspaceId === activeWorkspaceId
      ? collectPaneTabs(layout)
      : workspaceTabs[workspaceId]?.tabs ?? [];
    return rawTabs
      .filter((t) => t.type !== 'plugin')
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  // Derive a representative status per workspace from the tabs belonging to it.
  // sessionStatuses is keyed by PTY session ID (term-N), not workspace ID,
  // so we collect the workspace's tab sessionIds and look each one up.
  const getWorkspaceStatus = (workspaceId: string): AgentStatus | null => {
    const tabs = getTabsForWorkspace(workspaceId);
    for (const tab of tabs) {
      if (!tab.sessionId) continue;
      const s = sessionStatuses[tab.sessionId];
      if (s && s !== 'idle') return s;
    }
    // Fall back to idle only if at least one tab exists
    return tabs.length > 0 ? 'idle' : null;
  };

  const getActiveTabIdForWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      return activeTabId;
    }
    return workspaceTabs[workspaceId]?.activeTabId ?? null;
  };

  const toggleProjectExpanded = (workspaceId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const handleAddWorkspace = async () => {
    if (!window.aide?.workspace) return;
    try {
      const selectedPath = await window.aide.workspace.openDialog();
      if (!selectedPath) return;
      const ws = await window.aide.workspace.create(selectedPath);
      addWorkspace(ws);
      setActive(ws.id);
    } catch {
      // ignore
    }
  };

  const handleAddAgentTab = async (workspaceId: string) => {
    await setActive(workspaceId);
    setDropdownWorkspaceId(workspaceId);
  };

  const handleSelectTab = (workspaceId: string, tabId: string) => {
    setActive(workspaceId);
    setActiveTab(tabId);
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (workspaces.length <= 1) return; // Can't delete the last workspace
    // If deleting the active workspace, switch to another one first
    if (id === activeWorkspaceId) {
      const other = workspaces.find((w) => w.id !== id);
      if (other) await setActive(other.id);
    }
    try {
      await window.aide.workspace.remove(id);
    } catch {
      // ignore IPC errors — still remove from local state
    }
    removeWorkspace(id);
    setDeleteConfirmId(null);
  };

  if (navExpanded) {
    return (
      <div
        className="flex flex-col bg-aide-surface-sidebar border-r border-aide-border shrink-0 overflow-y-auto"
        style={{ width: '220px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">Workspaces</span>
          <button
            onClick={toggleNav}
            title="Collapse sidebar"
            className="text-aide-text-tertiary hover:text-aide-text-primary text-xs"
          >
            «
          </button>
        </div>

        {/* Workspace list */}
        <div className="flex flex-col gap-0.5 px-1">
          {workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspaceId;
            const status = getWorkspaceStatus(ws.id);
            const isExpanded = expandedProjects.has(ws.id);
            const wsTabs = getTabsForWorkspace(ws.id);
            const wsActiveTabId = getActiveTabIdForWorkspace(ws.id);

            return (
              <div key={ws.id}>
                {/* Project row */}
                <div
                  className={`relative group flex items-center gap-1 px-1 py-1.5 rounded transition-colors ${
                    isActive ? 'bg-aide-surface-elevated' : 'hover:bg-aide-surface-elevated'
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, ws.id)}
                >
                  {/* Chevron toggle */}
                  <button
                    onClick={() => toggleProjectExpanded(ws.id)}
                    className="text-aide-text-tertiary hover:text-aide-text-primary text-[10px] w-3 shrink-0 flex items-center justify-center"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? '∨' : '›'}
                  </button>

                  {/* Workspace icon */}
                  <button
                    onClick={() => setActive(ws.id)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: ws.color }}
                    >
                      {ws.name[0]?.toUpperCase() ?? '?'}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      {editingWorkspaceId === ws.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleCommitRename(ws.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCommitRename(ws.id);
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono text-aide-text-primary bg-aide-surface-elevated border border-aide-border rounded px-1 outline-none"
                        />
                      ) : (
                        <span className="text-xs font-mono text-aide-text-primary truncate">{ws.name}</span>
                      )}
                      <span className="text-[10px] font-mono text-aide-text-tertiary truncate">{ws.path}</span>
                    </div>
                    {/* Tab count */}
                    <span className="text-[10px] font-mono text-aide-text-tertiary shrink-0">
                      ({wsTabs.length})
                    </span>
                    {status && (
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        status === 'idle' ? 'bg-[#3B82F6]' : 'bg-[#F59E0B]'
                      }`} />
                    )}
                  </button>

                  {/* + button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddAgentTab(ws.id); }}
                    title="New agent"
                    className="text-aide-text-tertiary hover:text-aide-text-primary shrink-0 flex items-center justify-center"
                    style={{ fontSize: '14px', width: '14px', height: '14px' }}
                  >
                    +
                  </button>

                  {/* Agent dropdown — shown when + is clicked for this workspace */}
                  {dropdownWorkspaceId === ws.id && (
                    <AgentDropdown onClose={() => setDropdownWorkspaceId(null)} />
                  )}

                  {/* Context menu button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleContextMenu(e, ws.id); }}
                    title="More options"
                    className="opacity-0 group-hover:opacity-100 text-aide-text-tertiary hover:text-aide-text-primary shrink-0 flex items-center justify-center transition-opacity"
                    style={{ fontSize: '12px', width: '14px', height: '14px' }}
                  >
                    ···
                  </button>
                </div>

                {/* Agent entries */}
                {isExpanded && wsTabs.map((tab) => {
                  const tabStatus = tab.sessionId ? sessionStatuses[tab.sessionId] ?? 'idle' : 'idle';
                  const isTabActive = wsActiveTabId === tab.id && isActive;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleSelectTab(ws.id, tab.id)}
                      className={`flex items-center gap-1.5 w-full pl-6 pr-2 py-1 rounded text-left transition-colors ${
                        isTabActive ? 'bg-aide-surface-elevated' : 'hover:bg-aide-surface-elevated'
                      }`}
                    >
                      {/* Status dot */}
                      <span className="shrink-0 w-3 flex justify-center">
                        <StatusDot status={tabStatus} />
                      </span>

                      {/* Tab title */}
                      <span className="text-[11px] font-mono text-aide-text-secondary truncate flex-1">
                        {tab.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <UpdateNotice />

        {/* Add button */}
        <div className="px-2 mt-2">
          <button
            onClick={handleAddWorkspace}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs font-mono text-aide-text-secondary hover:bg-aide-surface-elevated transition-colors"
          >
            <span>+</span>
            <span>New Workspace</span>
          </button>
        </div>

        {/* Context menu */}
        {contextMenuId && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-aide-surface-elevated border border-aide-border rounded shadow-lg py-1 min-w-[160px]"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button
              onClick={() => { const ws = workspaces.find((w) => w.id === contextMenuId); if (ws) handleStartRename(ws); }}
              className="flex items-center w-full px-3 py-2 text-xs font-mono text-aide-text-primary hover:bg-aide-surface-sidebar transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => { const ws = workspaces.find((w) => w.id === contextMenuId); if (ws) handleShowInFinder(ws.path); }}
              className="flex items-center w-full px-3 py-2 text-xs font-mono text-aide-text-primary hover:bg-aide-surface-sidebar transition-colors"
            >
              Show in Finder
            </button>
            <hr className="border-aide-border my-1" />
            <button
              onClick={() => { const id = contextMenuId; setContextMenuId(null); if (workspaces.length > 1) setDeleteConfirmId(id); }}
              disabled={workspaces.length <= 1}
              className="flex items-center w-full px-3 py-2 text-xs font-mono text-red-400 hover:bg-aide-surface-sidebar transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Remove from Workspace
            </button>
          </div>
        )}

        {/* Delete workspace confirmation dialog */}
        {deleteConfirmId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="bg-aide-surface-elevated border border-aide-border rounded-lg px-4 py-3 flex flex-col gap-3 max-w-[180px] w-full mx-3">
              <span className="text-xs font-mono text-aide-text-primary">
                Delete &ldquo;{workspaces.find((w) => w.id === deleteConfirmId)?.name}&rdquo;?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteWorkspace(deleteConfirmId)}
                  className="flex-1 px-2 py-1 text-[10px] font-mono bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-2 py-1 text-[10px] font-mono bg-aide-border text-aide-text-secondary rounded hover:text-aide-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center py-2 gap-2 bg-aide-surface-sidebar border-r border-aide-border shrink-0"
      style={{ width: '48px' }}
    >
      {/* Expand toggle */}
      <button
        onClick={toggleNav}
        title="Expand sidebar"
        className="flex items-center justify-center w-7 h-5 rounded text-aide-text-tertiary hover:text-aide-text-primary text-xs mb-1"
      >
        »
      </button>

      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        const status = getWorkspaceStatus(ws.id);
        return (
          <button
            key={ws.id}
            onClick={() => setActive(ws.id)}
            title={ws.name}
            className={`relative flex items-center justify-center w-7 h-7 rounded-[6px] text-[11px] font-bold font-mono transition-colors ${
              isActive
                ? 'bg-aide-surface-elevated text-aide-text-primary'
                : 'text-aide-text-secondary hover:bg-aide-surface-elevated hover:text-aide-text-primary'
            }`}
          >
            <span
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-black text-[11px] font-bold"
              style={{ backgroundColor: ws.color }}
            >
              {ws.name[0]?.toUpperCase() ?? '?'}
            </span>
            {status && <StatusBadge status={status} />}
          </button>
        );
      })}

      <div className="w-6 border-t border-aide-border my-1" />

      <UpdateNotice collapsed />

      <button
        onClick={handleAddWorkspace}
        title="New Workspace"
        className="flex items-center justify-center w-7 h-7 rounded-[6px] text-aide-text-secondary bg-aide-surface-elevated border border-aide-border hover:text-aide-text-primary transition-colors text-base font-mono"
      >
        +
      </button>
    </div>
  );
}
