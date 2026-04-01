import { create } from 'zustand';
import type { TerminalTab, Pane, SplitLayout, LayoutNode } from '../../types/ipc';
import { isSplitLayout } from '../../types/ipc';

let paneCounter = 0;
let splitCounter = 0;

function newPaneId(): string {
  return `pane-${++paneCounter}`;
}

function newSplitId(): string {
  return `split-${++splitCounter}`;
}

export function createPane(tabs: TerminalTab[] = [], activeTabId: string | null = null): Pane {
  return { id: newPaneId(), tabs, activeTabId };
}

// --- Tree helpers ---

function findPane(node: LayoutNode, paneId: string): Pane | null {
  if (isSplitLayout(node)) {
    for (const child of node.children) {
      const found = findPane(child, paneId);
      if (found) return found;
    }
    return null;
  }
  return node.id === paneId ? node : null;
}

function findParentSplit(
  node: LayoutNode,
  targetId: string,
): { parent: SplitLayout; index: number } | null {
  if (isSplitLayout(node)) {
    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].id === targetId) {
        return { parent: node, index: i };
      }
      const found = findParentSplit(node.children[i], targetId);
      if (found) return found;
    }
  }
  return null;
}

/** Count max children in any split of a given direction */
function maxChildrenInDirection(node: LayoutNode, dir: 'horizontal' | 'vertical'): number {
  if (!isSplitLayout(node)) return 1;
  let max = node.direction === dir ? node.children.length : 1;
  for (const child of node.children) {
    max = Math.max(max, maxChildrenInDirection(child, dir));
  }
  return max;
}

/** Deep-clone a layout node (plain JSON, no cycles) */
function cloneNode<T extends LayoutNode>(node: T): T {
  return JSON.parse(JSON.stringify(node));
}

/** Remove a child from its parent split. Returns simplified tree if split has 1 child left. */
function removeChild(root: LayoutNode, childId: string): LayoutNode {
  const result = findParentSplit(root, childId);
  if (!result) return root;

  const { parent, index } = result;
  parent.children.splice(index, 1);
  parent.sizes.splice(index, 1);

  // Redistribute sizes
  const total = parent.sizes.reduce((a, b) => a + b, 0);
  if (total > 0) {
    parent.sizes = parent.sizes.map((s) => (s / total) * 100);
  }

  // If only one child remains, replace split with that child
  if (parent.children.length === 1) {
    const surviving = parent.children[0];
    if (root.id === parent.id) {
      return surviving;
    }
    // Replace parent in grandparent
    const grandparent = findParentSplit(root, parent.id);
    if (grandparent) {
      grandparent.parent.children[grandparent.index] = surviving;
    }
  }

  return root;
}

// --- Store ---

interface LayoutState {
  layout: LayoutNode;
  focusedPaneId: string | null;

  // Pane operations
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  closePaneAndMergeTabs: (paneId: string) => void;
  setFocusedPane: (paneId: string) => void;

  // Tab operations
  addTabToPane: (paneId: string, tab: TerminalTab) => void;
  removeTabFromPane: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  moveTab: (fromPaneId: string, toPaneId: string, tabId: string) => void;
  reorderTab: (paneId: string, fromIndex: number, toIndex: number) => void;

  // Resize
  resizePanes: (splitId: string, sizes: number[]) => void;

  // Layout reset
  resetLayout: (initialTabs?: TerminalTab[]) => void;

  // Workspace layout persistence
  saveWorkspaceLayout: (workspaceId: string) => void;
  restoreWorkspaceLayout: (workspaceId: string) => void;

  // Helpers
  getAllPanes: () => Pane[];
  getFocusedPane: () => Pane | null;
}

// Per-workspace layout cache (in-memory, survives workspace switches)
const workspaceLayouts = new Map<string, { layout: LayoutNode; focusedPaneId: string | null }>();

