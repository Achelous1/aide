import { useEffect, useState } from 'react';
import { usePluginStore } from '../../stores/plugin-store';
import { useLayoutStore } from '../../stores/layout-store';

export function PluginPanel() {
  const {
    plugins,
    loading,
    error,
    loadPlugins,
    activate,
    deactivate,
    deletePlugin,
  } = usePluginStore();

  const focusedPaneId = useLayoutStore((s) => s.focusedPaneId);
  const addTabToPane = useLayoutStore((s) => s.addTabToPane);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
    const unsub = window.aide.plugin.onChanged(loadPlugins);
    return unsub;
  }, [loadPlugins]);

  const handleOpenTab = (plugin: typeof plugins[number]) => {
    const paneId = focusedPaneId ?? useLayoutStore.getState().focusedPaneId;
    if (!paneId) return;
    addTabToPane(paneId, {
      id: `plugin-${plugin.id}-${Date.now()}`,
      type: 'plugin',
      pluginId: plugin.id,
      title: plugin.name,
    });
  };

  const handleDeleteClick = (name: string) => {
    setDeleteConfirm(name);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await deletePlugin(deleteConfirm);
    setDeleteConfirm(null);
  };

  const activeCount = plugins.filter((p) => p.active).length;
  const localPlugins = plugins.filter((p) => p.scope === 'local');
  const globalPlugins = plugins.filter((p) => p.scope === 'global');

  const renderPlugin = (plugin: typeof plugins[number]) => (
    <div
      key={plugin.id}
      className="flex items-start gap-2 px-2 py-2 rounded bg-aide-surface-elevated"
    >
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs font-mono text-aide-text-primary truncate">
          {plugin.name}
        </span>
        {plugin.description && (
          <span className="text-[10px] text-aide-text-secondary truncate">
            {plugin.description}
          </span>
        )}
        <span className="text-[10px] text-aide-text-tertiary">
          v{plugin.version}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        <button
          onClick={() =>
            plugin.active ? deactivate(plugin.id) : activate(plugin.id)
          }
          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
            plugin.active
              ? 'bg-aide-accent text-black'
              : 'bg-aide-border text-aide-text-secondary hover:text-aide-text-primary'
          }`}
          title={plugin.active ? 'Deactivate plugin' : 'Activate plugin'}
        >
          {plugin.active ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => window.aide.plugin.reload(plugin.id)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-aide-text-tertiary hover:text-aide-text-primary hover:bg-aide-surface-hover transition-colors"
          title="Reload plugin"
        >
          ↻
        </button>
        <button
          onClick={() => handleOpenTab(plugin)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-aide-text-tertiary hover:text-aide-text-primary hover:bg-aide-surface-hover transition-colors"
          title="Open as tab"
        >
          ↗
        </button>
        <button
          onClick={() => handleDeleteClick(plugin.name)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-aide-text-tertiary hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Delete plugin"
        >
          ×
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border">
        <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
          Plugins {plugins.length > 0 ? `(${activeCount}/${plugins.length} active)` : ''}
        </span>
      </div>

      {/* Agent-driven plugin creation hint */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border">
        <p className="text-[10px] font-mono text-aide-text-secondary leading-relaxed">
          Ask your AI agent in the terminal to create plugins.
          <span className="text-aide-text-tertiary block mt-0.5">
            e.g. &ldquo;Make a plugin that formats JSON files&rdquo;
          </span>
        </p>
      </div>

      {/* Plugin list */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-6 text-aide-text-secondary text-xs font-mono">
            Loading plugins...
          </div>
        )}

        {!loading && error && (
          <div className="px-3 py-2 text-[10px] font-mono text-red-400">{error}</div>
        )}

        {!loading && !error && plugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-1 text-aide-text-tertiary text-xs font-mono">
            <span>No plugins installed</span>
            <span className="text-[10px]">Ask an agent to create one</span>
          </div>
        )}

        {!loading && plugins.length > 0 && (
          <div className="flex flex-col gap-3 px-2 py-2">
            {localPlugins.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-aide-text-tertiary font-mono px-1 pb-0.5">
                  Local
                </span>
                {localPlugins.map(renderPlugin)}
              </div>
            )}
            {globalPlugins.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-aide-text-tertiary font-mono px-1 pb-0.5">
                  Global
                </span>
                {globalPlugins.map(renderPlugin)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="bg-aide-surface-elevated border border-aide-border rounded-lg px-4 py-3 flex flex-col gap-3 max-w-[200px] w-full mx-3">
            <span className="text-xs font-mono text-aide-text-primary">
              Delete &ldquo;{deleteConfirm}&rdquo;?
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-aide-border text-aide-text-secondary rounded hover:text-aide-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
