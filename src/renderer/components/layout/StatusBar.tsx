import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import type { GitStatus } from '../../../types/ipc';

export function StatusBar() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const cwd = activeWorkspace?.path ?? null;

  useEffect(() => {
    if (!cwd) {
      setGitStatus(null);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const status = await window.aide.git.status(cwd);
        if (!cancelled) setGitStatus(status);
      } catch {
        if (!cancelled) setGitStatus(null);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [cwd]);

  const branch = gitStatus?.branch ?? 'main';
  const changeCount =
    gitStatus
      ? gitStatus.modified.length + gitStatus.added.length + gitStatus.deleted.length + gitStatus.untracked.length
      : 0;

  return (
    <div
      className="flex items-center w-full shrink-0 px-3 gap-4 bg-aide-accent text-black text-[11px] font-mono"
      style={{ height: '24px' }}
    >
      <span>git: {branch}{changeCount > 0 ? ` (${changeCount})` : ''}</span>
    </div>
  );
}
