import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

// Mock window.aide
vi.stubGlobal('window', {
  aide: {
    agent: { onStatus: vi.fn(() => vi.fn()) },
    workspace: { openDialog: vi.fn(), create: vi.fn(), rename: vi.fn(), showInFinder: vi.fn(), remove: vi.fn() },
  },
});

// Mock stores
const mockWorkspaceStore = {
  workspaces: [
    { id: 'ws-1', name: 'Alpha', path: '/alpha', color: '#aabbcc' },
    { id: 'ws-2', name: 'Beta', path: '/beta', color: '#ddeeff' },
  ],
  activeWorkspaceId: 'ws-1',
  navExpanded: true,
  setActive: vi.fn(),
  toggleNav: vi.fn(),
  addWorkspace: vi.fn(),
  removeWorkspace: vi.fn(),
  renameWorkspace: vi.fn(),
};

const mockAgentStore = { sessionStatuses: {} };
const mockTerminalStore = { workspaceTabs: {}, activeTabId: null, setActiveTab: vi.fn() };
const mockLayoutStore = { layout: { id: 'pane-1', tabs: [], activeTabId: null } };

vi.mock('../../src/renderer/stores/workspace-store', () => ({
  useWorkspaceStore: vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockWorkspaceStore);
    return mockWorkspaceStore;
  }),
}));

vi.mock('../../src/renderer/stores/agent-store', () => ({
  useAgentStore: Object.assign(
    vi.fn((selector) => {
      if (typeof selector === 'function') return selector(mockAgentStore);
      return mockAgentStore;
    }),
    { getState: () => ({ setStatus: vi.fn() }) }
  ),
}));

vi.mock('../../src/renderer/stores/terminal-store', () => ({
  useTerminalStore: vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockTerminalStore);
    return mockTerminalStore;
  }),
}));

vi.mock('../../src/renderer/stores/layout-store', () => ({
  useLayoutStore: vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockLayoutStore);
    return mockLayoutStore;
  }),
}));

vi.mock('../../src/renderer/components/updater/UpdateNotice', () => ({
  UpdateNotice: () => null,
}));

vi.mock('../../src/renderer/components/terminal/AgentDropdown', () => ({
  AgentDropdown: () => null,
}));

import { WorkspaceNav } from '../../src/renderer/components/workspace/WorkspaceNav';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // Reset to first workspace active
  mockWorkspaceStore.activeWorkspaceId = 'ws-1';
});

describe('WorkspaceNav active workspace highlight (expanded)', () => {
  it('renders active workspace row with data-active="true"', () => {
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow).toBeTruthy();
  });

  it('renders inactive workspace row with data-active="false"', () => {
    const { container } = render(<WorkspaceNav />);
    const inactiveRows = container.querySelectorAll('[data-active="false"]');
    expect(inactiveRows.length).toBeGreaterThan(0);
  });

  it('active row has sky blue tint background class', () => {
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow?.className).toContain('bg-smalti-skyblue/15');
  });

  it('active row has sky blue border', () => {
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow?.className).toContain('border-smalti-skyblue/35');
  });

  it('active row has accent-bar element (sr-only, for test compatibility)', () => {
    const { getAllByTestId } = render(<WorkspaceNav />);
    const accentBars = getAllByTestId('accent-bar');
    expect(accentBars.length).toBeGreaterThan(0);
  });

  it('active row has exactly one accent-bar element', () => {
    const { getAllByTestId } = render(<WorkspaceNav />);
    const accentBars = getAllByTestId('accent-bar');
    expect(accentBars.length).toBe(1);
  });

  it('active row avatar has sky blue ring', () => {
    const { getAllByTestId } = render(<WorkspaceNav />);
    const avatars = getAllByTestId('workspace-avatar');
    const activeAvatars = avatars.filter((a) => a.className.includes('ring-smalti-skyblue'));
    expect(activeAvatars.length).toBeGreaterThan(0);
  });

  it('active row has aria-current="true"', () => {
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow?.getAttribute('aria-current')).toBe('true');
  });

  it('active row has group class for context menu hover', () => {
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow?.className).toContain('group');
  });

  it('inactive rows do not have sky blue tint or sky blue ring', () => {
    const { container, getAllByTestId } = render(<WorkspaceNav />);
    const inactiveRows = container.querySelectorAll('[data-active="false"]');
    inactiveRows.forEach((row) => {
      expect(row.className).not.toContain('bg-smalti-skyblue/15');
    });

    const avatars = getAllByTestId('workspace-avatar');
    const inactiveAvatars = avatars.filter((a) => !a.className.includes('ring-smalti-skyblue'));
    expect(inactiveAvatars.length).toBeGreaterThan(0);
  });

  it('second workspace becomes active when activeWorkspaceId changes', () => {
    mockWorkspaceStore.activeWorkspaceId = 'ws-2';
    const { container } = render(<WorkspaceNav />);
    const activeRow = container.querySelector('[data-active="true"]');
    expect(activeRow?.textContent).toContain('Beta');
  });
});

describe('WorkspaceNav active workspace highlight (collapsed)', () => {
  beforeEach(() => {
    mockWorkspaceStore.navExpanded = false;
    mockWorkspaceStore.activeWorkspaceId = 'ws-1';
  });

  afterEach(() => {
    mockWorkspaceStore.navExpanded = true;
  });

  it('active icon button has sky blue tint background', () => {
    const { container } = render(<WorkspaceNav />);
    const activeBtn = container.querySelector('button[data-active="true"]');
    expect(activeBtn).toBeTruthy();
    expect(activeBtn?.className).toContain('bg-smalti-skyblue/15');
  });

  it('active icon avatar has sky blue ring', () => {
    const { container } = render(<WorkspaceNav />);
    const activeBtn = container.querySelector('button[data-active="true"]');
    const avatar = activeBtn?.querySelector('span');
    expect(avatar?.className).toContain('ring-smalti-skyblue');
  });

  it('inactive icon button does not have sky blue tint', () => {
    const { container } = render(<WorkspaceNav />);
    const inactiveBtns = container.querySelectorAll('button[data-active="false"]');
    inactiveBtns.forEach((btn) => {
      expect(btn.className).not.toContain('bg-smalti-skyblue/15');
    });
  });
});
