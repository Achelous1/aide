import { create } from 'zustand';
import type { PluginInfo, TerminalTab } from '../../types/ipc';
import type { RegistryDiff, RegistrySummary } from '../../types/plugin-registry';
import { useLayoutStore } from './layout-store';
import { useTerminalStore } from './terminal-store';
import { deactivatingPluginIds } from './plugin-deactivate-guard';

export interface PublishConflict {
  reason: 'pull-latest-first' | string;
  workspaceVersion?: string;
  registryVersion?: string;
}

interface PluginState {
  plugins: PluginInfo[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  generateError: string | null;

  // Phase 3: registry state
  registryDiffs: Record<string, RegistryDiff | null>;
  registrySummaries: RegistrySummary[];
  registryLoading: boolean;

  loadPlugins: () => Promise<void>;
  activate: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  deletePlugin: (name: string) => Promise<void>;
  generate: (name: string, description: string) => Promise<{ id: string } | null>;

  refreshRegistryDiffs: () => Promise<void>;
  refreshRegistrySummaries: () => Promise<void>;

  applyUpdate: (pluginName: string) => Promise<void>;
  forkAsNew: (
    originalName: string,
    opts: { newName: string; newDescription?: string; restoreOriginal: boolean }
  ) => Promise<void>;
  /**
   * Publish workspace plugin to global registry. Resolves to a PublishConflict
   * descriptor on conflict (e.g. registry has newer version) so the UI can
   * surface PublishConflictDialog. Resolves to null on success.
   */
  publish: (pluginName: string, bumpPatch?: boolean) => Promise<PublishConflict | null>;
  importFromRegistry: (registryId: string, targetName?: string) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  loading: false,
  generating: false,
  error: null,
  generateError: null,

  registryDiffs: {},
  registrySummaries: [],
  registryLoading: false,

  loadPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const plugins = await window.aide.plugin.list();
      set({ plugins, loading: false });
      // Best-effort registry diff refresh after a list reload — non-blocking.
      void get().refreshRegistryDiffs();
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load plugins' });
    }
  },

  activate: async (id: string) => {
    try {
      await window.aide.plugin.activate(id);
      const plugins = await window.aide.plugin.list();
      set({ plugins });
      // Check for existing plugin tab — avoid duplicates
      const layout = useLayoutStore.getState();
      const allPanes = layout.getAllPanes();
      const alreadyOpen = allPanes.some(p => p.tabs.some(t => t.type === 'plugin' && t.pluginId === id));
      if (!alreadyOpen) {
        const plugin = get().plugins.find(p => p.id === id);
        if (plugin) {
          const tab: TerminalTab = {
            id: crypto.randomUUID(),
            type: 'plugin',
            pluginId: id,
            title: plugin.name,
          };
          useTerminalStore.getState().addTab(tab);
          const pane = layout.getFocusedPane();
          if (pane) {
            layout.addTabToPane(pane.id, tab);
          }
        }
      }
      // Persist plugin active state immediately — don't rely on beforeunload
      const { useWorkspaceStore } = await import('./workspace-store');
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (wsId) {
        await useLayoutStore.getState().saveSession(wsId);
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to activate plugin' });
    }
  },

  deactivate: async (id: string) => {
    deactivatingPluginIds.add(id);
    try {
      await window.aide.plugin.deactivate(id);
      const plugins = await window.aide.plugin.list();
      set({ plugins });
      const layout = useLayoutStore.getState();
      const allPanes = layout.getAllPanes();
      for (const pane of allPanes) {
        const pluginTab = pane.tabs.find(t => t.type === 'plugin' && t.pluginId === id);
        if (pluginTab) {
          layout.removeTabFromPane(pane.id, pluginTab.id);
          useTerminalStore.getState().removeTab(pluginTab.id);
        }
      }
      const { useWorkspaceStore } = await import('./workspace-store');
      const wsId = useWorkspaceStore.getState().activeWorkspaceId;
      if (wsId) {
        await useLayoutStore.getState().saveSession(wsId);
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to deactivate plugin' });
    } finally {
      deactivatingPluginIds.delete(id);
    }
  },

  deletePlugin: async (name: string) => {
    await window.aide.plugin.delete(name);
    set({
      plugins: get().plugins.filter((p) => p.name !== name),
      registryDiffs: Object.fromEntries(
        Object.entries(get().registryDiffs).filter(([k]) => k !== name)
      ),
    });
  },

  generate: async (name: string, description: string) => {
    set({ generating: true, generateError: null });
    try {
      const spec = await window.aide.plugin.generate(name, description);
      const plugins = await window.aide.plugin.list();
      set({ plugins, generating: false });
      void get().refreshRegistryDiffs();
      return { id: spec.id };
    } catch (e) {
      set({
        generating: false,
        generateError: e instanceof Error ? e.message : 'Failed to generate plugin',
      });
      return null;
    }
  },

  refreshRegistryDiffs: async () => {
    const plugins = get().plugins;
    if (plugins.length === 0) {
      set({ registryDiffs: {} });
      return;
    }
    try {
      const entries = await Promise.all(
        plugins.map(async (p) => {
          try {
            const diff = await window.aide.plugin.registry.diff(p.name);
            return [p.name, diff] as const;
          } catch {
            return [p.name, null] as const;
          }
        })
      );
      const diffs: Record<string, RegistryDiff | null> = {};
      for (const [name, diff] of entries) diffs[name] = diff;
      set({ registryDiffs: diffs });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load registry diffs' });
    }
  },

  refreshRegistrySummaries: async () => {
    set({ registryLoading: true });
    try {
      const summaries = await window.aide.plugin.registry.list();
      set({ registrySummaries: summaries, registryLoading: false });
    } catch (e) {
      set({
        registryLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load registry summaries',
      });
    }
  },

  applyUpdate: async (pluginName: string) => {
    const diff = get().registryDiffs[pluginName];
    if (!diff) throw new Error(`No registry diff for "${pluginName}"`);
    const result = await window.aide.plugin.registry.pull(
      diff.registryId,
      diff.latestVersion ?? undefined,
      pluginName
    );
    if (!result.ok) {
      throw new Error(`Update failed: ${result.reason}`);
    }
    await get().loadPlugins();
  },

  forkAsNew: async (originalName, opts) => {
    const diff = get().registryDiffs[originalName];
    if (!diff) throw new Error(`No registry diff for "${originalName}"`);
    // Pull the original (registry version) into a new workspace plugin name.
    const pull = await window.aide.plugin.registry.pull(
      diff.registryId,
      diff.installedVersion ?? diff.latestVersion ?? undefined,
      opts.newName
    );
    if (!pull.ok) {
      throw new Error(`Fork failed: ${pull.reason}`);
    }
    if (opts.restoreOriginal) {
      // Restoring original to upstream = re-pull latest over the original name.
      await window.aide.plugin.registry.pull(
        diff.registryId,
        diff.latestVersion ?? undefined,
        originalName
      );
    }
    await get().loadPlugins();
  },

  publish: async (pluginName, bumpPatch = true) => {
    try {
      const result = await window.aide.plugin.registry.push(pluginName, { bumpPatch });
      // Backend may return { ok:false, reason:'pull-latest-first', ... } as a structured error.
      if (result && typeof result === 'object' && 'ok' in result && (result as { ok: boolean }).ok === false) {
        const r = result as PublishConflict & { ok: false };
        await get().refreshRegistryDiffs();
        return r;
      }
      await get().loadPlugins();
      return null;
    } catch (e) {
      // Surface as conflict if the backend throws with a recognizable reason.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('pull-latest-first') || msg.toLowerCase().includes('pull latest')) {
        const diff = get().registryDiffs[pluginName];
        return {
          reason: 'pull-latest-first',
          workspaceVersion: diff?.installedVersion ?? undefined,
          registryVersion: diff?.latestVersion ?? undefined,
        };
      }
      throw e;
    }
  },

  importFromRegistry: async (registryId, targetName) => {
    const result = await window.aide.plugin.registry.pull(registryId, undefined, targetName);
    if (!result.ok) {
      throw new Error(`Import failed: ${result.reason}`);
    }
    await get().loadPlugins();
  },
}));
