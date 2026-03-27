import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useAgentStore } from '../../stores/agent-store';
import { useTerminalStore } from '../../stores/terminal-store';
import type { AgentStatus, GitStatus } from '../../../types/ipc';

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === 'idle') {
    return <span className="text-[10px] leading-none" style={{ color: '#3B82F6' }}>●</span>;
  }
  if (status === 'processing') {
    return <span className="text-[10px] leading-none" style={{ color: '#F59E0B' }}>···</span>;
  }
  // awaiting-input
  return <span className="text-[10px] leading-none" style={{ color: '#F59E0B' }}>?</span>;
}

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === 'idle') {
    return (
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3B82F6] border border-aide-surface-elevated" />
    );
  }
  if (status === 'processing') {
    return (
      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-aide-surface-elevated flex items-center justify-center">
        <span className="text-[6px] text-black font-bold leading-none">···</span>
      </span>
    );
  }
  // awaiting-input
  return (
    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-aide-surface-elevated flex items-center justify-center">
      <span className="text-[7px] text-black font-bold leading-none">?</span>
    </span>
  );
}

export function WorkspaceNav() {
  const { workspaces, activeWorkspaceId, navExpanded, setActive, toggleNav, addWorkspace } = useWorkspaceStore();
  const { sessionStatuses } = useAgentStore();
  const { workspaceTabs, tabs: activeTabs, activeTabId, setActiveTab } = useTerminalStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [gitStatuses, setGitStatuses] = useState<Record<string, GitStatus | null>>({});

  useEffect(() => {
    if (!window.aide?.agent?.onStatus) return;
    const unsubscribe = window.aide.agent.onStatus((sessionId, status) => {
      useAgentStore.getState().setStatus(sessionId, status);
    });
    return unsubscribe;
  }, []);

  // Fetch git status for each workspace
  useEffect(() => {
    if (!window.aide?.git?.status) return;

    const fetchAll = async () => {
      const results: Record<string, GitStatus | null> = {};
      await Promise.all(
        workspaces.map(async (ws) => {
          try {
            results[ws.id] = await window.aide.git.status(ws.path);
          } catch {
            results[ws.id] = null;
          }
        })
      );
      setGitStatuses(results);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [workspaces]);

  // Derive a representative status per workspace (first session found)
  const getWorkspaceStatus = (workspaceId: string): AgentStatus | null => {
    const entry = Object.entries(sessionStatuses).find(([id]) =>
      id.startsWith(workspaceId)
    );
    return entry ? entry[1] : null;
  };

  // Get tabs for a given workspace (may be active or stored)
  const getTabsForWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      return activeTabs;
    }
    return workspaceTabs[workspaceId]?.tabs ?? [];
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

  const handleAddAgentTab = (workspaceId: string) => {
    setActive(workspaceId);
    useTerminalStore.getState().createDefaultTab();
  };

  const handleSelectTab = (workspaceId: string, tabId: string) => {
    setActive(workspaceId);
    setActiveTab(tabId);
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
            const gitStatus = gitStatuses[ws.id] ?? null;
            const gitAdded = gitStatus ? gitStatus.added.length : 0;
            const gitRemoved = gitStatus ? gitStatus.deleted.length + gitStatus.modified.length : 0;
            const branch = gitStatus?.branch ?? null;

            return (
              <div key={ws.id}>
                {/* Project row */}
                <div
                  className={`flex items-center gap-1 px-1 py-1.5 rounded transition-colors ${
                    isActive ? 'bg-aide-surface-elevated' : 'hover:bg-aide-surface-elevated'
                  }`}
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
                    <span className="text-xs font-mono text-aide-text-primary truncate flex-1">{ws.name}</span>
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

                      {/* Git diff stats */}
                      {(gitAdded > 0 || gitRemoved > 0) && (
                        <span className="shrink-0 text-[11px] font-mono flex gap-0.5">
                          {gitAdded > 0 && <span style={{ color: '#22C55E' }}>+{gitAdded}</span>}
                          {gitRemoved > 0 && <span style={{ color: '#EF4444' }}>-{gitRemoved}</span>}
                        </span>
                      )}

                      {/* Branch */}
                      {branch && (
                        <span className="text-[11px] font-mono text-aide-text-tertiary truncate shrink-0 max-w-[60px]">
                          {branch}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

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
