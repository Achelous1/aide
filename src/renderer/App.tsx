import { useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { StatusBar } from './components/layout/StatusBar';
import { WorkspaceNav } from './components/workspace/WorkspaceNav';
import { TabBar } from './components/terminal/TabBar';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { WelcomePage } from './components/welcome/WelcomePage';
import { FileExplorer } from './components/file-explorer/FileExplorer';
import { useWorkspaceStore } from './stores/workspace-store';
import { useTerminalStore } from './stores/terminal-store';

export function App() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabId = useTerminalStore((s) => s.activeTabId);
  const workspaceTabs = useTerminalStore((s) => s.workspaceTabs);
  const createDefaultTab = useTerminalStore((s) => s.createDefaultTab);
  const updateTabSession = useTerminalStore((s) => s.updateTabSession);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Auto-create a default shell tab when workspace is first loaded
  useEffect(() => {
    if (!activeWorkspaceId || tabs.length > 0) return;
    const tabId = createDefaultTab();
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    window.aide.terminal.spawn({ cwd: ws?.path }).then((sessionId) => {
      updateTabSession(tabId, sessionId);
    }).catch(() => {
      // ignore spawn errors
    });
  }, [activeWorkspaceId, tabs.length, createDefaultTab, updateTabSession]);

  if (!activeWorkspaceId) {
    return <WelcomePage recentProjects={recentProjects} />;
  }

  // Collect all terminals: active workspace tabs + all cached workspace tabs
  // This keeps xterm instances alive across workspace switches
  const allTerminals: Array<{ tab: { id: string; sessionId: string }; wsId: string; isActiveWs: boolean }> = [];

  // Current workspace tabs
  for (const tab of tabs) {
    if (tab.sessionId) {
      allTerminals.push({ tab, wsId: activeWorkspaceId, isActiveWs: true });
    }
  }

  // Cached workspace tabs (inactive workspaces)
  for (const [wsId, saved] of Object.entries(workspaceTabs)) {
    if (wsId === activeWorkspaceId) continue;
    for (const tab of saved.tabs) {
      if (tab.sessionId) {
        allTerminals.push({ tab, wsId, isActiveWs: false });
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-aide-background text-aide-text-primary overflow-hidden">
      <TitleBar />

      {/* Body: WorkspaceNav + FileExplorer + MainArea */}
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceNav />

        {/* File Explorer */}
        <div
          className="flex flex-col shrink-0 bg-aide-surface-sidebar border-r border-aide-border overflow-hidden"
          style={{ width: '220px' }}
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono shrink-0">
            Explorer
          </div>
          {activeWorkspaceId && (() => {
            const ws = workspaces.find((w) => w.id === activeWorkspaceId);
            return ws ? <FileExplorer cwd={ws.path} /> : null;
          })()}
        </div>

        {/* Main area: TabBar + Terminal */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <div className="flex-1 overflow-hidden relative">
            {allTerminals.map(({ tab, isActiveWs }) => {
              const isVisible = isActiveWs && tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  className="absolute inset-0"
                  style={{ display: isVisible ? 'block' : 'none' }}
                >
                  <TerminalPanel sessionId={tab.sessionId} visible={isVisible} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