function collectPanes(node: LayoutNode): Pane[] {
  if (isSplitLayout(node)) {
    return node.children.flatMap(collectPanes);
  }
  return [node];
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  layout: createPane(),
  focusedPaneId: null,

  splitPane: (paneId, direction) => {
    set((state) => {
      // Enforce max 3 horizontal, max 2 vertical (3×2 grid limit)
      const maxH = maxChildrenInDirection(state.layout, 'horizontal');
      const maxV = maxChildrenInDirection(state.layout, 'vertical');
      if (direction === 'horizontal' && maxH >= 3) return state;
      if (direction === 'vertical' && maxV >= 2) return state;

      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;

      const newPane = createPane();

      // If the active tab exists, move it to the new pane
      if (pane.activeTabId && pane.tabs.length > 1) {
        const tabIndex = pane.tabs.findIndex((t) => t.id === pane.activeTabId);
        if (tabIndex >= 0) {
          const [movedTab] = pane.tabs.splice(tabIndex, 1);
          newPane.tabs.push(movedTab);
          newPane.activeTabId = movedTab.id;
          pane.activeTabId = pane.tabs[0]?.id ?? null;
        }
      }

      const newSplit: SplitLayout = {
        id: newSplitId(),
        direction,
        children: [{ ...pane }, newPane],
        sizes: [50, 50],
      };

      // Replace pane with split in tree
      if (layout.id === paneId) {
        return { layout: newSplit, focusedPaneId: newPane.id };
      }

      const parentInfo = findParentSplit(layout, paneId);
      if (parentInfo) {
        parentInfo.parent.children[parentInfo.index] = newSplit;
      }

      return { layout, focusedPaneId: newPane.id };
    });
  },

  closePane: (paneId) => {
    set((state) => {
      const allPanes = collectPanes(state.layout);
      if (allPanes.length <= 1) return state; // Don't close last pane

      const layout = cloneNode(state.layout);
      const newLayout = removeChild(layout, paneId);

      const remainingPanes = collectPanes(newLayout);
      const newFocused = remainingPanes[0]?.id ?? null;

      return { layout: newLayout, focusedPaneId: newFocused };
    });
  },

  closePaneAndMergeTabs: (paneId) => {
    set((state) => {
      const allPanes = collectPanes(state.layout);
      if (allPanes.length <= 1) return state;

      const layout = cloneNode(state.layout);
      const closingPane = findPane(layout, paneId);
      if (!closingPane) return state;

      // Find sibling pane to receive tabs
      const parentInfo = findParentSplit(layout, paneId);
      if (!parentInfo) return state;

      const { parent, index } = parentInfo;
      // Pick sibling: prefer left/above (index-1), fallback to right/below (index+1)
      const siblingIndex = index > 0 ? index - 1 : index + 1;
      const siblingNode = parent.children[siblingIndex];
      if (!siblingNode) return state;

      // Find the first pane in the sibling subtree to receive tabs
      const siblingPanes = collectPanes(siblingNode);
      const targetPane = siblingPanes[0];
      if (!targetPane) return state;

      // Merge tabs from closing pane into target
      for (const tab of closingPane.tabs) {
        targetPane.tabs.push(tab);
      }
      if (closingPane.tabs.length > 0) {
        targetPane.activeTabId = closingPane.tabs[0].id;
      }

      // Remove the closing pane from tree
      const newLayout = removeChild(layout, paneId);
      return { layout: newLayout, focusedPaneId: targetPane.id };
    });
  },

  setFocusedPane: (paneId) => set({ focusedPaneId: paneId }),

  addTabToPane: (paneId, tab) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;

      pane.tabs.push(tab);
      pane.activeTabId = tab.id;
      return { layout };
    });
  },

  removeTabFromPane: (paneId, tabId) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;

      const index = pane.tabs.findIndex((t) => t.id === tabId);
      if (index < 0) return state;

      pane.tabs.splice(index, 1);

      if (pane.activeTabId === tabId) {
        pane.activeTabId = pane.tabs[Math.min(index, pane.tabs.length - 1)]?.id ?? null;
      }

      // If pane has no tabs, close it (unless it's the last pane)
      if (pane.tabs.length === 0) {
        const allPanes = collectPanes(layout);
        if (allPanes.length > 1) {
          const newLayout = removeChild(layout, paneId);
          const remaining = collectPanes(newLayout);
          return { layout: newLayout, focusedPaneId: remaining[0]?.id ?? null };
        }
      }

      return { layout };
    });
  },

  setActiveTab: (paneId, tabId) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;
      pane.activeTabId = tabId;
      return { layout };
    });
  },

  moveTab: (fromPaneId, toPaneId, tabId) => {
    set((state) => {
      if (fromPaneId === toPaneId) return state;
      const layout = cloneNode(state.layout);
      const fromPane = findPane(layout, fromPaneId);
      const toPane = findPane(layout, toPaneId);
      if (!fromPane || !toPane) return state;

      const tabIndex = fromPane.tabs.findIndex((t) => t.id === tabId);
      if (tabIndex < 0) return state;

      const [tab] = fromPane.tabs.splice(tabIndex, 1);
      toPane.tabs.push(tab);
      toPane.activeTabId = tab.id;

      if (fromPane.activeTabId === tabId) {
        fromPane.activeTabId = fromPane.tabs[0]?.id ?? null;
      }

      // Close empty source pane
      if (fromPane.tabs.length === 0) {
        const allPanes = collectPanes(layout);
        if (allPanes.length > 1) {
          const newLayout = removeChild(layout, fromPaneId);
          return { layout: newLayout, focusedPaneId: toPaneId };
        }
      }

      return { layout, focusedPaneId: toPaneId };
    });
  },

  reorderTab: (paneId, fromIndex, toIndex) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;
      if (fromIndex < 0 || fromIndex >= pane.tabs.length) return state;
      if (toIndex < 0 || toIndex >= pane.tabs.length) return state;

      const [tab] = pane.tabs.splice(fromIndex, 1);
      pane.tabs.splice(toIndex, 0, tab);
      return { layout };
    });
  },

  resizePanes: (splitId, sizes) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const findSplit = (node: LayoutNode): SplitLayout | null => {
        if (isSplitLayout(node)) {
          if (node.id === splitId) return node;
          for (const child of node.children) {
            const found = findSplit(child);
            if (found) return found;
          }
        }
        return null;
      };
      const split = findSplit(layout);
      if (!split || sizes.length !== split.children.length) return state;
      split.sizes = sizes;
      return { layout };
    });
  },

  resetLayout: (initialTabs) => {
    const pane = createPane(initialTabs ?? [], initialTabs?.[0]?.id ?? null);
    set({ layout: pane, focusedPaneId: pane.id });
  },

  saveWorkspaceLayout: (workspaceId) => {
    const { layout, focusedPaneId } = get();
    workspaceLayouts.set(workspaceId, { layout: cloneNode(layout), focusedPaneId });
  },

  restoreWorkspaceLayout: (workspaceId) => {
    const saved = workspaceLayouts.get(workspaceId);
    if (saved) {
      set({ layout: cloneNode(saved.layout), focusedPaneId: saved.focusedPaneId });
    } else {
      const pane = createPane();
      set({ layout: pane, focusedPaneId: pane.id });
    }
  },

  getAllPanes: () => collectPanes(get().layout),
  getFocusedPane: () => {
    const { layout, focusedPaneId } = get();
    if (!focusedPaneId) {
      const panes = collectPanes(layout);
      return panes[0] ?? null;
    }
    return findPane(layout, focusedPaneId);
  },
}));
