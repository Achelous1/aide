import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { usePluginStore } from '../../stores/plugin-store';
import { useTerminalStore } from '../../stores/terminal-store';
import type { GitStatus } from '../../../types/ipc';

export function StatusBar() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const plugins = usePluginStore((s) => s.plugins);
  const activePluginCount = plugins.filter((p) => p.active).length;
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabId = useTerminalStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const agentLabel = activeTab?.agentId ?? (activeTab?.type === 'shell' ? 'shell' : null);
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

  const branch = gitStatus?.branch ?? '—';
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
      {activePluginCount > 0 && (
        <span>plugins: {activePluginCount}</span>
      )}
      <span className="flex-1" />
      {agentLabel && <span>{agentLabel}</span>}
    </div>
  );
}
