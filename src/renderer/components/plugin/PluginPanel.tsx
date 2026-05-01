import { useEffect, useMemo, useRef, useState } from 'react';
import { usePluginStore, type PublishConflict } from '../../stores/plugin-store';
import { useLayoutStore } from '../../stores/layout-store';
import type { PluginInfo } from '../../../types/ipc';
import type { SyncStatus } from '../../../types/plugin-registry';
import { PluginStatusBadge } from './registry/PluginStatusBadge';
import { RegistryBrowser } from './registry/RegistryBrowser';
import { ForkAsNewPluginDialog } from './registry/dialogs/ForkAsNewPluginDialog';
import { UpdateConfirmDialog } from './registry/dialogs/UpdateConfirmDialog';
import { PublishConflictDialog } from './registry/dialogs/PublishConflictDialog';

const PluginIconStub = () => (
  <div className="grid grid-cols-2 grid-rows-2 gap-0.5 shrink-0" style={{ width: 22, height: 22 }}>
    <span className="bg-smalti-cyan rounded-[2px]" />
    <span className="bg-aide-text-tertiary/50 rounded-[2px]" />
    <span className="bg-aide-text-tertiary/50 rounded-[2px]" />
    <span className="bg-smalti-gold rounded-[2px]" />
  </div>
);

