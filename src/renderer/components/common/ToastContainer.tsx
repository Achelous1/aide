import { useEffect } from 'react';
import { useToastStore } from '../../stores/toast-store';
import type { ToastMessage } from '../../stores/toast-store';

const AUTO_DISMISS_MS = 8000;
const MAX_VISIBLE = 3;

function Toast({ toast }: { toast: ToastMessage }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  const isError = toast.kind === 'error';
  const isWarning = toast.kind === 'warning';

  const accentBarClass = isError
    ? 'bg-smalti-crimson'
    : isWarning
      ? 'bg-aide-accent-warning'
      : 'bg-aide-accent';

  return (
    <div
      className="relative flex gap-3 rounded-md border border-aide-border bg-aide-surface-elevated shadow-lg overflow-hidden"
      style={{ padding: '10px 12px', minWidth: '280px', maxWidth: '380px' }}
      role="alert"
      aria-live="assertive"
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${accentBarClass}`}
      />

      {/* Content */}
      <div className="flex flex-col gap-1 ml-2 flex-1 min-w-0">
        <span className="text-aide-text-primary font-semibold leading-snug" style={{ fontSize: '13px' }}>
          {toast.title}
        </span>
        {toast.detail && (
          <span className="text-aide-text-secondary leading-snug break-words" style={{ fontSize: '11px' }}>
            {toast.detail}
          </span>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-aide-text-tertiary hover:text-aide-text-secondary transition-colors leading-none"
        style={{ fontSize: '14px', lineHeight: 1, alignSelf: 'flex-start' }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const visible = toasts.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col gap-2 z-[9999]"
      aria-label="Notifications"
    >
      {visible.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
