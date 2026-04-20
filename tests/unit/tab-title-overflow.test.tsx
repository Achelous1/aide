import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Stub heavy electron / xterm dependencies so happy-dom can load the modules
// ---------------------------------------------------------------------------
vi.mock('../../src/renderer/stores/terminal-store', () => ({
  useTerminalStore: vi.fn(() => ({
    tabs: [],
    activeTabId: null,
    setActiveTab: vi.fn(),
    removeTab: vi.fn(),
    dropdownOpen: false,
    toggleDropdown: vi.fn(),
  })),
}));

vi.mock('../../src/renderer/components/terminal/AgentDropdown', () => ({
  AgentDropdown: () => null,
}));

vi.mock('../../src/renderer/components/terminal/TerminalPanel', () => ({
  TerminalPanel: () => null,
}));

vi.mock('../../src/renderer/components/plugin/PluginView', () => ({
  PluginView: () => null,
}));

vi.mock('../../src/renderer/components/layout/EmptyState', () => ({
  EmptyState: () => null,
}));

vi.mock('../../src/renderer/stores/layout-store', () => ({
  useLayoutStore: vi.fn(() => ({
    focusedPaneId: null,
    setFocusedPane: vi.fn(),
    setActiveTab: vi.fn(),
    removeTabFromPane: vi.fn(),
    renameTabInPane: vi.fn(),
    splitPane: vi.fn(),
    closePane: vi.fn(),
    moveTabToPane: vi.fn(),
  })),
}));

vi.mock('../../src/renderer/lib/xterm-cache', () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDndMonitor: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  horizontalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

// Minimal window.aide stub
beforeEach(() => {
  if (!(globalThis as unknown as { aide?: unknown }).aide) {
    (globalThis as unknown as Record<string, unknown>).aide = {
      terminal: { kill: vi.fn() },
    };
  }
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// TabBar tests
// ---------------------------------------------------------------------------
describe('TabBar – tab title overflow', () => {
  it('title span has truncate class', async () => {
    const { useTerminalStore } = await import('../../src/renderer/stores/terminal-store');
    const mockTab = {
      id: 't1',
      title: 'A very long tab title that should be truncated with an ellipsis',
      agentId: 'claude',
      sessionId: null,
    };
    (useTerminalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      tabs: [mockTab],
      activeTabId: 't1',
      setActiveTab: vi.fn(),
      removeTab: vi.fn(),
      dropdownOpen: false,
      toggleDropdown: vi.fn(),
    });

    const { TabBar } = await import('../../src/renderer/components/terminal/TabBar');
    const { container } = render(<TabBar />);

    const titleSpan = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === mockTab.title
    );
    expect(titleSpan, 'title span not found').toBeTruthy();
    expect(titleSpan!.className).toContain('truncate');
  });

  it('tab button has min-w-0 and max-w classes', async () => {
    const { useTerminalStore } = await import('../../src/renderer/stores/terminal-store');
    const mockTab = {
      id: 't2',
      title: 'Another very long tab title exceeding any reasonable width',
      agentId: 'shell',
      sessionId: null,
    };
    (useTerminalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      tabs: [mockTab],
      activeTabId: 't2',
      setActiveTab: vi.fn(),
      removeTab: vi.fn(),
      dropdownOpen: false,
      toggleDropdown: vi.fn(),
    });

    const { TabBar } = await import('../../src/renderer/components/terminal/TabBar');
    const { container } = render(<TabBar />);

    // First button is the tab button (second is the + button)
    const buttons = container.querySelectorAll('button');
    const tabButton = buttons[0];
    expect(tabButton, 'tab button not found').toBeTruthy();
    expect(tabButton.className).toContain('min-w-0');
    expect(tabButton.className).toMatch(/max-w-/);
  });

  it('close button has shrink-0 so it stays visible', async () => {
    const { useTerminalStore } = await import('../../src/renderer/stores/terminal-store');
    const tab1 = { id: 't3', title: 'Tab 1', agentId: 'claude', sessionId: null };
    const tab2 = { id: 't4', title: 'Tab 2', agentId: 'gemini', sessionId: null };
    (useTerminalStore as ReturnType<typeof vi.fn>).mockReturnValue({
      tabs: [tab1, tab2],
      activeTabId: 't3',
      setActiveTab: vi.fn(),
      removeTab: vi.fn(),
      dropdownOpen: false,
      toggleDropdown: vi.fn(),
    });

    const { TabBar } = await import('../../src/renderer/components/terminal/TabBar');
    const { container } = render(<TabBar />);

    const closeButtons = Array.from(container.querySelectorAll('span[role="button"]'));
    expect(closeButtons.length, 'no close buttons found').toBeGreaterThan(0);
    closeButtons.forEach((btn) => {
      expect(btn.className).toContain('shrink-0');
    });
  });
});

// ---------------------------------------------------------------------------
// PaneView DraggableTab tests
// ---------------------------------------------------------------------------
describe('PaneView DraggableTab – tab title overflow', () => {
  it('title span has truncate class', async () => {
    const { DraggableTab } = await import('../../src/renderer/components/layout/PaneView');

    const mockTab = {
      id: 'p1',
      title: 'A very long pane tab title that must be truncated with ellipsis',
      type: 'terminal' as const,
      sessionId: 'sess1',
      agentId: 'claude',
      isPlugin: false,
    };

    const { container } = render(
      <DraggableTab
        tab={mockTab}
        paneId="pane1"
        isActive={false}
        onActivate={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
        onRename={vi.fn()}
        canClose={true}
      />
    );

    const titleSpan = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === mockTab.title
    );
    expect(titleSpan, 'title span not found').toBeTruthy();
    expect(titleSpan!.className).toContain('truncate');
  });

  it('tab button has min-w-0 and max-w classes', async () => {
    const { DraggableTab } = await import('../../src/renderer/components/layout/PaneView');

    const mockTab = {
      id: 'p2',
      title: 'Another long title',
      type: 'terminal' as const,
      sessionId: 'sess2',
      agentId: 'shell',
      isPlugin: false,
    };

    const { container } = render(
      <DraggableTab
        tab={mockTab}
        paneId="pane2"
        isActive={true}
        onActivate={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
        onRename={vi.fn()}
        canClose={false}
      />
    );

    const button = container.querySelector('button');
    expect(button, 'tab button not found').toBeTruthy();
    expect(button!.className).toContain('min-w-0');
    expect(button!.className).toMatch(/max-w-/);
  });

  it('close button has shrink-0', async () => {
    const { DraggableTab } = await import('../../src/renderer/components/layout/PaneView');

    const mockTab = {
      id: 'p3',
      title: 'Tab title',
      type: 'terminal' as const,
      sessionId: 'sess3',
      agentId: 'claude',
      isPlugin: false,
    };

    const { container } = render(
      <DraggableTab
        tab={mockTab}
        paneId="pane3"
        isActive={false}
        onActivate={vi.fn()}
        onClose={vi.fn()}
        onContextMenu={vi.fn()}
        onRename={vi.fn()}
        canClose={true}
      />
    );

    const closeBtn = container.querySelector('span[role="button"]');
    expect(closeBtn, 'close button not found').toBeTruthy();
    expect(closeBtn!.className).toContain('shrink-0');
  });
});

// ---------------------------------------------------------------------------
// WorkspaceNav tab row structural test
// ---------------------------------------------------------------------------
describe('WorkspaceNav tab row – title overflow', () => {
  it('WorkspaceNav module exports WorkspaceNav component', async () => {
    const mod = await import('../../src/renderer/components/workspace/WorkspaceNav');
    expect(mod.WorkspaceNav).toBeDefined();
  });
});
