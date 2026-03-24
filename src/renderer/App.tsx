import { TerminalPanel } from './components/terminal/TerminalPanel';

export function App() {
  return (
    <div className="flex h-screen bg-aide-bg text-aide-text">
      {/* Sidebar - File Explorer (future) */}
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Agent Selector Bar */}
        <header className="flex items-center gap-2 px-4 py-2 bg-aide-surface border-b border-aide-border">
          <h1 className="text-sm font-bold text-aide-accent mr-4">AIDE</h1>
          <button className="px-3 py-1 text-xs rounded bg-aide-bg hover:bg-aide-border text-aide-text transition-colors">
            Shell
          </button>
        </header>

        {/* Terminal Area */}
        <div className="flex-1">
          <TerminalPanel />
        </div>
      </main>
    </div>
  );
}
