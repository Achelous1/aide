import { useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';
import { useAgentStore } from '../../stores/agent-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useLayoutStore } from '../../stores/layout-store';

interface AgentButton {
  id: string;
  label: string;
  icon: string;
  shortcutKey: string;
  type: 'agent' | 'shell';
  command?: string;
}

const AGENT_BUTTONS: AgentButton[] = [
  {
    id: 'claude',
    label: 'Open Claude',
    icon: '\u25CC',
    shortcutKey: '1',
    type: 'agent',
    command: 'claude',
  },
  {
    id: 'gemini',
    label: 'Open Gemini',
    icon: '\u25CE',
    shortcutKey: '2',
    type: 'agent',
    command: 'gemini',
  },
  {
    id: 'codex',
    label: 'Open Codex',
    icon: '\u25CD',
    shortcutKey: '3',
    type: 'agent',
    command: 'codex',
  },
  {
    id: 'shell',
    label: 'Open Terminal',
    icon: '\u25A2',
    shortcutKey: 'T',
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

  const handleSelect = async (btn: AgentButton) => {
    if (!isInstalled(btn.id)) return;

    try {
      const ws = workspaces.find((w) => w.id === activeWorkspaceId);
      const sessionId = await window.aide.terminal.spawn(
        btn.command ? { shell: btn.command, cwd: ws?.path } : { cwd: ws?.path }
      );

      const tab = {
        id: crypto.randomUUID(),
        type: btn.type,
        agentId: btn.type === 'agent' ? btn.id : undefined,
        sessionId,
        title: btn.type === 'agent' ? btn.id : '$ shell',
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

      {/* Agent buttons */}
      <div
        className="flex flex-col gap-2 rounded-xl"
        style={{
          width: '440px',
          padding: '8px',
          backgroundColor: 'var(--background)',
        }}
      >
        {AGENT_BUTTONS.map((btn, idx) => {
          const installed = isInstalled(btn.id);
          const isFirst = idx === 0;
          return (
            <button
              key={btn.id}
              onClick={() => handleSelect(btn)}
              disabled={!installed}
              className="flex items-center justify-between rounded-[10px] transition-colors"
              style={{
                height: '44px',
                padding: '0 12px',
                backgroundColor: isFirst ? 'var(--surface-elevated)' : 'var(--background)',
                opacity: installed ? 1 : 0.4,
                cursor: installed ? 'pointer' : 'not-allowed',
              }}
            >
              {/* Left: icon + label */}
              <div className="flex items-center" style={{ gap: '10px' }}>
                <span
                  className="font-mono font-bold text-[15px]"
                  style={{ color: isFirst ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}
                >
                  {btn.icon}
                </span>
                <span
                  className="font-mono font-medium text-[13px]"
                  style={{ color: isFirst ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                >
                  {btn.label}
                </span>
              </div>

              {/* Right: shortcut chips */}
              <div className="flex items-center" style={{ gap: '6px' }}>
                <span
                  className="inline-flex items-center justify-center font-mono font-semibold text-[11px] rounded-full leading-none"
                  style={{
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    backgroundColor: isFirst ? 'var(--surface)' : 'var(--surface-elevated)',
                    color: isFirst ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  }}
                >
                  {'\u2318'}
                </span>
                <span
                  className="inline-flex items-center justify-center font-mono font-semibold text-[11px] rounded-full leading-none"
                  style={{
                    minWidth: '22px',
                    height: '22px',
                    padding: '0 6px',
                    backgroundColor: isFirst ? 'var(--surface)' : 'var(--surface-elevated)',
                    color: isFirst ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  }}
                >
                  {btn.shortcutKey}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
