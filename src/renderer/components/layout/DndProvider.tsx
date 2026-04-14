import { type ReactNode, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
  DragOverlay,
  pointerWithin,
  closestCenter,
} from '@dnd-kit/core';

// Use cursor position (not dragged item rect) for pane droppable detection.
// rectIntersection keeps the tab's virtual rect in the tab bar zone (y=0-36),
// so it never intersects the content area droppable (y=36+) during horizontal drags.
// pointerWithin correctly detects the content area when the cursor enters it.
// Fall back to closestCenter for gaps between tabs during reorder.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};
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

    // Pane drop zone: overData has paneId but NO tab field.
    // Tab sortable data: overData has BOTH paneId and tab.
    // Must distinguish — otherwise tab-to-tab drops enter this branch and return early,
    // skipping reorder entirely.
    if (overData?.paneId && !overData?.tab) {
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

      const sourcePaneTabCount = useLayoutStore.getState().getAllPanes().find((p) => p.id === sourcePaneId)?.tabs.length ?? 0;
      if (dropEdge !== 'center' && tab && (!isSamePane || sourcePaneTabCount > 1)) {
        // Edge drop → split pane (cross-pane always; same-pane only when source has >1 tab)
        const direction = (dropEdge === 'left' || dropEdge === 'right') ? 'horizontal' : 'vertical';
        const position = (dropEdge === 'left' || dropEdge === 'top') ? 'before' : 'after';
        useLayoutStore.getState().splitPaneWithTab(targetPaneId, direction, position, tab, sourcePaneId);
      } else if (!isSamePane) {
        // Center drop on different pane → move tab
        useLayoutStore.getState().moveTab(sourcePaneId, targetPaneId, active.id as string);
      }
      // Same-pane center drop on content area: no-op
      return;
    }

    // Tab-to-tab drop (overData has tab field, or over is an unknown droppable)
    if (active.id !== over.id) {
      const overPaneId = overData?.paneId as string | undefined;

      if (overPaneId && overPaneId !== sourcePaneId) {
        // Cross-pane tab-to-tab: move tab to the other pane
        useLayoutStore.getState().moveTab(sourcePaneId, overPaneId, active.id as string);
      } else {
        // Same-pane tab-to-tab: reorder
        const pane = useLayoutStore.getState().getAllPanes().find((p) => p.id === sourcePaneId);
        if (pane) {
          const oldIndex = pane.tabs.findIndex((t) => t.id === active.id);
          const newIndex = pane.tabs.findIndex((t) => t.id === over.id);
          if (oldIndex >= 0 && newIndex >= 0) {
            useLayoutStore.getState().reorderTab(sourcePaneId, oldIndex, newIndex);
          }
        }
      }
    }
  }, [draggingTab, restoreIframePointerEvents]);

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
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
