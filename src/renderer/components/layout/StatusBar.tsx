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
      className="flex items-center w-full shrink-0 px-3 gap-4 bg-aide-accent text-black text-[11px] font-mono"
      style={{ height: '24px' }}
    >
      {activePluginCount > 0 && (
        <span>plugins: {activePluginCount}</span>
      )}
      <span className="flex-1" />
      {agentLabel && <span>{agentLabel}</span>}
    </div>
  );
}
