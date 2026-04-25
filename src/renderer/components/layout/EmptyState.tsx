import { useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';
import { useAgentStore } from '../../stores/agent-store';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useLayoutStore } from '../../stores/layout-store';
import { useToastStore } from '../../stores/toast-store';

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

    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    const result = await window.aide.terminal.spawn(
      btn.command ? { shell: btn.command, cwd: ws?.path } : { cwd: ws?.path }
    );

    if (!result.ok) {
      useToastStore.getState().push({
        kind: 'error',
        title: `Failed to open terminal (${result.code ?? 'unknown'})`,
        detail: result.error,
      });
      return;
    }

    const tab = {
      id: crypto.randomUUID(),
      type: btn.type,
      agentId: btn.type === 'agent' ? btn.id : undefined,
      sessionId: result.sessionId,
      title: btn.type === 'agent' ? btn.id : '$ shell',
    };

    addTab(tab);
    setActiveTab(tab.id);
    useLayoutStore.getState().addTabToPane(paneId, tab);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-6 select-none">
      {/* Hero logo */}
      <div className="font-mono font-bold text-[48px] leading-none text-aide-accent">
        {'> smalti_'}
      </div>

      {/* Subtitle */}
      <p className="text-[14px] text-aide-text-secondary">
        Select an agent to start a new session
      </p>

      {/* Agent buttons */}
      <div className="flex flex-col gap-2 rounded-xl bg-aide-background" style={{ width: '440px', padding: '8px' }}>
        {AGENT_BUTTONS.map((btn, idx) => {
          const installed = isInstalled(btn.id);
          const isFirst = idx === 0;
          return (
            <button
              key={btn.id}
              onClick={() => handleSelect(btn)}
              disabled={!installed}
              className={[
                'flex items-center justify-between rounded-[10px] transition-colors',
                isFirst ? 'bg-aide-surface-elevated' : 'bg-aide-background',
                installed ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-40',
              ].join(' ')}
              style={{ height: '44px', padding: '0 12px' }}
            >
              {/* Left: icon + label */}
              <div className="flex items-center gap-[10px]">
                <span
                  className={[
                    'font-mono font-bold text-[15px]',
                    isFirst ? 'text-aide-text-secondary' : 'text-aide-text-tertiary',
                  ].join(' ')}
                >
                  {btn.icon}
                </span>
                <span
                  className={[
                    'font-mono font-medium text-[13px]',
                    isFirst ? 'text-aide-text-primary' : 'text-aide-text-tertiary',
                  ].join(' ')}
                >
                  {btn.label}
                </span>
              </div>

              {/* Right: shortcut chips */}
              <div className="flex items-center gap-[6px]">
                <span
                  className={[
                    'inline-flex items-center justify-center font-mono font-semibold text-[11px] rounded-full leading-none',
                    isFirst ? 'bg-aide-surface text-aide-text-secondary' : 'bg-aide-surface-elevated text-aide-text-tertiary',
                  ].join(' ')}
                  style={{ minWidth: '22px', height: '22px', padding: '0 6px' }}
                >
                  {'\u2318'}
                </span>
                <span
                  className={[
                    'inline-flex items-center justify-center font-mono font-semibold text-[11px] rounded-full leading-none',
                    isFirst ? 'bg-aide-surface text-aide-text-secondary' : 'bg-aide-surface-elevated text-aide-text-tertiary',
                  ].join(' ')}
                  style={{ minWidth: '22px', height: '22px', padding: '0 6px' }}
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
