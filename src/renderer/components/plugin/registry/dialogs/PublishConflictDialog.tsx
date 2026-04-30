import { useState } from 'react';
import { BaseDialog } from './BaseDialog';

interface PublishConflictDialogProps {
  open: boolean;
  onClose: () => void;
  pluginName: string;
  workspaceVersion: string;
  registryVersion: string;
  onPullLatest: () => Promise<void>;
}

const WarningIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="text-aide-accent-warning"
    aria-hidden="true"
  >
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);

export function PublishConflictDialog({
  open,
  onClose,
  pluginName,
  workspaceVersion,
  registryVersion,
  onPullLatest,
}: PublishConflictDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handlePull = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onPullLatest();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Pull latest before publishing"
      width={480}
      headerIcon={<WarningIcon />}
      footer={
        <>
          <button
            onClick={onClose}
            data-testid="publish-conflict-cancel"
            className="px-3 py-1.5 text-xs font-mono rounded border border-aide-border text-aide-text-secondary hover:text-aide-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePull}
            disabled={submitting}
            data-testid="publish-conflict-pull"
            className="px-3 py-1.5 text-xs font-mono rounded bg-aide-accent text-aide-background hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Pulling…' : 'Pull latest'}
          </button>
        </>
      }
    >
      <p className="text-xs font-mono text-aide-text-primary leading-relaxed">
        Registry has a newer version (
        <span className="font-semibold">{registryVersion}</span>) than your base
        of <span className="font-semibold">{pluginName}</span> (
        <span className="font-semibold">{workspaceVersion}</span>). Publishing
        now is blocked.
      </p>

      <div className="flex items-center justify-center gap-3 my-5">
        <div
          className="bg-aide-background border border-aide-border rounded text-center"
          style={{ padding: '12px 16px', minWidth: 110 }}
        >
          <div className="text-[10px] font-mono text-aide-text-tertiary uppercase tracking-wider">
            Your base
          </div>
          <div className="text-base font-mono text-aide-text-primary mt-1">
            {workspaceVersion}
          </div>
        </div>
        <span className="text-aide-text-tertiary">→</span>
        <div
          className="bg-aide-background border border-aide-accent rounded text-center"
          style={{ padding: '12px 16px', minWidth: 110 }}
        >
          <div className="text-[10px] font-mono text-aide-accent uppercase tracking-wider">
            Registry latest
          </div>
          <div className="text-base font-mono text-aide-accent mt-1">
            {registryVersion}
          </div>
        </div>
      </div>

      <p className="text-[11px] font-mono text-aide-text-tertiary leading-relaxed">
        Pull the latest version first, then re-apply your changes if needed.
      </p>
    </BaseDialog>
  );
}
