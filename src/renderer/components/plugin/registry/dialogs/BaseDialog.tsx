import { useEffect, useRef, type ReactNode } from 'react';

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional icon prefix in the header (e.g. warning triangle). */
  headerIcon?: ReactNode;
}

/**
 * Reusable modal dialog: centered card over a translucent overlay.
 * - ESC closes
 * - Overlay click closes
 * - Close (×) button autoFocus for basic keyboard accessibility
 */
export function BaseDialog({
  open,
  onClose,
  title,
  width = 480,
  children,
  footer,
  headerIcon,
}: BaseDialogProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      // Defer to next frame so the dialog mounts first
      requestAnimationFrame(() => closeBtnRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        data-overlay
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
      />
      <div
        className="relative bg-aide-surface-elevated border border-aide-border rounded-lg shadow-xl flex flex-col overflow-hidden"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b border-aide-border"
          style={{ padding: '20px 24px' }}
        >
          {headerIcon && <span className="shrink-0">{headerIcon}</span>}
          <h2 className="flex-1 font-mono text-aide-text-primary text-base font-semibold m-0 truncate">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="text-aide-text-tertiary hover:text-aide-text-primary transition-colors px-2 py-1 rounded -mr-2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }} className="text-aide-text-primary">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2 border-t border-aide-border bg-aide-surface"
            style={{ padding: '14px 24px' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
