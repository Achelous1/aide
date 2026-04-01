import { useCallback, useRef } from 'react';
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

  return (
    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full`}>
      {node.children.map((child, i) => (
        <div key={child.id} className="flex" style={{ display: 'contents' }}>
          <div
            style={{
              flexBasis: `${node.sizes[i]}%`,
              flexGrow: 0,
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <SplitContainer node={child} />
          </div>
          {i < node.children.length - 1 && (
            <ResizeDivider
              splitId={node.id}
              index={i}
              direction={node.direction}
              sizes={node.sizes}
            />
          )}
        </div>
      ))}
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
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSizes = useRef<number[]>([]);

  const isHorizontal = direction === 'horizontal';

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSizes.current = [...sizes];

      const parentEl = (e.target as HTMLElement).parentElement?.parentElement;
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
        const minSize = 10; // minimum 10%
        newSizes[index] = Math.max(minSize, startSizes.current[index] + deltaPct);
        newSizes[index + 1] = Math.max(minSize, startSizes.current[index + 1] - deltaPct);

        resizePanes(splitId, newSizes);
      };

      const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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
      onMouseDown={onMouseDown}
      className={`shrink-0 bg-aide-border hover:bg-blue-500 transition-colors relative group ${
        isHorizontal ? 'cursor-col-resize' : 'cursor-row-resize'
      }`}
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
    </div>
  );
}