interface ActionMenuItem {
  key: string;
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

function ActionMenu({
  items,
  onClose,
}: {
  items: ActionMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      data-testid="plugin-action-menu"
      className="absolute right-0 top-6 z-20 bg-aide-surface-elevated border border-aide-border rounded-md shadow-xl py-1 min-w-[180px]"
    >
      {items.map((item) => (
        <button
          key={item.key}
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
            item.danger
              ? 'text-smalti-crimson hover:bg-smalti-crimson/10'
              : 'text-aide-text-primary hover:bg-aide-surface'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PluginPanel() {
  const {
    plugins,
    loading,
    error,
    loadPlugins,
    activate,
    deletePlugin,
    registryDiffs,
    refreshRegistryDiffs,
    applyUpdate,
    forkAsNew,
    publish,
    importFromRegistry,
  } = usePluginStore();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [forkTarget, setForkTarget] = useState<PluginInfo | null>(null);
  const [updateTarget, setUpdateTarget] = useState<PluginInfo | null>(null);
  const [publishConflict, setPublishConflict] =
    useState<{ plugin: PluginInfo; conflict: PublishConflict } | null>(null);

  useEffect(() => {
    loadPlugins();
    const unsub = window.aide.plugin.onChanged(() => {
      loadPlugins();
      refreshRegistryDiffs();
    });
    return unsub;
  }, [loadPlugins, refreshRegistryDiffs]);

  const installedNames = useMemo(
    () => new Set(plugins.map((p) => p.name)),
    [plugins]
  );

  const updateAvailableIds = useMemo(() => {
    const set = new Set<string>();
    for (const diff of Object.values(registryDiffs)) {
      if (diff && diff.status === 'update-available') set.add(diff.registryId);
    }
    return set;
  }, [registryDiffs]);

  const statusFor = (plugin: PluginInfo): SyncStatus => {
    const diff = registryDiffs[plugin.name];
    return diff?.status ?? 'unknown';
  };

  const handleOpenTab = async (plugin: PluginInfo) => {
    const allPanes = useLayoutStore.getState().getAllPanes();
    const existing = allPanes
      .flatMap((pane) => pane.tabs.map((tab) => ({ paneId: pane.id, tab })))
      .find(({ tab }) => tab.type === 'plugin' && tab.pluginId === plugin.id);
    if (existing) {
      useLayoutStore.getState().setActiveTab(existing.paneId, existing.tab.id);
      return;
    }
    await activate(plugin.id);
  };

  const handleUpdateClick = async (plugin: PluginInfo) => {
    const diff = registryDiffs[plugin.name];
    // If the workspace has local modifications, show confirm dialog first.
    if (diff && diff.status === 'locally-modified') {
      setUpdateTarget(plugin);
      return;
    }
    try {
      await applyUpdate(plugin.name);
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const handlePublishClick = async (plugin: PluginInfo) => {
    try {
      const conflict = await publish(plugin.name, true);
      if (conflict && conflict.reason === 'pull-latest-first') {
        setPublishConflict({ plugin, conflict });
      }
    } catch (e) {
      console.error('Publish failed', e);
    }
  };

  const buildActionItems = (plugin: PluginInfo): ActionMenuItem[] => {
    const status = statusFor(plugin);
    const diff = registryDiffs[plugin.name];
    const items: ActionMenuItem[] = [];

    if (status === 'update-available') {
      items.push({
        key: 'update',
        label: diff?.latestVersion ? `Update to ${diff.latestVersion}` : 'Update',
        onSelect: () => handleUpdateClick(plugin),
      });
      items.push({
        key: 'fork',
        label: 'Fork as new plugin',
        onSelect: () => setForkTarget(plugin),
      });
    } else if (status === 'locally-modified') {
      items.push({
        key: 'update',
        label: 'Update to latest (discard local)',
        onSelect: () => handleUpdateClick(plugin),
      });
      items.push({
        key: 'fork',
        label: 'Fork as new plugin',
        onSelect: () => setForkTarget(plugin),
      });
    }

    items.push({
      key: 'publish',
      label:
        status === 'locally-modified'
          ? 'Publish to registry (bump patch)'
          : 'Publish to registry',
      onSelect: () => handlePublishClick(plugin),
    });

    items.push({
      key: 'remove',
      label: 'Remove',
      danger: true,
      onSelect: () => setDeleteConfirm(plugin.name),
    });

    return items;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const target = plugins.find((p) => p.name === deleteConfirm);
    const diff = target ? registryDiffs[target.name] : null;
    try {
      await deletePlugin(deleteConfirm);
      // Best-effort: also remove from registry if we can identify the source id.
      if (diff?.registryId) {
        try {
          await window.aide.plugin.registry.remove(diff.registryId);
        } catch {
          /* registry remove failures are non-fatal */
        }
      }
    } finally {
      setDeleteConfirm(null);
    }
  };

  const renderPlugin = (plugin: PluginInfo) => {
    const status = statusFor(plugin);
    const diff = registryDiffs[plugin.name];
    return (
      <div
        key={plugin.id}
        data-testid={`plugin-row-${plugin.id}`}
        className="relative flex items-start gap-2 px-2 py-2 rounded hover:bg-aide-surface-elevated transition-colors"
      >
        <PluginIconStub />
        <button
          onClick={() => handleOpenTab(plugin)}
          className="flex flex-col flex-1 min-w-0 text-left"
        >
          <span className="text-sm font-mono text-aide-text-primary truncate">
            {plugin.name}
          </span>
          {plugin.description && (
            <span className="text-[11px] text-aide-text-secondary leading-snug line-clamp-2 font-sans">
              {plugin.description}
            </span>
          )}
        </button>
        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
          <PluginStatusBadge
            status={status}
            latestVersion={diff?.latestVersion ?? undefined}
          />
          <button
            aria-label={`Plugin actions for ${plugin.name}`}
            data-testid={`plugin-actions-${plugin.id}`}
            onClick={() =>
              setOpenMenuFor((cur) => (cur === plugin.id ? null : plugin.id))
            }
            className="text-aide-text-tertiary hover:text-aide-text-primary px-1 transition-colors"
          >
            ···
          </button>
          {openMenuFor === plugin.id && (
            <ActionMenu
              items={buildActionItems(plugin)}
              onClose={() => setOpenMenuFor(null)}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-aide-border">
        <span className="text-[10px] uppercase tracking-widest text-aide-text-tertiary font-mono">
          Plugins
        </span>
        <span className="text-[10px] font-mono text-aide-text-secondary bg-aide-surface-elevated rounded px-1.5 py-0.5">
          {plugins.length}
        </span>
      </div>

      {/* Add from registry button */}
      <div className="px-3 py-2 shrink-0 border-b border-aide-border">
        <button
          onClick={() => setBrowserOpen(true)}
          data-testid="add-from-registry"
          className="w-full px-3 py-2 text-xs font-mono rounded bg-aide-accent text-aide-background hover:opacity-90 transition-opacity"
        >
          + Add from registry
        </button>
      </div>

      {/* Plugin list */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-6 text-aide-text-secondary text-xs font-mono">
            Loading plugins...
          </div>
        )}

        {!loading && error && (
          <div className="px-3 py-2 text-[10px] font-mono text-smalti-crimson">{error}</div>
        )}

        {!loading && !error && plugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-1 text-aide-text-tertiary text-xs font-mono">
            <span>No plugins installed</span>
            <span className="text-[10px]">Use + Add from registry to install one</span>
          </div>
        )}

        {!loading && plugins.length > 0 && (
          <div className="flex flex-col gap-1 px-2 py-2">
            {plugins.map(renderPlugin)}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="bg-aide-surface-elevated border border-aide-border rounded-lg px-4 py-3 flex flex-col gap-3 max-w-[240px] w-full mx-3">
            <span className="text-xs font-mono text-aide-text-primary">
              Delete &ldquo;{deleteConfirm}&rdquo;?
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-2 py-1 text-[10px] font-mono bg-smalti-crimson text-white rounded hover:opacity-90 transition-opacity"
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

      {/* Registry browser modal */}
      <RegistryBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        installedNames={installedNames}
        updateAvailableIds={updateAvailableIds}
        onImport={async (registryId) => {
          try {
            await importFromRegistry(registryId);
          } catch (e) {
            console.error('Import failed', e);
          }
        }}
      />

      {/* Fork dialog */}
      {forkTarget && (
        <ForkAsNewPluginDialog
          open
          onClose={() => setForkTarget(null)}
          originalPluginName={forkTarget.name}
          originalPluginId={forkTarget.id}
          onConfirm={async (opts) => {
            await forkAsNew(forkTarget.name, {
              newName: opts.newName,
              newDescription: opts.newDescription,
              restoreOriginal: opts.restoreOriginal,
            });
          }}
        />
      )}

      {/* Update confirm dialog */}
      {updateTarget && (
        <UpdateConfirmDialog
          open
          onClose={() => setUpdateTarget(null)}
          pluginName={updateTarget.name}
          latestVersion={registryDiffs[updateTarget.name]?.latestVersion ?? '?'}
          modifiedFiles={[]}
          onConfirm={async () => {
            await applyUpdate(updateTarget.name);
          }}
          onForkInstead={() => {
            const t = updateTarget;
            setUpdateTarget(null);
            setForkTarget(t);
          }}
        />
      )}

      {/* Publish conflict dialog */}
      {publishConflict && (
        <PublishConflictDialog
          open
          onClose={() => setPublishConflict(null)}
          pluginName={publishConflict.plugin.name}
          workspaceVersion={
            publishConflict.conflict.workspaceVersion ??
            publishConflict.plugin.version
          }
          registryVersion={publishConflict.conflict.registryVersion ?? '?'}
          onPullLatest={async () => {
            await applyUpdate(publishConflict.plugin.name);
          }}
        />
      )}
    </div>
  );
}
