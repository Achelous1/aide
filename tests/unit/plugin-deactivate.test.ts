/**
 * TDD tests for plugin deactivate tab-removal bug.
 *
 * Bug: toggling a plugin off leaves its tab visible in the UI because
 * deactivate() does not reliably remove plugin tabs from all panes, and
 * buildSavedSession() serialises the layout as-is (including plugin tabs)
 * without stripping tabs for inactive plugins.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePluginStore } from '../../src/renderer/stores/plugin-store';
import { useLayoutStore, createPane } from '../../src/renderer/stores/layout-store';
import { useTerminalStore } from '../../src/renderer/stores/terminal-store';
import { useWorkspaceStore } from '../../src/renderer/stores/workspace-store';
import type { TerminalTab, PluginInfo } from '../../src/types/ipc';

// ── helpers ────────────────────────────────────────────────────────────────

function makePlugin(id: string, active = true): PluginInfo {
  return { id, name: `Plugin ${id}`, description: '', active, version: '0.1.0', toolCount: 0 };
}

function makePluginTab(pluginId: string, tabId = `tab-${pluginId}`): TerminalTab {
  return { id: tabId, type: 'plugin', pluginId, title: `Plugin ${pluginId}` };
}

function setupWindow(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal('window', {
    aide: {
      plugin: {
        list: vi.fn().mockResolvedValue([]),
        activate: vi.fn().mockResolvedValue(undefined),
        deactivate: vi.fn().mockResolvedValue(undefined),
      },
      session: {
        save: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue(null),
      },
      terminal: { spawn: vi.fn().mockResolvedValue({ ok: true, sessionId: 'sess-1' }) },
      workspace: { open: vi.fn().mockResolvedValue(undefined) },
      ...overrides,
    },
  });
}

// ── suite ──────────────────────────────────────────────────────────────────

describe('plugin deactivate – tab removal', () => {
  beforeEach(() => {
    setupWindow();

    // Reset stores to clean state
    const initialPane = createPane();
    useLayoutStore.setState({ layout: initialPane, focusedPaneId: initialPane.id });
    useTerminalStore.setState({ tabs: [], activeTabId: null, dropdownOpen: false, workspaceTabs: {} });
    usePluginStore.setState({ plugins: [], loading: false, error: null, generating: false, generateError: null });
    useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: 'ws-1', recentProjects: [], navExpanded: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── case (a): deactivate removes the plugin tab from the single pane ──────

  it('(a) deactivate() removes the plugin tab from the layout', async () => {
    const plugin = makePlugin('plugin-1');
    const tab = makePluginTab('plugin-1');

    // Pre-condition: plugin is active and its tab is in the pane
    usePluginStore.setState({ plugins: [plugin], loading: false, error: null, generating: false, generateError: null });
    const paneId = useLayoutStore.getState().getAllPanes()[0].id;
    useLayoutStore.getState().addTabToPane(paneId, tab);
    useTerminalStore.getState().addTab(tab);

    // After deactivate, the IPC call returns empty list (plugin now inactive)
    (window.aide.plugin.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      makePlugin('plugin-1', false),
    ]);

    await usePluginStore.getState().deactivate('plugin-1');

    // Tab must be gone from every pane
    const allPanes = useLayoutStore.getState().getAllPanes();
    const remainingPluginTabs = allPanes.flatMap((p) =>
      p.tabs.filter((t) => t.type === 'plugin' && t.pluginId === 'plugin-1'),
    );
    expect(remainingPluginTabs).toHaveLength(0);
  });

  // ── case (b): deactivate removes the tab from terminal store ─────────────

  it('(b) deactivate() removes the plugin tab from the terminal store', async () => {
    const plugin = makePlugin('plugin-1');
    const tab = makePluginTab('plugin-1');

    usePluginStore.setState({ plugins: [plugin], loading: false, error: null, generating: false, generateError: null });
    const paneId = useLayoutStore.getState().getAllPanes()[0].id;
    useLayoutStore.getState().addTabToPane(paneId, tab);
    useTerminalStore.getState().addTab(tab);

    (window.aide.plugin.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      makePlugin('plugin-1', false),
    ]);

    await usePluginStore.getState().deactivate('plugin-1');

    const terminalTabs = useTerminalStore.getState().tabs;
    expect(terminalTabs.some((t) => t.pluginId === 'plugin-1')).toBe(false);
  });

  // ── case (c): deactivate removes plugin tabs from ALL panes ───────────────

  it('(c) deactivate() removes plugin tabs from multiple panes', async () => {
    const plugin = makePlugin('plugin-1');
    const tab1 = makePluginTab('plugin-1', 'tab-p1-pane1');
    const tab2 = makePluginTab('plugin-1', 'tab-p1-pane2');

    usePluginStore.setState({ plugins: [plugin], loading: false, error: null, generating: false, generateError: null });

    // Set up two panes: first pane already exists, split to create second
    const pane1Id = useLayoutStore.getState().getAllPanes()[0].id;
    useLayoutStore.getState().addTabToPane(pane1Id, tab1);
    useTerminalStore.getState().addTab(tab1);

    // Add a shell tab so split is possible, then split
    const shellTab: TerminalTab = { id: 'shell-1', type: 'shell', sessionId: 's1', title: '$ shell' };
    useLayoutStore.getState().addTabToPane(pane1Id, shellTab);
    useLayoutStore.getState().splitPane(pane1Id, 'horizontal');

    // Get second pane and add the same plugin tab there too
    const allPanes = useLayoutStore.getState().getAllPanes();
    const pane2 = allPanes.find((p) => p.id !== pane1Id);
    expect(pane2).toBeDefined();
    useLayoutStore.getState().addTabToPane(pane2!.id, tab2);
    useTerminalStore.getState().addTab(tab2);

    (window.aide.plugin.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      makePlugin('plugin-1', false),
    ]);

    await usePluginStore.getState().deactivate('plugin-1');

    const remainingPluginTabs = useLayoutStore
      .getState()
      .getAllPanes()
      .flatMap((p) => p.tabs.filter((t) => t.type === 'plugin' && t.pluginId === 'plugin-1'));

    expect(remainingPluginTabs).toHaveLength(0);
  });

  // ── case (d): buildSavedSession excludes tabs of inactive plugins ─────────

  it('(d) buildSavedSession() does not include tabs for inactive plugins', () => {
    const inactivePlugin = makePlugin('plugin-off', false);
    const activePlugin = makePlugin('plugin-on', true);

    usePluginStore.setState({
      plugins: [inactivePlugin, activePlugin],
      loading: false,
      error: null,
      generating: false,
      generateError: null,
    });

    // Manually put a stale plugin tab for the *inactive* plugin into the layout
    // (simulates a case where deactivate failed to remove it)
    const paneId = useLayoutStore.getState().getAllPanes()[0].id;
    const staleTab = makePluginTab('plugin-off', 'stale-tab');
    const activeTab = makePluginTab('plugin-on', 'active-tab');
    useLayoutStore.getState().addTabToPane(paneId, staleTab);
    useLayoutStore.getState().addTabToPane(paneId, activeTab);

    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: 'ws-1',
      recentProjects: [],
      navExpanded: true,
      sidePanelTab: 'files',
    } as Parameters<typeof useWorkspaceStore.setState>[0]);

    const saved = useLayoutStore.getState().buildSavedSession('ws-1');

    // The saved session should not contain a tab for the inactive plugin
    function collectSavedTabs(node: unknown): unknown[] {
      const n = node as Record<string, unknown>;
      if ('tabs' in n) return (n.tabs as unknown[]);
      if ('children' in n) return (n.children as unknown[]).flatMap(collectSavedTabs);
      return [];
    }
    const savedTabs = collectSavedTabs(saved.layout);
    const inactiveSavedTabs = savedTabs.filter(
      (t) => (t as Record<string, unknown>).pluginId === 'plugin-off',
    );
    expect(inactiveSavedTabs).toHaveLength(0);
  });
});
