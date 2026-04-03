import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWorkspaceStore } from '../../src/renderer/stores/workspace-store';
import { useTerminalStore } from '../../src/renderer/stores/terminal-store';
import { useAgentStore } from '../../src/renderer/stores/agent-store';
import { usePluginStore } from '../../src/renderer/stores/plugin-store';
import type { WorkspaceInfo, TerminalTab } from '../../src/types/ipc';

const mockWorkspace: WorkspaceInfo = {
  id: 'ws-1',
  name: 'test-project',
  path: '/tmp/test-project',
  color: '#6366f1',
  lastOpened: Date.now(),
};

const mockTab: TerminalTab = {
  id: 'tab-1',
  type: 'shell',
  sessionId: 'session-abc',
  title: '$ shell',
};

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: null,
      recentProjects: [],
      navExpanded: true,
    });
  });

  it('should start with empty state', () => {
    const state = useWorkspaceStore.getState();
    expect(state.workspaces).toEqual([]);
    expect(state.activeWorkspaceId).toBeNull();
    expect(state.recentProjects).toEqual([]);
    expect(state.navExpanded).toBe(true);
  });

  it('addWorkspace should append a workspace', () => {
    useWorkspaceStore.getState().addWorkspace(mockWorkspace);
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(1);
    expect(useWorkspaceStore.getState().workspaces[0].id).toBe('ws-1');
  });

  it('removeWorkspace should remove by id', () => {
    useWorkspaceStore.getState().addWorkspace(mockWorkspace);
    useWorkspaceStore.getState().removeWorkspace('ws-1');
    expect(useWorkspaceStore.getState().workspaces).toHaveLength(0);
  });

  it('setActive should set activeWorkspaceId', () => {
    useWorkspaceStore.getState().setActive('ws-1');
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-1');
  });

  it('setActive(null) should clear active workspace', () => {
    useWorkspaceStore.getState().setActive('ws-1');
    useWorkspaceStore.getState().setActive(null);
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull();
  });

  it('toggleNav should flip navExpanded', () => {
    expect(useWorkspaceStore.getState().navExpanded).toBe(true);
    useWorkspaceStore.getState().toggleNav();
    expect(useWorkspaceStore.getState().navExpanded).toBe(false);
    useWorkspaceStore.getState().toggleNav();
    expect(useWorkspaceStore.getState().navExpanded).toBe(true);
  });

  it('loadRecent should cap at 5 projects', () => {
    const projects = Array.from({ length: 8 }, (_, i) => ({
      ...mockWorkspace,
      id: `ws-${i}`,
      name: `project-${i}`,
    }));
    useWorkspaceStore.getState().loadRecent(projects);
    expect(useWorkspaceStore.getState().recentProjects).toHaveLength(5);
  });
});

describe('useTerminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({
      tabs: [],
      activeTabId: null,
      dropdownOpen: false,
    });
  });

  it('should start with empty tabs', () => {
    const state = useTerminalStore.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
    expect(state.dropdownOpen).toBe(false);
  });

  it('addTab should append a tab', () => {
    useTerminalStore.getState().addTab(mockTab);
    expect(useTerminalStore.getState().tabs).toHaveLength(1);
    expect(useTerminalStore.getState().tabs[0].title).toBe('$ shell');
  });

  it('removeTab should remove by id and update activeTabId', () => {
    useTerminalStore.getState().addTab(mockTab);
    useTerminalStore.getState().setActiveTab('tab-1');
    useTerminalStore.getState().removeTab('tab-1');
    expect(useTerminalStore.getState().tabs).toHaveLength(0);
    expect(useTerminalStore.getState().activeTabId).toBeNull();
  });

  it('removeTab should switch to last remaining tab', () => {
    const tab2: TerminalTab = { id: 'tab-2', type: 'agent', agentId: 'claude', sessionId: 's2', title: 'claude' };
    useTerminalStore.getState().addTab(mockTab);
    useTerminalStore.getState().addTab(tab2);
    useTerminalStore.getState().setActiveTab('tab-1');
    useTerminalStore.getState().removeTab('tab-1');
    expect(useTerminalStore.getState().activeTabId).toBe('tab-2');
  });

  it('toggleDropdown should flip dropdownOpen', () => {
    useTerminalStore.getState().toggleDropdown();
    expect(useTerminalStore.getState().dropdownOpen).toBe(true);
    useTerminalStore.getState().toggleDropdown();
    expect(useTerminalStore.getState().dropdownOpen).toBe(false);
  });

  it('updateTabSession should update sessionId for a tab', () => {
    useTerminalStore.getState().addTab(mockTab);
    useTerminalStore.getState().updateTabSession('tab-1', 'new-session-xyz');
    expect(useTerminalStore.getState().tabs[0].sessionId).toBe('new-session-xyz');
  });

  it('createDefaultTab should create a shell tab and set it active', () => {
    const tabId = useTerminalStore.getState().createDefaultTab();
    expect(tabId).toBeTruthy();
    expect(useTerminalStore.getState().tabs).toHaveLength(1);
    expect(useTerminalStore.getState().tabs[0].type).toBe('shell');
    expect(useTerminalStore.getState().tabs[0].title).toBe('$ shell');
    expect(useTerminalStore.getState().activeTabId).toBe(tabId);
  });
});

