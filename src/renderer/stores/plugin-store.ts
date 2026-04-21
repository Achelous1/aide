import { create } from 'zustand';
import type { PluginInfo, TerminalTab } from '../../types/ipc';
import { useLayoutStore } from './layout-store';
import { useTerminalStore } from './terminal-store';
import { deactivatingPluginIds } from './plugin-deactivate-guard';

interface PluginState {
  plugins: PluginInfo[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  generateError: string | null;
  loadPlugins: () => Promise<void>;
  activate: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  deletePlugin: (name: string) => Promise<void>;
  generate: (name: string, description: string) => Promise<{ id: string } | null>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  loading: false,
  generating: false,
  error: null,
  generateError: null,

  loadPlugins: async () => {
    set({ loading: true, error: null });
    try {
      const plugins = await window.aide.plugin.list();
      set({ plugins, loading: false });
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
    // Guard: layout-store.removeTabFromPane auto-deactivates plugin tabs when
    // they are closed directly (× click, ⌘W). That path calls back into
    // window.aide.plugin.deactivate, which would recurse here. By marking
    // the id as in-flight, we tell the layout-store hook to skip its own
    // deactivate side effect while this function owns the lifecycle.
    deactivatingPluginIds.add(id);
    try {
      await window.aide.plugin.deactivate(id);
      const plugins = await window.aide.plugin.list();
      set({ plugins });
      // Remove plugin tab from all panes
      const layout = useLayoutStore.getState();
      const allPanes = layout.getAllPanes();
      for (const pane of allPanes) {
        const pluginTab = pane.tabs.find(t => t.type === 'plugin' && t.pluginId === id);
        if (pluginTab) {
          layout.removeTabFromPane(pane.id, pluginTab.id);
          useTerminalStore.getState().removeTab(pluginTab.id);
        }
      }
      // Persist plugin active state immediately — don't rely on beforeunload
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
    set({ plugins: get().plugins.filter((p) => p.name !== name) });
  },

  generate: async (name: string, description: string) => {
    set({ generating: true, generateError: null });
    try {
      const spec = await window.aide.plugin.generate(name, description);
      // Reload the plugin list after generation
      const plugins = await window.aide.plugin.list();
      set({ plugins, generating: false });
      return { id: spec.id };
    } catch (e) {
      set({
        generating: false,
        generateError: e instanceof Error ? e.message : 'Failed to generate plugin',
      });
      return null;
    }
  },
}));
