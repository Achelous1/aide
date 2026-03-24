import { TitleBar } from './components/layout/TitleBar';
import { StatusBar } from './components/layout/StatusBar';
import { WorkspaceNav } from './components/workspace/WorkspaceNav';
import { TabBar } from './components/terminal/TabBar';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { WelcomePage } from './components/welcome/WelcomePage';
import { useWorkspaceStore } from './stores/workspace-store';

export function App() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const recentProjects = useWorkspaceStore((s) => s.recentProjects);

  if (!activeWorkspaceId) {
    return <WelcomePage recentProjects={recentProjects} />;
  }

  return (
    <div className="flex flex-col h-screen bg-aide-background text-aide-text-primary overflow-hidden">
      <TitleBar />

      {/* Body: WorkspaceNav + FileExplorer + MainArea */}
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceNav />

        {/* File Explorer placeholder */}
        <div
          className="flex flex-col shrink-0 bg-aide-surface-sidebar border-r border-aide-border"
          style={{ width: '220px' }}
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
            Explorer
          </div>
        </div>

        {/* Main area: TabBar + Terminal */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />
          <div className="flex-1 overflow-hidden">
            <TerminalPanel />
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
