import { create } from 'zustand';
import type { WorkspaceInfo } from '../../types/ipc';

interface WorkspaceState {
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string | null;
  recentProjects: WorkspaceInfo[];
  navExpanded: boolean;
  addWorkspace: (workspace: WorkspaceInfo) => void;
  removeWorkspace: (id: string) => void;
  setActive: (id: string | null) => void;
  toggleNav: () => void;
  loadRecent: (projects: WorkspaceInfo[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  recentProjects: [],
  navExpanded: true,
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  removeWorkspace: (id) =>
    set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) })),
  setActive: (id) => set({ activeWorkspaceId: id }),
  toggleNav: () => set((state) => ({ navExpanded: !state.navExpanded })),
  loadRecent: (projects) => set({ recentProjects: projects.slice(0, 5) }),
}));
