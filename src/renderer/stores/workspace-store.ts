import { create } from 'zustand';
import type { WorkspaceInfo } from '../../types/ipc';
import { useTerminalStore } from './terminal-store';
import { useLayoutStore } from './layout-store';
import { usePluginStore } from './plugin-store';
import { invalidateSettingsCache } from '../lib/event-bus';

type SidePanelTab = 'files' | 'plugins';

interface WorkspaceState {
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string | null;
  recentProjects: WorkspaceInfo[];
  navExpanded: boolean;
  sidePanelTab: SidePanelTab;
  addWorkspace: (workspace: WorkspaceInfo) => void;
  removeWorkspace: (id: string) => void;
  setActive: (id: string | null) => void;
  toggleNav: () => void;
  setSidePanelTab: (tab: SidePanelTab) => void;
  loadRecent: (projects: WorkspaceInfo[]) => void;
  loadWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  recentProjects: [],
  navExpanded: true,
  sidePanelTab: 'files',
  setSidePanelTab: (tab) => set({ sidePanelTab: tab }),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  removeWorkspace: (id) =>
    set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) })),
  setActive: async (id) => {
    const prevId = get().activeWorkspaceId;
    if (id && id !== prevId) {
      // Save current session before switching
      if (prevId) {
        await useLayoutStore.getState().saveSession(prevId);
      }
      useTerminalStore.getState().switchWorkspace(prevId, id);
      // Restore session for new workspace
      await useLayoutStore.getState().restoreSession(id);
      // Notify main process so getActiveWorkspacePath() is updated before loadPlugins()
      const workspace = get().workspaces.find((w) => w.id === id);
      if (workspace) {
        await window.aide.workspace.open(workspace.path);
      }
      usePluginStore.getState().loadPlugins();
      invalidateSettingsCache();
    }
    set({ activeWorkspaceId: id });
  },
  toggleNav: () => set((state) => ({ navExpanded: !state.navExpanded })),
  loadRecent: (projects) => set({ recentProjects: projects.slice(0, 5) }),
  loadWorkspaces: async () => {
    const [workspaces, recent] = await Promise.all([
      window.aide.workspace.list(),
      window.aide.workspace.recent(),
    ]);
    set({ workspaces, recentProjects: recent.slice(0, 5) });
  },
}));
