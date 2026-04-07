import { type ReactNode, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { useLayoutStore } from '../../stores/layout-store';
import type { TerminalTab } from '../../../types/ipc';

const AGENT_COLORS: Record<string, string> = {
  claude: 'var(--agent-claude)',
  gemini: 'var(--agent-gemini)',
  codex: 'var(--agent-codex)',
  shell: 'var(--text-tertiary)',
};

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const [draggingTab, setDraggingTab] = useState<{ tab: TerminalTab; sourcePaneId: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  // Stash original pointer-events of iframes so we can restore them after drag
  const iframePointerEventsRef = useRef<Map<HTMLIFrameElement, string>>(new Map());

  // Disable pointer events on all iframes during drag — otherwise iframes capture
  // the cursor and dnd-kit loses the pointer, breaking the drag mid-gesture.
  const disableIframePointerEvents = useCallback(() => {
    const iframes = document.querySelectorAll('iframe');
    const map = iframePointerEventsRef.current;
    map.clear();
    iframes.forEach((iframe) => {
      map.set(iframe, iframe.style.pointerEvents);
      iframe.style.pointerEvents = 'none';
    });
  }, []);

  const restoreIframePointerEvents = useCallback(() => {
    const map = iframePointerEventsRef.current;
    map.forEach((original, iframe) => {
      iframe.style.pointerEvents = original;
    });
    map.clear();
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.tab && data?.paneId) {
      setDraggingTab({ tab: data.tab as TerminalTab, sourcePaneId: data.paneId as string });
      disableIframePointerEvents();
    }
  }, [disableIframePointerEvents]);

  const handleDragCancel = useCallback(() => {
    setDraggingTab(null);
    restoreIframePointerEvents();
  }, [restoreIframePointerEvents]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingTab(null);
    restoreIframePointerEvents();

    if (!over || !draggingTab) return;

    const sourceData = active.data.current;
    const overData = over.data.current;
    if (!sourceData) return;

    const sourcePaneId = sourceData.paneId as string;

    // Dropped on a pane drop zone (cross-pane move, split, or same-pane edge split)
    if (overData?.paneId) {
      const targetPaneId = overData.paneId as string;
      const tab = sourceData.tab as TerminalTab;
      const isSamePane = targetPaneId === sourcePaneId;

      // Calculate edge from drop coordinates via DOM
      let dropEdge: 'left' | 'right' | 'top' | 'bottom' | 'center' = 'center';
      const droppableEl = document.querySelector(`[data-pane-drop="${targetPaneId}"]`);
      const rect = droppableEl?.getBoundingClientRect();
      if (rect) {
        const mouseX = (event.activatorEvent as MouseEvent).clientX + (event.delta?.x ?? 0);
        const mouseY = (event.activatorEvent as MouseEvent).clientY + (event.delta?.y ?? 0);
        const relX = (mouseX - rect.left) / rect.width;
        const relY = (mouseY - rect.top) / rect.height;

        if (relX < 0.3) dropEdge = 'left';
        else if (relX > 0.7) dropEdge = 'right';
        else if (relY < 0.3) dropEdge = 'top';
        else if (relY > 0.7) dropEdge = 'bottom';
      }

      if (dropEdge !== 'center' && tab) {
        // Edge drop → split pane (works for both same-pane and cross-pane)
        const direction = (dropEdge === 'left' || dropEdge === 'right') ? 'horizontal' : 'vertical';
        const position = (dropEdge === 'left' || dropEdge === 'top') ? 'before' : 'after';
        useLayoutStore.getState().splitPaneWithTab(targetPaneId, direction, position, tab, sourcePaneId);
      } else if (!isSamePane) {
        // Center drop on different pane → move tab
        useLayoutStore.getState().moveTab(sourcePaneId, targetPaneId, active.id as string);
      }
      return;
    }

    // Dropped on a tab in the same pane (reorder via sortable)
    if (sourceData?.paneId && active.id !== over.id) {
      const paneId = sourceData.paneId as string;
      const pane = useLayoutStore.getState().getAllPanes().find((p) => p.id === paneId);
      if (pane) {
        const oldIndex = pane.tabs.findIndex((t) => t.id === active.id);
        const newIndex = pane.tabs.findIndex((t) => t.id === over.id);
        if (oldIndex >= 0 && newIndex >= 0) {
          useLayoutStore.getState().reorderTab(paneId, oldIndex, newIndex);
        }
      }
    }
  }, [draggingTab, restoreIframePointerEvents]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      {children}
      <DragOverlay>
        {draggingTab && (
          <div
            className="flex items-center gap-1.5 px-3 h-8 text-[12px] font-mono text-aide-text-primary"
            style={{
              opacity: 0.92,
              border: '1px solid #3B82F6',
              borderRadius: 6,
              background: 'var(--surface-elevated)',
            }}
          >
            {draggingTab.tab.type === 'plugin' ? (
              <span style={{ color: 'var(--accent)' }}>◈</span>
            ) : (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: AGENT_COLORS[draggingTab.tab.agentId ?? 'shell'] ?? AGENT_COLORS.shell }}
              />
            )}
            <span>{draggingTab.tab.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
