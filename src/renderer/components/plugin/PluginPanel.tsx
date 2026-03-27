import { useEffect, useState } from 'react';
import { usePluginStore } from '../../stores/plugin-store';

export function PluginPanel() {
  const {
    plugins,
    loading,
    generating,
    error,
    generateError,
    loadPlugins,
    activate,
    deactivate,
    deletePlugin,
    generate,
  } = usePluginStore();

  const [pluginName, setPluginName] = useState('');
  const [pluginDesc, setPluginDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleGenerate = async () => {
    const name = pluginName.trim();
    const desc = pluginDesc.trim();
    if (!name || !desc) return;
    await generate(name, desc);
    setPluginName('');
    setPluginDesc('');
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border">
        <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
          Plugins {plugins.length > 0 ? `(${activeCount}/${plugins.length} active)` : ''}
        </span>
      </div>

      {/* Plugin generate form */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border flex flex-col gap-1.5">
        <input
          type="text"
          placeholder="Plugin name..."
          value={pluginName}
          onChange={(e) => setPluginName(e.target.value)}
          className="w-full px-2 py-1 text-xs font-mono bg-aide-surface-elevated border border-aide-border rounded text-aide-text-primary placeholder-aide-text-tertiary focus:outline-none focus:border-aide-accent"
        />
        <input
          type="text"
          placeholder="Describe what the plugin does..."
          value={pluginDesc}
          onChange={(e) => setPluginDesc(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleGenerate();
          }}
          className="w-full px-2 py-1 text-xs font-mono bg-aide-surface-elevated border border-aide-border rounded text-aide-text-primary placeholder-aide-text-tertiary focus:outline-none focus:border-aide-accent"
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !pluginName.trim() || !pluginDesc.trim()}
          className="w-full px-2 py-1 text-xs font-mono bg-aide-accent text-black rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {generating ? 'Generating...' : 'Generate Plugin'}
        </button>
        {generateError && (
          <span className="text-[10px] font-mono text-red-400">{generateError}</span>
        )}
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
            <span className="text-[10px]">Generate one above</span>
          </div>
        )}

        {!loading && plugins.length > 0 && (
          <div className="flex flex-col gap-1 px-2 py-2">
            {plugins.map((plugin) => (
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
                  >
                    {plugin.active ? 'ON' : 'OFF'}
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
            ))}
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
