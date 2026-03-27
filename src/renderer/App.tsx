import { useEffect, useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { StatusBar } from './components/layout/StatusBar';
import { WorkspaceNav } from './components/workspace/WorkspaceNav';
import { TabBar } from './components/terminal/TabBar';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { WelcomePage } from './components/welcome/WelcomePage';
import { FileExplorer } from './components/file-explorer/FileExplorer';
import { PluginPanel } from './components/plugin/PluginPanel';
import { GitHubPanel } from './components/github/GitHubPanel';
import { useWorkspaceStore } from './stores/workspace-store';
import { useTerminalStore } from './stores/terminal-store';

type SidePanel = 'explorer' | 'plugins' | 'github';

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
  const [sidePanel, setSidePanel] = useState<SidePanel>('explorer');

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // ⌘B / Ctrl+B: toggle workspace nav
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        e.stopPropagation();
        useWorkspaceStore.getState().toggleNav();
        return;
      }

      // ⌘T / Ctrl+T: new shell tab
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        e.stopPropagation();
        const wsId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!wsId) return;
        const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === wsId);
        const tabId = useTerminalStore.getState().createDefaultTab();
        window.aide.terminal.spawn({ cwd: ws?.path }).then((sessionId) => {
          useTerminalStore.getState().updateTabSession(tabId, sessionId);
        }).catch(() => {
          // ignore spawn errors
        });
        return;
      }

      // ⌘W / Ctrl+W: close current tab (ignore if only one tab)
      if (e.key === 'w' || e.key === 'W') {
        const { tabs: currentTabs, activeTabId: currentActiveTabId } = useTerminalStore.getState();
        if (currentTabs.length <= 1) return;
        e.preventDefault();
        e.stopPropagation();
        const activeTab = currentTabs.find((t) => t.id === currentActiveTabId);
        if (activeTab?.sessionId) {
          window.aide.terminal.kill(activeTab.sessionId).catch(() => {
            // ignore kill errors
          });
        }
        useTerminalStore.getState().removeTab(currentActiveTabId!);
        return;
      }

      // ⌘1-9 / Ctrl+1-9: switch to tab by number
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9) {
        const { tabs: currentTabs } = useTerminalStore.getState();
        const target = currentTabs[digit - 1];
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          useTerminalStore.getState().setActiveTab(target.id);
        }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

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

        {/* Side Panel */}
        <div
          className="flex flex-col shrink-0 bg-aide-surface-sidebar border-r border-aide-border overflow-hidden"
          style={{ width: '220px' }}
        >
          {/* Panel tab switcher */}
          <div className="flex shrink-0 border-b border-aide-border">
            {(['explorer', 'plugins', 'github'] as SidePanel[]).map((panel) => (
              <button
                key={panel}
                onClick={() => setSidePanel(panel)}
                className={`flex-1 py-1 text-[9px] uppercase tracking-widest font-mono transition-colors ${
                  sidePanel === panel
                    ? 'text-aide-text-primary border-b border-aide-accent'
                    : 'text-aide-text-tertiary hover:text-aide-text-secondary'
                }`}
              >
                {panel === 'explorer' ? 'Files' : panel === 'plugins' ? 'Plugins' : 'GitHub'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex flex-col flex-1 overflow-hidden relative">
            {sidePanel === 'explorer' && activeWorkspaceId && (() => {
              const ws = workspaces.find((w) => w.id === activeWorkspaceId);
              return ws ? <FileExplorer cwd={ws.path} /> : null;
            })()}
            {sidePanel === 'plugins' && <PluginPanel />}
            {sidePanel === 'github' && <GitHubPanel />}
          </div>
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
