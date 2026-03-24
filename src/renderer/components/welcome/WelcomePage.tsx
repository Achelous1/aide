import type { WorkspaceInfo } from '../../../types/ipc';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface RecentProjectItemProps {
  project: WorkspaceInfo;
  onClick: () => void;
}

function RecentProjectItem({ project, onClick }: RecentProjectItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-[var(--surface-elevated)] border border-transparent hover:border-[var(--border)]"
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ backgroundColor: project.color }}
      >
        {project.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{project.name}</div>
        <div className="text-xs text-[var(--text-tertiary)] truncate">{project.path}</div>
      </div>
      <div className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
        {formatRelativeTime(project.lastOpened)}
      </div>
    </button>
  );
}

interface WelcomePageProps {
  recentProjects: WorkspaceInfo[];
}

export function WelcomePage({ recentProjects }: WelcomePageProps) {
  function handleOpenRepository() {
    console.log('open repository');
    window.aide.workspace.open('');
  }

  function handleOpenRecent(path: string) {
    console.log('open recent:', path);
    window.aide.workspace.open(path);
  }

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* TopBar */}
      <header className="h-10 flex items-center justify-center border-b border-[var(--border)] flex-shrink-0">
        <span className="text-sm font-bold text-[var(--text-secondary)]">&gt; aide</span>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="w-full max-w-md px-6 py-12 flex flex-col gap-8">
          {/* Hero */}
          <div className="flex flex-col gap-2">
            <h1
              className="font-bold text-[var(--accent)]"
              style={{ fontSize: '36px', lineHeight: 1.2 }}
            >
              &gt; aide_
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              AI-driven terminal IDE. Open a repository to get started.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleOpenRepository}
              className="flex-1 px-4 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Open Repository
            </button>
            <button
              onClick={handleOpenRepository}
              className="flex-1 px-4 py-2 rounded text-sm font-medium border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              + New Project
            </button>
          </div>

          {/* Recent projects */}
          {recentProjects.length > 0 && (
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider px-1 mb-1">
                Recent
              </h2>
              {recentProjects.map((project) => (
                <RecentProjectItem
                  key={project.id}
                  project={project}
                  onClick={() => handleOpenRecent(project.path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
