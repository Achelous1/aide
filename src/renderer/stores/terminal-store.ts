import { create } from 'zustand';
import type { TerminalTab } from '../../types/ipc';

interface TerminalState {
  /** Tabs for the currently active workspace */
  tabs: TerminalTab[];
  activeTabId: string | null;
  dropdownOpen: boolean;
  /** Per-workspace tab storage */
  workspaceTabs: Record<string, { tabs: TerminalTab[]; activeTabId: string | null }>;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  toggleDropdown: () => void;
  updateTabSession: (tabId: string, sessionId: string) => void;
  createDefaultTab: () => string;
  /** Save current tabs for a workspace and load tabs for another */
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

  switchWorkspace: (fromWorkspaceId, toWorkspaceId) =>
    set((state) => {
      const updated = { ...state.workspaceTabs };

      // Save current tabs for the workspace we're leaving
      if (fromWorkspaceId) {
        updated[fromWorkspaceId] = {
          tabs: state.tabs,
          activeTabId: state.activeTabId,
        };
      }

      // Load tabs for the workspace we're switching to
      const saved = updated[toWorkspaceId];

      return {
        workspaceTabs: updated,
        tabs: saved?.tabs ?? [],
        activeTabId: saved?.activeTabId ?? null,
      };
    }),
}));
