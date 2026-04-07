import { useState, useCallback, useRef } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { AgentDropdown } from '../terminal/AgentDropdown';
import { PluginView } from '../plugin/PluginView';
import { EmptyState } from './EmptyState';
import { useLayoutStore } from '../../stores/layout-store';
import { useTerminalStore } from '../../stores/terminal-store';
import type { Pane, TerminalTab } from '../../../types/ipc';

const AGENT_COLORS: Record<string, string> = {
  claude: 'var(--agent-claude)',
  gemini: 'var(--agent-gemini)',
  codex: 'var(--agent-codex)',
  shell: 'var(--text-tertiary)',
};

// --- Draggable Tab ---

interface DraggableTabProps {
  tab: TerminalTab;
  paneId: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  canClose: boolean;
}

function DraggableTab({ tab, paneId, isActive, onActivate, onClose, onContextMenu, canClose }: DraggableTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: tab.id,
    data: { tab, paneId },
  });
  const isPlugin = tab.type === 'plugin';
  const dotColor = AGENT_COLORS[tab.agentId ?? 'shell'] ?? AGENT_COLORS.shell;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div className="relative flex items-stretch h-full">
      {/* Insert position indicator — 2px blue vertical line on the left when a tab is dragged over */}
      {isOver && !isDragging && (
        <span className="drag-insert-line" />
      )}
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onActivate}
        onContextMenu={onContextMenu}
        className={`group relative flex items-center gap-1.5 px-3 h-full text-[12px] font-mono transition-colors ${
          isActive
            ? 'bg-aide-tab-active-bg text-aide-text-primary'
            : 'bg-aide-tab-inactive-bg text-aide-text-secondary hover:text-aide-text-primary'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {isActive && (
          <span className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: 'var(--accent)' }} />
        )}
        <span className="drag-handle-icon">⠿</span>
        {isPlugin ? (
          <span className="text-[12px] shrink-0" style={{ color: 'var(--accent)' }}>◈</span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        )}
        <span>{tab.title}</span>
        {canClose && (
          <span
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onClose(e as unknown as React.MouseEvent);
            }}
            className="ml-1 opacity-0 group-hover:opacity-100 text-[10px] text-aide-text-tertiary hover:text-aide-text-primary transition-opacity leading-none"
          >
            ×
          </span>
        )}
      </button>
    </div>
  );
}

// --- PaneView ---

interface PaneViewProps {
  pane: Pane;
  showHeader?: boolean;
}

interface ContextMenu {
  x: number;
  y: number;
  tabId: string;
}

export function PaneView({ pane, showHeader = false }: PaneViewProps) {
  const focusedPaneId = useLayoutStore((s) => s.focusedPaneId);
  const setFocusedPane = useLayoutStore((s) => s.setFocusedPane);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const removeTabFromPane = useLayoutStore((s) => s.removeTabFromPane);
  const splitPane = useLayoutStore((s) => s.splitPane);
  const closePaneAndMergeTabs = useLayoutStore((s) => s.closePaneAndMergeTabs);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Edge detection for drag-to-split
  type DropEdge = 'left' | 'right' | 'top' | 'bottom' | 'center' | null;
  const [dropEdge, setDropEdge] = useState<DropEdge>(null);
  const [draggingSourcePaneId, setDraggingSourcePaneId] = useState<string | null>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Droppable zone for cross-pane drops
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `pane-drop-${pane.id}`,
    data: { paneId: pane.id, dropEdge },
  });

  // Combine refs
  const setDropRefs = useCallback((node: HTMLDivElement | null) => {
    setDropRef(node);
    (dropAreaRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [setDropRef]);

  // Track mouse position during drag to detect edge, and source pane for cross-pane detection
  useDndMonitor({
    onDragStart(event) {
      const sourcePaneId = event.active.data.current?.paneId as string | undefined;
      setDraggingSourcePaneId(sourcePaneId ?? null);
    },
    onDragMove(event) {
      if (!isOver || !dropAreaRef.current) { setDropEdge(null); return; }
      const rect = dropAreaRef.current.getBoundingClientRect();
      const x = (event.activatorEvent as MouseEvent).clientX + (event.delta?.x ?? 0);
      const y = (event.activatorEvent as MouseEvent).clientY + (event.delta?.y ?? 0);
      const relX = (x - rect.left) / rect.width;
      const relY = (y - rect.top) / rect.height;

      // Determine edge (30% threshold)
      if (relX < 0.3) setDropEdge('left');
      else if (relX > 0.7) setDropEdge('right');
      else if (relY < 0.3) setDropEdge('top');
      else if (relY > 0.7) setDropEdge('bottom');
      else setDropEdge('center');
    },
    onDragEnd() { setDropEdge(null); setDraggingSourcePaneId(null); },
    onDragCancel() { setDropEdge(null); setDraggingSourcePaneId(null); },
  });

  const isCrossPaneDrag = draggingSourcePaneId !== null && draggingSourcePaneId !== pane.id;

  const isFocused = focusedPaneId === pane.id;
  const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0];

  const handleCloseTab = useCallback(async (tab: TerminalTab, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tab.sessionId && tab.type !== 'plugin') {
      try { await window.aide.terminal.kill(tab.sessionId); } catch { /* ignore */ }
    }
    removeTabFromPane(pane.id, tab.id);
    useTerminalStore.getState().removeTab(tab.id);
  }, [pane.id, removeTabFromPane]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  const handleSplit = useCallback((direction: 'horizontal' | 'vertical') => {
    if (contextMenu) {
      setActiveTab(pane.id, contextMenu.tabId);
    }
    splitPane(pane.id, direction);
    setContextMenu(null);
  }, [pane.id, contextMenu, setActiveTab, splitPane]);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      onClick={() => { setFocusedPane(pane.id); setContextMenu(null); }}
    >
      {/* TabBar — tabs are draggable via parent DndContext */}
      <div
        className="relative flex items-end w-full bg-aide-surface shrink-0"
        style={{
          height: '36px',
          borderBottom: isFocused ? '2px solid var(--accent)' : '1px solid var(--border)',
        }}
      >
        <SortableContext items={pane.tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          {pane.tabs.map((tab) => (
            <DraggableTab
              key={tab.id}
              tab={tab}
              paneId={pane.id}
              isActive={tab.id === pane.activeTabId}
              canClose={true}
              onActivate={() => setActiveTab(pane.id, tab.id)}
              onClose={(e) => handleCloseTab(tab, e)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center justify-center px-3 h-full text-[14px] text-aide-text-tertiary bg-aide-surface hover:text-aide-text-primary transition-colors"
        >
          +
        </button>

        {dropdownOpen && <AgentDropdown paneId={pane.id} onClose={() => setDropdownOpen(false)} />}
      </div>

      {/* Pane Header (multi-pane mode) */}
      {showHeader && activeTab && (
        <div className="flex items-center gap-2 shrink-0 bg-aide-surface px-3 border-b border-aide-border" style={{ height: '28px' }}>
          {activeTab.type === 'plugin' ? (
            <span className="text-[12px]" style={{ color: 'var(--accent)' }}>◈</span>
          ) : (
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: AGENT_COLORS[activeTab.agentId ?? 'shell'] ?? AGENT_COLORS.shell }}
            />
          )}
          <span className="text-[11px] font-mono text-aide-text-secondary truncate flex-1">{activeTab.title}</span>
          <button
            onClick={(e) => { e.stopPropagation(); closePaneAndMergeTabs(pane.id); }}
            className="text-[12px] text-aide-text-tertiary hover:text-aide-text-primary transition-colors leading-none"
            title="Close pane (merge tabs to sibling)"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content area — also a drop zone */}
      <div ref={setDropRefs} data-pane-drop={pane.id} className="flex-1 overflow-hidden relative">
        {/* Cross-pane center drop overlay */}
        {isOver && isCrossPaneDrag && dropEdge === 'center' && (
          <div className="drag-drop-overlay">
            <span className="drag-drop-overlay__text">◈ Drop tab here</span>
          </div>
        )}
        {/* Edge split preview overlay */}
        {isOver && dropEdge && dropEdge !== 'center' && (
          <div
            className="absolute z-30 flex items-center justify-center pointer-events-none rounded-sm"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              ...(dropEdge === 'left' ? { top: 4, left: 4, bottom: 4, width: 'calc(50% - 6px)' } :
                 dropEdge === 'right' ? { top: 4, right: 4, bottom: 4, width: 'calc(50% - 6px)' } :
                 dropEdge === 'top' ? { top: 4, left: 4, right: 4, height: 'calc(50% - 6px)' } :
                 { bottom: 4, left: 4, right: 4, height: 'calc(50% - 6px)' }),
            }}
          >
            <span className="text-[12px] font-mono" style={{ color: '#3B82F6' }}>
              {dropEdge === 'left' ? '← Split Left' :
               dropEdge === 'right' ? 'Split Right →' :
               dropEdge === 'top' ? '↑ Split Top' : 'Split Bottom ↓'}
            </span>
          </div>
        )}
        {pane.tabs.length === 0 ? (
          <EmptyState paneId={pane.id} />
        ) : (
          pane.tabs.map((tab) => {
            const isVisible = tab.id === pane.activeTabId;
            if (tab.type === 'plugin') {
              return (
                <div key={tab.id} className="absolute inset-0" style={{ display: isVisible ? 'block' : 'none' }}>
                  <PluginView pluginId={tab.pluginId ?? tab.id} pluginName={tab.title} />
                </div>
              );
            }
            return (
              <div key={tab.id} className="absolute inset-0" style={{ display: isVisible ? 'block' : 'none' }}>
                {tab.sessionId && <TerminalPanel sessionId={tab.sessionId} visible={isVisible && isFocused} />}
              </div>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 w-44 rounded-md border border-aide-border bg-aide-surface-elevated shadow-lg py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleSplit('horizontal')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono text-aide-text-primary hover:bg-aide-surface text-left"
            >
              Split Right
            </button>
            <button
              onClick={() => handleSplit('vertical')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-mono text-aide-text-primary hover:bg-aide-surface text-left"
            >
              Split Down
            </button>
          </div>
        </>
      )}
    </div>
  );
}