describe('useAgentStore', () => {
  beforeEach(() => {
    useAgentStore.setState({
      installedAgents: [],
      sessionStatuses: {},
    });
  });

  it('should start with empty state', () => {
    const state = useAgentStore.getState();
    expect(state.installedAgents).toEqual([]);
    expect(state.sessionStatuses).toEqual({});
  });

  it('setInstalledAgents should replace agents list', () => {
    const agents = [
      { id: 'claude', name: 'Claude Code', command: 'claude', installed: true },
      { id: 'gemini', name: 'Gemini CLI', command: 'gemini', installed: false },
    ];
    useAgentStore.getState().setInstalledAgents(agents);
    expect(useAgentStore.getState().installedAgents).toHaveLength(2);
    expect(useAgentStore.getState().installedAgents[0].id).toBe('claude');
  });

  it('setStatus should track agent session status', () => {
    useAgentStore.getState().setStatus('session-1', 'idle');
    expect(useAgentStore.getState().sessionStatuses['session-1']).toBe('idle');

    useAgentStore.getState().setStatus('session-1', 'processing');
    expect(useAgentStore.getState().sessionStatuses['session-1']).toBe('processing');
  });

  it('setStatus should handle multiple sessions', () => {
    useAgentStore.getState().setStatus('s1', 'idle');
    useAgentStore.getState().setStatus('s2', 'awaiting-input');
    const statuses = useAgentStore.getState().sessionStatuses;
    expect(statuses['s1']).toBe('idle');
    expect(statuses['s2']).toBe('awaiting-input');
  });
});

// ─── Plugin reload on workspace switch ───────────────────────────────────────

const wsA: WorkspaceInfo = { id: 'ws-a', name: 'aide', path: '/projects/aide', color: '#6366f1', lastOpened: 1 };
const wsB: WorkspaceInfo = { id: 'ws-b', name: 'rogue-shelf', path: '/projects/rogue-shelf', color: '#ec4899', lastOpened: 2 };

describe('useWorkspaceStore – plugin reload on workspace switch', () => {
  let workspaceOpenMock: ReturnType<typeof vi.fn>;
  let pluginListMock: ReturnType<typeof vi.fn>;
  let loadPluginsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    workspaceOpenMock = vi.fn().mockResolvedValue('/projects/aide');
    pluginListMock = vi.fn().mockResolvedValue([]);

    vi.stubGlobal('window', {
      aide: {
        workspace: { open: workspaceOpenMock },
        plugin: { list: pluginListMock },
      },
    });

    loadPluginsSpy = vi.spyOn(usePluginStore.getState(), 'loadPlugins');

    useWorkspaceStore.setState({
      workspaces: [wsA, wsB],
      activeWorkspaceId: null,
      recentProjects: [],
      navExpanded: true,
    });
    usePluginStore.setState({ plugins: [], loading: false, error: null, generating: false, generateError: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls window.aide.workspace.open with the workspace path on switch', async () => {
    await useWorkspaceStore.getState().setActive('ws-a');
    expect(workspaceOpenMock).toHaveBeenCalledWith('/projects/aide');
  });

  it('calls loadPlugins after workspace.open resolves', async () => {
    await useWorkspaceStore.getState().setActive('ws-a');
    expect(loadPluginsSpy).toHaveBeenCalledTimes(1);
  });

  it('calls workspace.open with the new workspace path when switching', async () => {
    await useWorkspaceStore.getState().setActive('ws-a');
    await useWorkspaceStore.getState().setActive('ws-b');
    expect(workspaceOpenMock).toHaveBeenLastCalledWith('/projects/rogue-shelf');
    expect(loadPluginsSpy).toHaveBeenCalledTimes(2);
  });

  it('does not call workspace.open or loadPlugins when switching to the same workspace', async () => {
    await useWorkspaceStore.getState().setActive('ws-a');
    workspaceOpenMock.mockClear();
    loadPluginsSpy.mockClear();

    await useWorkspaceStore.getState().setActive('ws-a');
    expect(workspaceOpenMock).not.toHaveBeenCalled();
    expect(loadPluginsSpy).not.toHaveBeenCalled();
  });

  it('still sets activeWorkspaceId even without a matching workspace in list', async () => {
    await useWorkspaceStore.getState().setActive('ws-unknown');
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws-unknown');
    // No matching workspace path → workspace.open should not be called
    expect(workspaceOpenMock).not.toHaveBeenCalled();
  });
});
