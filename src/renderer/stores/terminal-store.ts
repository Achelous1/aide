import { create } from 'zustand';
import type { TerminalTab } from '../../types/ipc';

interface TerminalState {
  /** Tabs for the currently active workspace */
  tabs: TerminalTab[];
  activeTabId: string | null;
  dropdownOpen: boolean;
  /** Per-workspace tab storage (used by WorkspaceNav to display inactive workspace tabs) */
  workspaceTabs: Record<string, { tabs: TerminalTab[]; activeTabId: string | null }>;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  toggleDropdown: () => void;
  updateTabSession: (tabId: string, sessionId: string) => void;
  createDefaultTab: () => string;
  /** Clear the active tabs array (called before restoring a new workspace's session) */
  clearTabs: () => void;
  /** Save current tabs snapshot for a workspace (for WorkspaceNav inactive display) */
  saveWorkspaceTabs: (workspaceId: string) => void;
  /** Save current tabs for the workspace we're leaving (WorkspaceNav cache only — does NOT load new workspace tabs) */
  switchWorkspace: (fromWorkspaceId: string | null, toWorkspaceId: string) => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  dropdownOpen: false,
  workspaceTabs: {},

  addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),

  removeTab: (id) =>
    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== id);
      let nextActiveId = state.activeTabId;
      if (state.activeTabId === id) {
        nextActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      }
      return { tabs: remaining, activeTabId: nextActiveId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  toggleDropdown: () => set((state) => ({ dropdownOpen: !state.dropdownOpen })),

  updateTabSession: (tabId, sessionId) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, sessionId } : t)),
    })),

  createDefaultTab: () => {
    const tabId = crypto.randomUUID();
    const tab: TerminalTab = {
      id: tabId,
      type: 'shell',
      sessionId: '',
      title: '$ shell',
    };
    get().addTab(tab);
    get().setActiveTab(tabId);
    return tabId;
  },

  clearTabs: () => set({ tabs: [], activeTabId: null }),

  saveWorkspaceTabs: (workspaceId) =>
    set((state) => ({
      workspaceTabs: {
        ...state.workspaceTabs,
        [workspaceId]: { tabs: state.tabs, activeTabId: state.activeTabId },
      },
    })),

  switchWorkspace: (fromWorkspaceId) =>
    set((state) => {
      // Only save the departing workspace's tabs into the cache for WorkspaceNav.
      // Do NOT load from cache here — restoreSession is the single source of truth
      // for populating tabs when switching to a new workspace.
      if (!fromWorkspaceId) return state;
      return {
        workspaceTabs: {
          ...state.workspaceTabs,
          [fromWorkspaceId]: { tabs: state.tabs, activeTabId: state.activeTabId },
        },
      };
    }),
}));
