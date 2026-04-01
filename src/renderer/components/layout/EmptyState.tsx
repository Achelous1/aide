import { useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';
import { useAgentStore } from '../../stores/agent-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useLayoutStore } from '../../stores/layout-store';

interface AgentCard {
  id: string;
  label: string;
  hint: string;
  color: string;
  type: 'agent' | 'shell';
  command?: string;
}

const AGENT_CARDS: AgentCard[] = [
  {
    id: 'claude',
    label: 'claude',
    hint: 'Claude Code',
    color: 'var(--agent-claude)',
    type: 'agent',
    command: 'claude',
  },
  {
    id: 'gemini',
    label: 'gemini',
    hint: 'Gemini CLI',
    color: 'var(--agent-gemini)',
    type: 'agent',
    command: 'gemini',
  },
  {
    id: 'codex',
    label: 'codex',
    hint: 'Codex CLI',
    color: 'var(--agent-codex)',
    type: 'agent',
    command: 'codex',
  },
  {
    id: 'shell',
    label: '$ shell',
    hint: '$ shell',
    color: 'var(--text-tertiary)',
    type: 'shell',
  },
];

interface EmptyStateProps {
  paneId: string;
}

export function EmptyState({ paneId }: EmptyStateProps) {
  const { addTab, setActiveTab } = useTerminalStore();
  const { installedAgents, setInstalledAgents } = useAgentStore();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  useEffect(() => {
    window.aide.agent.detect().then(setInstalledAgents).catch(() => {});
  }, [setInstalledAgents]);

  const isInstalled = (agentId: string) => {
    if (agentId === 'shell') return true;
    return installedAgents.some((a) => a.id === agentId);
  };

  const handleSelect = async (card: AgentCard) => {
    if (!isInstalled(card.id)) return;

    try {
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      const sessionId = await window.aide.terminal.spawn(
        card.command ? { shell: card.command, cwd: ws?.path } : { cwd: ws?.path }
      );

      const tab = {
        id: crypto.randomUUID(),
        type: card.type,
        agentId: card.type === 'agent' ? card.id : undefined,
        sessionId,
        title: card.label,
      };

      addTab(tab);
      setActiveTab(tab.id);
      useLayoutStore.getState().addTabToPane(paneId, tab);
    } catch {
      // ignore spawn errors
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-6 select-none">
      {/* Hero logo */}
      <div
        className="font-mono font-bold text-[48px] leading-none"
        style={{ color: 'var(--accent)' }}
      >
        {'> aide_'}
      </div>

      {/* Subtitle */}
      <p className="text-[14px] text-aide-text-secondary">
        Select an agent to start a new session
      </p>

      {/* Agent cards */}
      <div className="flex flex-row gap-4">
        {AGENT_CARDS.map((card) => {
          const installed = isInstalled(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleSelect(card)}
              disabled={!installed}
              className={`flex flex-col gap-2 p-4 rounded-lg border border-aide-border transition-colors ${
                installed
                  ? 'bg-aide-surface-elevated hover:bg-aide-surface cursor-pointer'
                  : 'bg-aide-surface-elevated cursor-not-allowed'
              }`}
              style={{
                width: '180px',
                height: '120px',
                borderTop: `3px solid ${card.color}`,
                opacity: installed ? 1 : 0.4,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: card.color }}
                />
                <span className="text-[13px] font-mono font-bold text-aide-text-primary">
                  {card.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-aide-text-secondary text-left">
                {installed ? card.hint : 'Not installed'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
