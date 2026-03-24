import { useWorkspaceStore } from '../../stores/workspace-store';
import { useAgentStore } from '../../stores/agent-store';
import type { AgentStatus } from '../../../types/ipc';

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
  const { workspaces, activeWorkspaceId, setActive, addWorkspace } = useWorkspaceStore();
  const { sessionStatuses } = useAgentStore();

  // Derive a representative status per workspace (first session found)
  const getWorkspaceStatus = (workspaceId: string): AgentStatus | null => {
    const entry = Object.entries(sessionStatuses).find(([id]) =>
      id.startsWith(workspaceId)
    );
    return entry ? entry[1] : null;
  };

  const handleAddWorkspace = async () => {
    if (!window.aide?.workspace) return;
    // In a real impl we'd open a directory picker; for now call create with empty string
    try {
      const ws = await window.aide.workspace.create('');
      addWorkspace(ws);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="flex flex-col items-center py-2 gap-2 bg-aide-surface-sidebar border-r border-aide-border shrink-0"
      style={{ width: '48px' }}
    >
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
            style={{ backgroundColor: isActive ? undefined : undefined }}
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
