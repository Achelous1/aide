/**
 * Tooltip — renders via ReactDOM.createPortal into document.body to escape
 * overflow:hidden / overflow:auto ancestors (e.g. the scrollable workspace list).
 *
 * Positioning uses position:fixed with coordinates read from
 * wrapperRef.getBoundingClientRect() at the moment of show. Centering is
 * done via CSS transform translate(-50%, ...), so actual tooltip dimensions
 * do not need to be measured.
 *
 * Known limitation: Viewport edge clamping is not implemented — tooltips
 * near the viewport edge may overflow horizontally.
 */
import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'right';
  className?: string;
}

const GAP = 6; // px between wrapper and tooltip

export function Tooltip({ content, children, placement = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  // Anchor point — actual centering is done via CSS transform in the tooltip div
  function computeCoords(): { top: number; left: number } {
    if (!wrapperRef.current) return { top: 0, left: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    switch (placement) {
      case 'bottom':
        return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
      case 'right':
        return { top: rect.top + rect.height / 2, left: rect.right + GAP };
      case 'top':
      default:
        return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
    }
  }

  const transformByPlacement: Record<NonNullable<TooltipProps['placement']>, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    right: 'translate(0, -50%)',
  };

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCoords(computeCoords());
      setVisible(true);
    }, 200);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const tooltip = visible
    ? createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          style={{ top: coords.top, left: coords.left, transform: transformByPlacement[placement] }}
          className="fixed z-[9999] max-w-xs whitespace-pre-wrap rounded px-2 py-1 text-[10px] font-mono
            bg-aide-surface-elevated border border-aide-border text-aide-text-primary shadow-md
            pointer-events-none"
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return (
    <div
      ref={wrapperRef}
      data-tooltip-wrapper
      className={`relative inline-flex${className ? ` ${className}` : ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') hide();
      }}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {tooltip}
    </div>
  );
}
