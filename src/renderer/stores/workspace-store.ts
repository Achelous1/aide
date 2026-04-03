import { create } from 'zustand';
import type { WorkspaceInfo } from '../../types/ipc';
import { useTerminalStore } from './terminal-store';
import { useLayoutStore } from './layout-store';
import { usePluginStore } from './plugin-store';

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
  setActive: (id) => {
    const prevId = get().activeWorkspaceId;
    if (id && id !== prevId) {
      // Save current layout before switching
      if (prevId) {
        useLayoutStore.getState().saveWorkspaceLayout(prevId);
      }
      useTerminalStore.getState().switchWorkspace(prevId, id);
      // Restore layout for new workspace
      useLayoutStore.getState().restoreWorkspaceLayout(id);
      // Reload plugins scoped to the new workspace
      usePluginStore.getState().loadPlugins();
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
