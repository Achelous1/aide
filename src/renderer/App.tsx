import { useEffect, useRef } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { StatusBar } from './components/layout/StatusBar';
import { SplitContainer } from './components/layout/SplitContainer';
import { DndProvider } from './components/layout/DndProvider';
import { WorkspaceNav } from './components/workspace/WorkspaceNav';
import { WelcomePage } from './components/welcome/WelcomePage';
import { FileExplorer } from './components/file-explorer/FileExplorer';
import { PluginPanel } from './components/plugin/PluginPanel';
import { useWorkspaceStore } from './stores/workspace-store';
import { useTerminalStore } from './stores/terminal-store';
import { useLayoutStore } from './stores/layout-store';

export function App() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const layout = useLayoutStore((s) => s.layout);
  const sidePanelTab = useWorkspaceStore((s) => s.sidePanelTab);
  const setSidePanelTab = useWorkspaceStore((s) => s.setSidePanelTab);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Restore session on initial workspace load (workspace switches handled by setActive)
  const initialRestoreDone = useRef(false);
  useEffect(() => {
    if (!activeWorkspaceId || initialRestoreDone.current) return;
    initialRestoreDone.current = true;
    useLayoutStore.getState().restoreSession(activeWorkspaceId);
  }, [activeWorkspaceId]);

  // Save session on app quit
  useEffect(() => {
    const handler = () => {
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (wsId) {
        useLayoutStore.getState().saveSession(wsId);
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Track agent session IDs for resume support
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = window.aide.terminal.onAgentSessionId((sessionId, agentSessionId) => {
      useLayoutStore.getState().updateTabAgentSessionId(sessionId, agentSessionId);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const wsId = useWorkspaceStore.getState().activeWorkspaceId;
        if (wsId) useLayoutStore.getState().saveSession(wsId);
      }, 250);
    });
    return () => {
      if (saveTimer) clearTimeout(saveTimer);
      unsub();
    };
  }, []);

  // PaneView auto-spawns a shell when empty — no App-level auto-create needed

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

      // ⌘T / Ctrl+T: new shell tab in focused pane
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        e.stopPropagation();
        const wsId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!wsId) return;
        const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === wsId);
        window.aide.terminal.spawn({ cwd: ws?.path }).then((sessionId) => {
          const tab = {
            id: crypto.randomUUID(),
            type: 'shell' as const,
            sessionId,
            title: '$ shell',
          };
          useTerminalStore.getState().addTab(tab);
          const pane = useLayoutStore.getState().getFocusedPane();
          if (pane) {
            useLayoutStore.getState().addTabToPane(pane.id, tab);
          }
        }).catch(() => {
          // ignore spawn errors
        });
        return;
      }

      // ⌘⇧W / Ctrl+Shift+W: close focused pane, merge tabs to sibling
      if ((e.key === 'w' || e.key === 'W') && e.shiftKey) {
        const panes = useLayoutStore.getState().getAllPanes();
        if (panes.length <= 1) return;
        const pane = useLayoutStore.getState().getFocusedPane();
        if (!pane) return;
        e.preventDefault();
        e.stopPropagation();
        useLayoutStore.getState().closePaneAndMergeTabs(pane.id);
        return;
      }

      // ⌘W / Ctrl+W: close current tab from focused pane
      if (e.key === 'w' || e.key === 'W') {
        const pane = useLayoutStore.getState().getFocusedPane();
        if (!pane || !pane.activeTabId) return;
        const allPanes = useLayoutStore.getState().getAllPanes();
        const totalTabs = allPanes.reduce((sum, p) => sum + p.tabs.length, 0);
        if (totalTabs <= 1) return;
        e.preventDefault();
        e.stopPropagation();
        const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId);
        if (activeTab?.sessionId && activeTab.type !== 'plugin') {
          window.aide.terminal.kill(activeTab.sessionId).catch(() => {
            // ignore kill errors
          });
        }
        useLayoutStore.getState().removeTabFromPane(pane.id, pane.activeTabId);
        useTerminalStore.getState().removeTab(pane.activeTabId);
        return;
      }

      // ⌘\ / Ctrl+\: split pane right
      if (e.key === '\\') {
        const pane = useLayoutStore.getState().getFocusedPane();
        if (pane) {
          e.preventDefault();
          e.stopPropagation();
          useLayoutStore.getState().splitPane(pane.id, e.shiftKey ? 'vertical' : 'horizontal');
        }
        return;
      }

      // ⌘⇧[ / ⌘⇧]: switch focused pane
      if (e.shiftKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        e.stopPropagation();
        const panes = useLayoutStore.getState().getAllPanes();
        if (panes.length < 2) return;
        const currentId = useLayoutStore.getState().focusedPaneId;
        const idx = panes.findIndex((p) => p.id === currentId);
        const next = e.key === ']'
          ? panes[(idx + 1) % panes.length]
          : panes[(idx - 1 + panes.length) % panes.length];
        useLayoutStore.getState().setFocusedPane(next.id);
        return;
      }

      // ⌘1/2/3: spawn agent (Claude/Gemini/Codex) in focused pane
      const AGENT_SHORTCUTS: Record<string, { command: string; id: string; label: string }> = {
        '1': { command: 'claude', id: 'claude', label: 'claude' },
        '2': { command: 'gemini', id: 'gemini', label: 'gemini' },
        '3': { command: 'codex', id: 'codex', label: 'codex' },
      };
      const agentShortcut = AGENT_SHORTCUTS[e.key];
      if (agentShortcut) {
        e.preventDefault();
        e.stopPropagation();
        const wsId = useWorkspaceStore.getState().activeWorkspaceId;
        if (!wsId) return;
        const ws = useWorkspaceStore.getState().workspaces.find((w) => w.id === wsId);
        window.aide.terminal.spawn({ shell: agentShortcut.command, cwd: ws?.path }).then((sessionId) => {
          const tab = {
            id: crypto.randomUUID(),
            type: 'agent' as const,
            agentId: agentShortcut.id,
            sessionId,
            title: agentShortcut.label,
          };
          useTerminalStore.getState().addTab(tab);
          const pane = useLayoutStore.getState().getFocusedPane();
          if (pane) {
            useLayoutStore.getState().addTabToPane(pane.id, tab);
          }
        }).catch(() => {});
        return;
      }

      // ⌘4-9 / Ctrl+4-9: switch to tab by number in focused pane
      const digit = parseInt(e.key, 10);
      if (digit >= 4 && digit <= 9) {
        const pane = useLayoutStore.getState().getFocusedPane();
        if (pane) {
          const target = pane.tabs[digit - 1];
          if (target) {
            e.preventDefault();
            e.stopPropagation();
            useLayoutStore.getState().setActiveTab(pane.id, target.id);
          }
        }
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  if (!activeWorkspaceId) {
    return <WelcomePage recentProjects={recentProjects} />;
  }

  return (
    <div className="flex flex-col h-screen bg-aide-background text-aide-text-primary overflow-hidden">
      <TitleBar />

      {/* Body: WorkspaceNav + SidePanel + MainArea */}
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceNav />

        {/* Side Panel (220px) */}
        <div
          className="flex flex-col shrink-0 bg-aide-surface-sidebar border-r border-aide-border overflow-hidden"
          style={{ width: '220px' }}
        >
          {/* Panel tab switcher */}
          <div className="flex shrink-0 border-b border-aide-border" style={{ height: '32px' }}>
            {(['files', 'plugins'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidePanelTab(tab)}
                className={`flex-1 flex items-center justify-center text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                  sidePanelTab === tab
                    ? 'text-aide-text-primary border-b-2 border-aide-accent'
                    : 'text-aide-text-tertiary hover:text-aide-text-secondary'
                }`}
              >
                {tab === 'files' ? 'FILES' : 'PLUGINS'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex flex-col flex-1 overflow-hidden relative">
            {sidePanelTab === 'files' && activeWorkspaceId && (() => {
              const ws = workspaces.find((w) => w.id === activeWorkspaceId);
              return ws ? <FileExplorer cwd={ws.path} /> : null;
            })()}
            {sidePanelTab === 'plugins' && <PluginPanel />}
          </div>
        </div>

        {/* Main area: SplitContainer with DnD */}
        <div className="flex flex-1 overflow-hidden">
          <DndProvider>
            <SplitContainer node={layout} />
          </DndProvider>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
