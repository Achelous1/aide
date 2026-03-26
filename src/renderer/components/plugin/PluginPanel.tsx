import { useEffect } from 'react';
import { usePluginStore } from '../../stores/plugin-store';

export function PluginPanel() {
  const { plugins, loading, loadPlugins, activate, deactivate, deletePlugin } = usePluginStore();

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-aide-text-secondary text-xs font-mono">
        Loading plugins...
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-aide-text-tertiary text-xs font-mono">
        <span>No plugins installed</span>
        <span className="text-[10px]">Use AI to generate plugins via terminal</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
          Plugins ({plugins.length})
        </span>
      </div>
      <div className="flex flex-col gap-1 px-2">
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className="flex items-center gap-2 px-2 py-2 rounded bg-aide-surface-elevated"
          >
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-mono text-aide-text-primary truncate">
                {plugin.name}
              </span>
              <span className="text-[10px] text-aide-text-secondary truncate">
                {plugin.description}
              </span>
              <span className="text-[10px] text-aide-text-tertiary">
                v{plugin.version}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() =>
                  plugin.active ? deactivate(plugin.id) : activate(plugin.id)
                }
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  plugin.active
                    ? 'bg-aide-accent text-black'
                    : 'bg-aide-border text-aide-text-secondary hover:text-aide-text-primary'
                }`}
              >
                {plugin.active ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => deletePlugin(plugin.name)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono text-aide-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Delete plugin"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
