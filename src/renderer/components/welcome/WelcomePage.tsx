import { useState, useRef, useEffect } from 'react';
import type { WorkspaceInfo } from '../../../types/ipc';
import { useWorkspaceStore } from '../../stores/workspace-store';

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
  const [showNameInput, setShowNameInput] = useState(false);
  const [projectName, setProjectName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNameInput && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showNameInput]);

  async function handleOpenRepository() {
    try {
      const path = await window.aide.workspace.openDialog();
      if (!path) return;
      const workspace = await window.aide.workspace.create(path);
      useWorkspaceStore.getState().addWorkspace(workspace);
      useWorkspaceStore.getState().setActive(workspace.id);
    } catch (err) {
      console.error('Failed to open repository:', err);
    }
  }

  async function handleNewProject() {
    if (!showNameInput) {
      setShowNameInput(true);
      return;
    }
    const name = projectName.trim();
    if (!name) return;
    try {
      const workspace = await window.aide.workspace.createProject(name);
      if (!workspace) return;
      useWorkspaceStore.getState().addWorkspace(workspace);
      useWorkspaceStore.getState().setActive(workspace.id);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setShowNameInput(false);
      setProjectName('');
    }
  }

  async function handleOpenRecent(path: string) {
    try {
      await window.aide.workspace.open(path);
      const workspaces = useWorkspaceStore.getState().workspaces;
      const workspace = workspaces.find((w) => w.path === path);
      if (workspace) {
        useWorkspaceStore.getState().setActive(workspace.id);
      }
    } catch (err) {
      console.error('Failed to open recent project:', err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* TopBar */}
      <header
        className="h-10 relative flex items-center justify-center border-b border-[var(--border)] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-sm font-bold text-[var(--text-secondary)] pointer-events-none">&gt; aide</span>
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

          {/* Project name input (shown when + New Project clicked) */}
          {showNameInput && (
            <div className="flex gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNewProject(); if (e.key === 'Escape') { setShowNameInput(false); setProjectName(''); } }}
                placeholder="Project name..."
                className="flex-1 px-3 py-2 rounded text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleNewProject}
                disabled={!projectName.trim()}
                className="px-4 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNameInput(false); setProjectName(''); }}
                className="px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleOpenRepository}
              className="flex-1 px-4 py-2 rounded text-sm font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              Open Repository
            </button>
            <button
              onClick={() => setShowNameInput(true)}
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
