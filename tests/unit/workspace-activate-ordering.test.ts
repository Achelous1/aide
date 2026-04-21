/**
 * Regression tests for workspace-store.setActive() call ordering.
 *
 * Bug: restoreSession() calls window.aide.plugin.activate(id) for each entry
 * in session.activePlugins. If this runs before window.aide.workspace.open()
 * and usePluginStore.loadPlugins(), the main-side plugin registry is empty
 * and activate silently fails — the tab is restored but plugin.active stays
 * false.
 *
 * Fix: setActive must open the workspace and load plugins into the registry
 * BEFORE calling restoreSession, then reload after so the renderer reflects
 * the main-side activation results.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWorkspaceStore } from '../../src/renderer/stores/workspace-store';
import { useLayoutStore, createPane } from '../../src/renderer/stores/layout-store';
import { useTerminalStore } from '../../src/renderer/stores/terminal-store';
import { usePluginStore } from '../../src/renderer/stores/plugin-store';

describe('workspace-store.setActive — activation ordering', () => {
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;

    vi.stubGlobal('window', {
      aide: {
        workspace: {
          open: vi.fn(async () => {
            calls.push('workspace.open');
          }),
          list: vi.fn().mockResolvedValue([]),
          recent: vi.fn().mockResolvedValue([]),
        },
        plugin: {
          list: vi.fn(async () => {
            calls.push('plugin.list');
            return [];
          }),
          activate: vi.fn(async () => {
            calls.push('plugin.activate');
          }),
          deactivate: vi.fn().mockResolvedValue(undefined),
          onChanged: vi.fn(() => () => { /* unsub */ }),
        },
        session: {
          load: vi.fn(async () => {
            calls.push('session.load');
            return {
              version: 1,
              workspaceId: 'ws-1',
              savedAt: Date.now(),
              layout: {
                id: 'pane-1',
                tabs: [
                  {
                    id: 'tab-plugin-1',
                    type: 'plugin',
                    title: 'agent-todo-board',
                    isActive: true,
                    pluginId: 'plugin-abc',
                  },
                ],
                activeTabId: 'tab-plugin-1',
              },
              focusedPaneId: 'pane-1',
              activePlugins: ['plugin-abc'],
              sidePanelTab: 'files',
            };
          }),
          save: vi.fn().mockResolvedValue(undefined),
        },
        terminal: { spawn: vi.fn().mockResolvedValue({ ok: true, sessionId: 'sess-1' }) },
      },
    });

    const initialPane = createPane();
    useLayoutStore.setState({ layout: initialPane, focusedPaneId: initialPane.id });
    useTerminalStore.setState({ tabs: [], activeTabId: null, dropdownOpen: false, workspaceTabs: {} });
    usePluginStore.setState({ plugins: [], loading: false, error: null, generating: false, generateError: null });
    useWorkspaceStore.setState({
      workspaces: [{ id: 'ws-1', name: 'ws', path: '/tmp/ws' }],
      activeWorkspaceId: null,
      recentProjects: [],
      navExpanded: true,
      sidePanelTab: 'files',
    } as Parameters<typeof useWorkspaceStore.setState>[0]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the workspace and loads plugins BEFORE restoreSession activates them', async () => {
    await useWorkspaceStore.getState().setActive('ws-1');

    // Required: workspace.open and at least one plugin.list happen before the
    // first plugin.activate, so the main-side registry is populated.
    const firstOpen = calls.indexOf('workspace.open');
    const firstList = calls.indexOf('plugin.list');
    const firstActivate = calls.indexOf('plugin.activate');

    expect(firstOpen, 'workspace.open should fire').toBeGreaterThanOrEqual(0);
    expect(firstList, 'plugin.list should fire').toBeGreaterThanOrEqual(0);
    expect(firstActivate, 'plugin.activate should fire for the saved activePlugin').toBeGreaterThanOrEqual(0);

    expect(firstOpen).toBeLessThan(firstActivate);
    expect(firstList).toBeLessThan(firstActivate);
  });

  it('reloads plugin list AFTER restoreSession so renderer reflects activate results', async () => {
    await useWorkspaceStore.getState().setActive('ws-1');

    // There should be at least TWO plugin.list calls: one before restoreSession
    // (to populate registry) and one after (to refresh renderer with activate results).
    const listCount = calls.filter((c) => c === 'plugin.list').length;
    expect(listCount).toBeGreaterThanOrEqual(2);

    const lastActivate = calls.lastIndexOf('plugin.activate');
    const lastList = calls.lastIndexOf('plugin.list');
    expect(lastActivate, 'plugin.activate should be invoked').toBeGreaterThanOrEqual(0);
    expect(lastList).toBeGreaterThan(lastActivate);
  });

  it('switching into a workspace with no saved activePlugins still calls workspace.open and loadPlugins', async () => {
    (window.aide.session.load as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      version: 1,
      workspaceId: 'ws-1',
      savedAt: Date.now(),
      layout: { id: 'pane-1', tabs: [], activeTabId: null },
      focusedPaneId: 'pane-1',
      activePlugins: [],
      sidePanelTab: 'files',
    });

    await useWorkspaceStore.getState().setActive('ws-1');

    expect(calls).toContain('workspace.open');
    expect(calls.filter((c) => c === 'plugin.list').length).toBeGreaterThanOrEqual(1);
    expect(calls.filter((c) => c === 'plugin.activate').length).toBe(0);
  });

  it('cache-hit path still calls plugin.list so the renderer store reflects current main-side plugin state', async () => {
    // Seed the module-level layout cache via the public API, then clear the
    // recorded calls so we only observe the second setActive.
    useWorkspaceStore.setState({
      workspaces: [
        { id: 'ws-1', name: 'ws', path: '/tmp/ws' },
        { id: 'ws-2', name: 'ws2', path: '/tmp/ws2' },
      ],
    } as Parameters<typeof useWorkspaceStore.setState>[0]);
    await useWorkspaceStore.getState().setActive('ws-1');
    await useWorkspaceStore.getState().setActive('ws-2');
    calls.length = 0;

    await useWorkspaceStore.getState().setActive('ws-1');

    expect(useLayoutStore.getState().loadLayoutFromCache).toBeTypeOf('function');
    expect(calls.filter((c) => c === 'plugin.list').length).toBeGreaterThanOrEqual(1);
  });
});
