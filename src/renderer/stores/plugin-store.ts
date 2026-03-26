import { create } from 'zustand';
import type { PluginInfo } from '../../types/ipc';

interface PluginState {
  plugins: PluginInfo[];
  loading: boolean;
  loadPlugins: () => Promise<void>;
  activate: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  deletePlugin: (name: string) => Promise<void>;
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: [],
  loading: false,

  loadPlugins: async () => {
    set({ loading: true });
    try {
      const plugins = await window.aide.plugin.list();
      set({ plugins, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  activate: async (id: string) => {
    await window.aide.plugin.activate(id);
    set({
      plugins: get().plugins.map((p) =>
        p.id === id ? { ...p, active: true } : p
      ),
    });
  },

  deactivate: async (id: string) => {
    await window.aide.plugin.deactivate(id);
    set({
      plugins: get().plugins.map((p) =>
        p.id === id ? { ...p, active: false } : p
      ),
    });
  },

  deletePlugin: async (name: string) => {
    await window.aide.plugin.delete(name);
    set({ plugins: get().plugins.filter((p) => p.name !== name) });
  },
}));
