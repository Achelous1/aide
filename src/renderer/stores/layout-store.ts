import { create } from 'zustand';
import type { TerminalTab, Pane, SplitLayout, LayoutNode, SerializableLayoutNode, SerializablePane, SerializableSplitLayout, SavedTab, SavedSession } from '../../types/ipc';
import { isSplitLayout } from '../../types/ipc';
import { useTerminalStore } from './terminal-store';
import { useWorkspaceStore } from './workspace-store';
import { usePluginStore } from './plugin-store';

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

/** Count the maximum visual columns (horizontal leaves) across all rows */
function countVisualColumns(node: LayoutNode): number {
  if (!isSplitLayout(node)) return 1;
  if (node.direction === 'horizontal') {
    // Horizontal split: sum all children's column counts
    return node.children.reduce((sum, child) => sum + countVisualColumns(child), 0);
  }
  // Vertical split: take max columns across rows
  return Math.max(...node.children.map(countVisualColumns));
}

/** Count the maximum visual rows (vertical leaves) across all columns */
function countVisualRows(node: LayoutNode): number {
  if (!isSplitLayout(node)) return 1;
  if (node.direction === 'vertical') {
    return node.children.reduce((sum, child) => sum + countVisualRows(child), 0);
  }
  return Math.max(...node.children.map(countVisualRows));
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

  // Split + move tab in one action
  splitPaneWithTab: (targetPaneId: string, direction: 'horizontal' | 'vertical', position: 'before' | 'after', tab: TerminalTab, fromPaneId: string) => void;

  // Tab operations
  addTabToPane: (paneId: string, tab: TerminalTab) => void;
  removeTabFromPane: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  moveTab: (fromPaneId: string, toPaneId: string, tabId: string) => void;
  reorderTab: (paneId: string, fromIndex: number, toIndex: number) => void;
  updateTabAgentSessionId: (ptySessionId: string, agentSessionId: string) => void;

  // Resize
  resizePanes: (splitId: string, sizes: number[]) => void;

  // Layout reset
  resetLayout: (initialTabs?: TerminalTab[]) => void;

  // Workspace layout persistence
  saveWorkspaceLayout: (workspaceId: string) => void;
  restoreWorkspaceLayout: (workspaceId: string) => void;

  // Session save/restore (persistent via electron-store)
  saveSession: (workspaceId: string) => Promise<void>;
  restoreSession: (workspaceId: string) => Promise<void>;

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
      // Hard limit: max 6 panes total (3×2 grid)
      const totalPanes = collectPanes(state.layout).length;
      if (totalPanes >= 6) return state;

      // Visual grid limit: max 3 columns, max 2 rows
      // Check what the tree would look like AFTER splitting
      if (direction === 'horizontal' && countVisualColumns(state.layout) >= 3) return state;
      if (direction === 'vertical' && countVisualRows(state.layout) >= 2) return state;

      const layout = cloneNode(state.layout);
      const pane = findPane(layout, paneId);
      if (!pane) return state;

      const newPane = createPane();

      // Move active tab to new pane if there are multiple tabs
      if (pane.activeTabId && pane.tabs.length > 1) {
        const tabIndex = pane.tabs.findIndex((t) => t.id === pane.activeTabId);
        if (tabIndex >= 0) {
          const [movedTab] = pane.tabs.splice(tabIndex, 1);
          newPane.tabs.push(movedTab);
          newPane.activeTabId = movedTab.id;
          pane.activeTabId = pane.tabs[0]?.id ?? null;
        }
      }

      // Check if parent split has the same direction → flatten (add sibling)
      const parentInfo = findParentSplit(layout, paneId);
      if (parentInfo && parentInfo.parent.direction === direction) {
        // Parent limit: max 3 for horizontal, max 2 for vertical
        const maxChildren = direction === 'horizontal' ? 3 : 2;
        if (parentInfo.parent.children.length >= maxChildren) return state;

        // Insert new pane right after the current pane
        parentInfo.parent.children.splice(parentInfo.index + 1, 0, newPane);
        // Redistribute sizes evenly
        const count = parentInfo.parent.children.length;
        parentInfo.parent.sizes = Array(count).fill(100 / count);

        return { layout, focusedPaneId: newPane.id };
      }

      // Different direction or root pane → wrap in new split
      const newSplit: SplitLayout = {
        id: newSplitId(),
        direction,
        children: [{ ...pane }, newPane],
        sizes: [50, 50],
      };

      if (layout.id === paneId) {
        return { layout: newSplit, focusedPaneId: newPane.id };
      }

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

  splitPaneWithTab: (targetPaneId, direction, position, tab, fromPaneId) => {
    set((state) => {
      const totalPanes = collectPanes(state.layout).length;
      if (totalPanes >= 6) return state;

      const layout = cloneNode(state.layout);

      // Remove tab from source pane
      const fromPane = findPane(layout, fromPaneId);
      if (fromPane) {
        const idx = fromPane.tabs.findIndex((t) => t.id === tab.id);
        if (idx >= 0) fromPane.tabs.splice(idx, 1);
        if (fromPane.activeTabId === tab.id) {
          fromPane.activeTabId = fromPane.tabs[0]?.id ?? null;
        }
      }

      // Create new pane with the tab
      const newPane = createPane([tab], tab.id);

      // Insert new pane relative to target
      const parentInfo = findParentSplit(layout, targetPaneId);

      if (parentInfo && parentInfo.parent.direction === direction) {
        // Same direction parent: add sibling
        const maxChildren = direction === 'horizontal' ? 3 : 2;
        if (parentInfo.parent.children.length >= maxChildren) return state;
        const insertIdx = position === 'before' ? parentInfo.index : parentInfo.index + 1;
        parentInfo.parent.children.splice(insertIdx, 0, newPane);
        const count = parentInfo.parent.children.length;
        parentInfo.parent.sizes = Array(count).fill(100 / count);
      } else {
        // Different direction or root: wrap in new split
        const targetPane = findPane(layout, targetPaneId);
        if (!targetPane) return state;

        const children = position === 'before'
          ? [newPane, { ...targetPane }]
          : [{ ...targetPane }, newPane];
        const newSplit: SplitLayout = {
          id: newSplitId(),
          direction,
          children,
          sizes: [50, 50],
        };

        if (layout.id === targetPaneId) {
          // Clean up empty source pane
          if (fromPane && fromPane.tabs.length === 0 && fromPaneId !== targetPaneId) {
            const newLayout = removeChild(newSplit, fromPaneId);
            if (countVisualColumns(newLayout) > 3 || countVisualRows(newLayout) > 2) return state;
            return { layout: newLayout, focusedPaneId: newPane.id };
          }
          if (countVisualColumns(newSplit) > 3 || countVisualRows(newSplit) > 2) return state;
          return { layout: newSplit, focusedPaneId: newPane.id };
        }

        if (parentInfo) {
          parentInfo.parent.children[parentInfo.index] = newSplit;
        }
      }

      // Clean up empty source pane
      if (fromPane && fromPane.tabs.length === 0 && fromPaneId !== targetPaneId) {
        const allPanes = collectPanes(layout);
        if (allPanes.length > 1) {
          const cleaned = removeChild(layout, fromPaneId);
          if (countVisualColumns(cleaned) > 3 || countVisualRows(cleaned) > 2) return state;
          return { layout: cleaned, focusedPaneId: newPane.id };
        }
      }

      if (countVisualColumns(layout) > 3 || countVisualRows(layout) > 2) return state;
      return { layout, focusedPaneId: newPane.id };
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

  updateTabAgentSessionId: (ptySessionId, agentSessionId) => {
    set((state) => {
      const layout = cloneNode(state.layout);
      const allPanes = collectPanes(layout);
      for (const pane of allPanes) {
        const tab = pane.tabs.find((t) => t.sessionId === ptySessionId);
        if (tab) {
          tab.agentSessionId = agentSessionId;
          return { layout };
        }
      }
      return state;
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

  saveSession: async (workspaceId) => {
    const { layout, focusedPaneId } = get();

    function serializeNode(node: LayoutNode): SerializableLayoutNode {
      if (isSplitLayout(node)) {
        const split = node as SplitLayout;
        return {
          id: split.id,
          direction: split.direction,
          children: split.children.map(serializeNode),
          sizes: split.sizes,
        } as SerializableSplitLayout;
      }
      const pane = node as Pane;
      const tabs: SavedTab[] = pane.tabs.map((tab) => ({
        id: tab.id,
        type: tab.type,
        title: tab.title,
        isActive: tab.id === pane.activeTabId,
        agentId: tab.agentId,
        pluginId: tab.pluginId,
        agentSessionId: tab.agentSessionId,
      }));
      return {
        id: pane.id,
        tabs,
        activeTabId: pane.activeTabId,
      } as SerializablePane;
    }

    const activePlugins = usePluginStore.getState().plugins
      .filter((p) => p.active)
      .map((p) => p.id);
    const sidePanelTab = useWorkspaceStore.getState().sidePanelTab;

    const session: SavedSession = {
      version: 1,
      workspaceId,
      savedAt: Date.now(),
      layout: serializeNode(layout),
      focusedPaneId,
      activePlugins,
      sidePanelTab,
    };

    await window.aide.session.save(session);
  },

  restoreSession: async (workspaceId) => {
    const session = await window.aide.session.load(workspaceId);
    if (!session) {
      get().resetLayout();
      return;
    }

    // Update counters to avoid ID collisions
    function updateCounters(node: SerializableLayoutNode): void {
      if ('direction' in node && 'children' in node) {
        const split = node as SerializableSplitLayout;
        const num = parseInt(split.id.replace('split-', ''), 10);
        if (!isNaN(num) && num >= splitCounter) splitCounter = num + 1;
        split.children.forEach(updateCounters);
      } else {
        const pane = node as SerializablePane;
        const num = parseInt(pane.id.replace('pane-', ''), 10);
        if (!isNaN(num) && num >= paneCounter) paneCounter = num + 1;
      }
    }
    updateCounters(session.layout);

    const wsPath = useWorkspaceStore.getState().workspaces.find(
      (w) => w.id === workspaceId,
    )?.path;

    async function rebuildNode(node: SerializableLayoutNode): Promise<LayoutNode> {
      if ('direction' in node && 'children' in node) {
        const split = node as SerializableSplitLayout;
        const children = await Promise.all(split.children.map(rebuildNode));
        return {
          id: split.id,
          direction: split.direction,
          children,
          sizes: split.sizes,
        } as SplitLayout;
      }

      const savedPane = node as SerializablePane;
      const tabs: TerminalTab[] = [];
      let activeTabId: string | null = null;

      for (const savedTab of savedPane.tabs) {
        if (savedTab.type === 'plugin') {
          const tab: TerminalTab = {
            id: savedTab.id,
            type: 'plugin',
            pluginId: savedTab.pluginId,
            title: savedTab.title,
          };
          tabs.push(tab);
          useTerminalStore.getState().addTab(tab);
          if (savedTab.isActive) activeTabId = tab.id;
        } else {
          // shell or agent — spawn new PTY
          let sessionId: string | null = null;
          try {
            sessionId = await window.aide.terminal.spawn({
              shell: savedTab.agentId || undefined,
              cwd: wsPath,
              agentType: savedTab.type === 'agent' ? (savedTab.agentId as 'claude' | 'gemini' | 'codex' | undefined) : undefined,
              resumeSessionId: savedTab.agentSessionId,
            });
          } catch {
            // agent not installed — fall back to plain shell
            try {
              sessionId = await window.aide.terminal.spawn({ cwd: wsPath });
            } catch {
              // spawn failed entirely, skip tab
            }
          }

          if (sessionId) {
            const tab: TerminalTab = {
              id: savedTab.id,
              type: savedTab.type,
              agentId: savedTab.agentId,
              agentSessionId: savedTab.agentSessionId,
              sessionId,
              title: savedTab.title,
            };
            tabs.push(tab);
            useTerminalStore.getState().addTab(tab);
            if (savedTab.isActive) activeTabId = tab.id;
          }
        }
      }

      // Fallback: ensure pane has at least one tab
      if (tabs.length === 0) {
        try {
          const sessionId = await window.aide.terminal.spawn({ cwd: wsPath });
          const tab: TerminalTab = {
            id: crypto.randomUUID(),
            type: 'shell',
            sessionId,
            title: '$ shell',
          };
          tabs.push(tab);
          useTerminalStore.getState().addTab(tab);
          activeTabId = tab.id;
        } catch {
          // ignore
        }
      }

      if (!activeTabId && tabs.length > 0) {
        activeTabId = tabs[0].id;
      }

      return { id: savedPane.id, tabs, activeTabId } as Pane;
    }

    const restoredLayout = await rebuildNode(session.layout);
    set({ layout: restoredLayout, focusedPaneId: session.focusedPaneId });

    // Restore active plugins
    for (const pluginId of session.activePlugins) {
      window.aide.plugin.activate(pluginId).catch(() => {});
    }

    // Restore side panel tab
    useWorkspaceStore.getState().setSidePanelTab(session.sidePanelTab);
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
