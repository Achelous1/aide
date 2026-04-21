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
  /** Currently selected file path in the file explorer */
  selectedFilePath: string | null;
  addWorkspace: (workspace: WorkspaceInfo) => void;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActive: (id: string | null) => void;
  toggleNav: () => void;
  setSidePanelTab: (tab: SidePanelTab) => void;
  setSelectedFilePath: (path: string | null) => void;
  loadRecent: (projects: WorkspaceInfo[]) => void;
  loadWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  recentProjects: [],
  navExpanded: true,
  sidePanelTab: 'files',
  selectedFilePath: null,
  setSidePanelTab: (tab) => set({ sidePanelTab: tab ?? 'files' }),
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
  addWorkspace: (workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  removeWorkspace: (id) =>
    set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) })),
  renameWorkspace: (id, name) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
    })),
  setActive: async (id) => {
    const prevId = get().activeWorkspaceId;
    if (id && id !== prevId) {
      // 1. Save departing workspace state (to disk and in-memory cache). PTYs are NOT killed.
      if (prevId) {
        await useLayoutStore.getState().saveSession(prevId);
        useLayoutStore.getState().saveLayoutToCache(prevId);
        // Save departing workspace tabs into workspaceTabs cache for WorkspaceNav display
        useTerminalStore.getState().switchWorkspace(prevId, id);
      }

      // 2. Tell main about the new workspace and seed the plugin registry
      //    BEFORE restoreSession runs. restoreSession calls
      //    window.aide.plugin.activate(id) for every entry in
      //    session.activePlugins, which needs registry.get(id) to succeed.
      //    We call window.aide.plugin.list() directly (not via
      //    usePluginStore.loadPlugins) so the renderer store does not flash
      //    "0/N ACTIVE" between this seed call and the post-restore refresh.
      const workspace = get().workspaces.find((w) => w.id === id);
      if (workspace) {
        await window.aide.workspace.open(workspace.path);
      }
      await window.aide.plugin.list();
      invalidateSettingsCache();

      // 3. Try in-memory layout cache first; fall back to disk restore on first visit.
      const loaded = useLayoutStore.getState().loadLayoutFromCache(id);
      if (!loaded) {
        // First visit to this workspace — spawn PTYs from disk session.
        await useLayoutStore.getState().restoreSession(id);
        // Update workspaceTabs cache with the freshly spawned tabs.
        useTerminalStore.getState().saveWorkspaceTabs(id);
      } else {
        // Layout was loaded from in-memory cache. The workspaceTabs cache already has
        // the tabs snapshot from the previous switchWorkspace save — restore it into
        // the active tabs list so terminal-store.tabs stays in sync.
        const cached = useTerminalStore.getState().workspaceTabs[id];
        if (cached) {
          useTerminalStore.getState().clearTabs();
          for (const tab of cached.tabs) {
            useTerminalStore.getState().addTab(tab);
          }
        }
      }

      // 4. Single renderer-store refresh at the end so PluginPanel shows the
      //    final active state in one commit. Covers both paths — the cache
      //    branch also needs this because main-side plugin state may have
      //    drifted (file watcher events, external toggles) since the last
      //    time the renderer viewed this workspace.
      await usePluginStore.getState().loadPlugins();
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

    // Auto-open the most recently accessed workspace on app launch.
    // Only fires when no workspace is active yet (i.e. fresh boot, not after
    // user has navigated away). The recent list is ordered newest-first, and
    // we verify the workspace still exists in the workspaces list before
    // activating to avoid resurrecting a deleted project.
    if (!get().activeWorkspaceId && recent.length > 0) {
      const mostRecent = recent[0];
      const stillExists = workspaces.some((w) => w.id === mostRecent.id);
      if (stillExists) {
        await get().setActive(mostRecent.id);
      }
    }
  },
}));
