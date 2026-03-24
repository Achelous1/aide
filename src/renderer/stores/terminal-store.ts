import { create } from 'zustand';
import type { TerminalTab } from '../../types/ipc';

interface TerminalState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  dropdownOpen: boolean;
  addTab: (tab: TerminalTab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;
  toggleDropdown: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  tabs: [],
  activeTabId: null,
  dropdownOpen: false,
  addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
  removeTab: (id) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id !== id),
      activeTabId: state.activeTabId === id ? null : state.activeTabId,
    })),
  setActiveTab: (id) => set({ activeTabId: id }),
  toggleDropdown: () => set((state) => ({ dropdownOpen: !state.dropdownOpen })),
}));
