import { useCallback, useRef, useState } from 'react';
import { PaneView } from './PaneView';
import { useLayoutStore } from '../../stores/layout-store';
import type { LayoutNode } from '../../../types/ipc';
import { isSplitLayout } from '../../../types/ipc';

function countPanes(node: LayoutNode): number {
  if (isSplitLayout(node)) {
    return node.children.reduce((sum, child) => sum + countPanes(child), 0);
  }
  return 1;
}

interface SplitContainerProps {
  node: LayoutNode;
}

export function SplitContainer({ node }: SplitContainerProps) {
  // Derive pane count from the layout tree (stable primitive selector)
  const layout = useLayoutStore((s) => s.layout);
  const paneCount = countPanes(layout);

  if (!isSplitLayout(node)) {
    return <PaneView pane={node} showHeader={paneCount > 1} />;
  }

  const isHorizontal = node.direction === 'horizontal';

  // Build children interleaved with dividers (no display:contents wrapper)
  const elements: React.ReactNode[] = [];
  node.children.forEach((child, i) => {
    elements.push(
      <div
        key={child.id}
        style={{
          [isHorizontal ? 'width' : 'height']: `calc(${node.sizes[i]}% - ${(node.children.length - 1) / node.children.length}px)`,
          flexShrink: 0,
          flexGrow: 0,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <SplitContainer node={child} />
      </div>,
    );
    if (i < node.children.length - 1) {
      elements.push(
        <ResizeDivider
          key={`div-${node.id}-${i}`}
          splitId={node.id}
          index={i}
          direction={node.direction}
          sizes={node.sizes}
        />,
      );
    }
  });

  return (
    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full`}>
      {elements}
    </div>
  );
}

// --- Inline ResizeDivider ---

interface ResizeDividerProps {
  splitId: string;
  index: number;
  direction: 'horizontal' | 'vertical';
  sizes: number[];
}

function ResizeDivider({ splitId, index, direction, sizes }: ResizeDividerProps) {
  const resizePanes = useLayoutStore((s) => s.resizePanes);
  const dividerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSizes = useRef<number[]>([]);
  const [isActive, setIsActive] = useState(false);

  const isHorizontal = direction === 'horizontal';

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      setIsActive(true);
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSizes.current = [...sizes];

      // Disable pointer events on all iframes during the resize drag.
      // Otherwise the cursor crossing a plugin iframe captures the mouse
      // events and the resize breaks mid-gesture. Restored on mouseup.
      const iframes = document.querySelectorAll('iframe');
      const savedPointerEvents = new Map<HTMLIFrameElement, string>();
      iframes.forEach((iframe) => {
        savedPointerEvents.set(iframe, iframe.style.pointerEvents);
        iframe.style.pointerEvents = 'none';
      });

      // The flex container is the divider's direct parent
      const parentEl = dividerRef.current?.parentElement;
      const parentSize = parentEl
        ? isHorizontal
          ? parentEl.offsetWidth
          : parentEl.offsetHeight
        : 1;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = isHorizontal ? ev.clientX - startPos.current : ev.clientY - startPos.current;
        const deltaPct = (delta / parentSize) * 100;

        const newSizes = [...startSizes.current];
        const minSize = 10;
        const pairTotal = startSizes.current[index] + startSizes.current[index + 1];
        const rawLeft = startSizes.current[index] + deltaPct;

        newSizes[index] = Math.max(minSize, Math.min(pairTotal - minSize, rawLeft));
        newSizes[index + 1] = pairTotal - newSizes[index];

        resizePanes(splitId, newSizes);
      };

      const onMouseUp = () => {
        dragging.current = false;
        setIsActive(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Restore iframe pointer events
        savedPointerEvents.forEach((original, iframe) => {
          iframe.style.pointerEvents = original;
        });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [splitId, index, sizes, isHorizontal, resizePanes],
  );

  return (
    <div
      ref={dividerRef}
      onMouseDown={onMouseDown}
      className={`resize-divider shrink-0 relative group ${
        isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'
      } ${isActive ? 'resize-divider--active' : ''}`}
      style={{
        [isHorizontal ? 'width' : 'height']: '1px',
      }}
      title="Drag to resize pane"
    >
      {/* Wider hit area */}
      <div
        className="absolute z-10"
        style={
          isHorizontal
            ? { top: 0, bottom: 0, left: -3, right: -3 }
            : { left: 0, right: 0, top: -3, bottom: -3 }
        }
      />
      {/* Direction icon — shown on hover and drag */}
      <div
        className="resize-divider__icon"
        style={
          isHorizontal
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        {isHorizontal ? '↔' : '↕'}
      </div>
    </div>
  );
}
