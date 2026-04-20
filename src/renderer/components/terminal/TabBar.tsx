import { useTerminalStore } from '../../stores/terminal-store';
import { AgentDropdown } from './AgentDropdown';

const AGENT_COLORS: Record<string, string> = {
  claude: 'var(--agent-claude)',
  gemini: 'var(--agent-gemini)',
  codex: 'var(--agent-codex)',
  shell: 'var(--text-tertiary)',
};

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab, dropdownOpen, toggleDropdown } =
    useTerminalStore();

  return (
    <div
      className="relative flex items-end w-full bg-aide-surface border-b border-aide-border shrink-0"
      style={{ height: '36px' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const agentId = tab.agentId ?? 'shell';
        const dotColor = AGENT_COLORS[agentId] ?? AGENT_COLORS.shell;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            // 80px min / 200px max: keep in sync with PaneView.tsx DraggableTab (fits ~25 chars at 12px monospace)
            className={`group relative flex items-center gap-1.5 px-3 h-full text-[12px] font-mono transition-colors min-w-[80px] max-w-[200px] ${
              isActive
                ? 'bg-aide-tab-active-bg text-aide-text-primary'
                : 'bg-aide-tab-inactive-bg text-aide-text-secondary hover:text-aide-text-primary'
            }`}
          >
            {/* Active top border */}
            {isActive && (
              <span
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}
            {/* Agent color dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            <span className="truncate min-w-0 flex-1" title={tab.title}>{tab.title}</span>
            {/* Close button on hover */}
            {tabs.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (tab.sessionId) {
                    try {
                      await window.aide.terminal.kill(tab.sessionId);
                    } catch {
                      // ignore kill errors
                    }
                  }
                  removeTab(tab.id);
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    if (tab.sessionId) {
                      try {
                        await window.aide.terminal.kill(tab.sessionId);
                      } catch {
                        // ignore kill errors
                      }
                    }
                    removeTab(tab.id);
                  }
                }}
                className="ml-1 shrink-0 opacity-0 group-hover:opacity-100 text-[10px] text-aide-text-tertiary hover:text-aide-text-primary transition-opacity leading-none"
              >
                ×
              </span>
            )}
          </button>
        );
      })}

      {/* Add tab button */}
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center px-3 h-full text-[14px] text-aide-text-tertiary bg-aide-surface hover:text-aide-text-primary transition-colors"
      >
        +
      </button>

      {dropdownOpen && <AgentDropdown />}
    </div>
  );
}
