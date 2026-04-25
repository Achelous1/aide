import { usePluginStore } from '../../stores/plugin-store';
import { useTerminalStore } from '../../stores/terminal-store';

export function StatusBar() {
  const plugins = usePluginStore((s) => s.plugins);
  const activePluginCount = plugins.filter((p) => p.active).length;
  const tabs = useTerminalStore((s) => s.tabs);
  const activeTabId = useTerminalStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const agentLabel = activeTab?.agentId ?? (activeTab?.type === 'shell' ? 'shell' : null);

  return (
    <div
      className="flex items-center w-full shrink-0 px-3 gap-4 bg-aide-surface-elevated text-aide-text-primary text-[11px] font-mono border-t border-aide-border"
      style={{ height: '24px' }}
    >
      <span className="text-aide-text-primary">[{activePluginCount}] plugins active</span>
      <span className="flex-1" />
      {agentLabel && (
        <span className="font-bold text-aide-accent-warning">{agentLabel}</span>
      )}
    </div>
  );
}
