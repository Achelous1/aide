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
            className={`group relative flex items-center gap-1.5 px-3 h-full text-[12px] font-mono transition-colors ${
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
            <span>{tab.title}</span>
            {/* Close button on hover */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  removeTab(tab.id);
                }
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 text-aide-text-tertiary hover:text-aide-text-primary transition-opacity leading-none"
            >
              ×
            </span>
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
