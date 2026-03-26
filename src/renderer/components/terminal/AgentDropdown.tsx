import { useEffect, useRef } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';
import { useAgentStore } from '../../stores/agent-store';

interface AgentOption {
  id: string;
  label: string;
  hint: string;
  dotColor: string;
  type: 'agent' | 'shell';
  command?: string;
  dividerBefore?: boolean;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    id: 'claude',
    label: 'claude',
    hint: 'Claude Code',
    dotColor: 'var(--agent-claude)',
    type: 'agent',
    command: 'claude',
  },
  {
    id: 'gemini',
    label: 'gemini',
    hint: 'Gemini CLI',
    dotColor: 'var(--agent-gemini)',
    type: 'agent',
    command: 'gemini',
  },
  {
    id: 'codex',
    label: 'codex',
    hint: 'Codex CLI',
    dotColor: 'var(--agent-codex)',
    type: 'agent',
    command: 'codex',
  },
  {
    id: 'shell',
    label: '$ shell',
    hint: 'Terminal',
    dotColor: 'var(--text-tertiary)',
    type: 'shell',
    dividerBefore: true,
  },
];

export function AgentDropdown() {
  const { addTab, setActiveTab, toggleDropdown, updateTabSession } = useTerminalStore();
  const { installedAgents, setInstalledAgents } = useAgentStore();
  const ref = useRef<HTMLDivElement>(null);

  // Detect installed agents on mount
  useEffect(() => {
    window.aide.agent.detect().then(setInstalledAgents).catch(() => {});
  }, [setInstalledAgents]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        toggleDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [toggleDropdown]);

  const isInstalled = (agentId: string) => {
    if (agentId === 'shell') return true;
    return installedAgents.some((a) => a.id === agentId);
  };

  const handleSelect = async (option: AgentOption) => {
    if (!isInstalled(option.id)) return;

    const tabId = crypto.randomUUID();
    addTab({
      id: tabId,
      type: option.type,
      agentId: option.type === 'agent' ? option.id : undefined,
      sessionId: '',
      title: option.label,
    });
    setActiveTab(tabId);

    try {
      const sessionId = await window.aide.terminal.spawn(
        option.command ? { shell: option.command } : undefined
      );
      updateTabSession(tabId, sessionId);
    } catch {
      // ignore spawn errors
    }
    toggleDropdown();
  };

  return (
    <div
      ref={ref}
      className="absolute top-full left-auto z-50 mt-0.5 w-48 rounded-md border border-aide-border bg-aide-surface-elevated shadow-lg py-1"
      style={{ left: 'auto' }}
    >
      <div className="px-3 py-1.5 text-[11px] font-semibold text-aide-text-tertiary uppercase tracking-wide">
        New Tab
      </div>

      {AGENT_OPTIONS.map((option) => {
        const installed = isInstalled(option.id);
        return (
          <div key={option.id}>
            {option.dividerBefore && (
              <div className="my-1 border-t border-aide-border" />
            )}
            <button
              onClick={() => handleSelect(option)}
              disabled={!installed}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono text-left transition-colors ${
                installed
                  ? 'text-aide-text-primary hover:bg-aide-surface'
                  : 'text-aide-text-tertiary cursor-not-allowed'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: option.dotColor }}
              />
              <span className="flex-1">{option.label}</span>
              <span className="text-[11px] text-aide-text-tertiary">
                {installed ? option.hint : 'Not installed'}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
