import { useState } from 'react';
import { BaseDialog } from './BaseDialog';

interface UpdateConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  pluginName: string;
  latestVersion: string;
  modifiedFiles: string[];
  onConfirm: () => Promise<void>;
  onForkInstead: () => void;
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

export function UpdateConfirmDialog({
  open,
  onClose,
  pluginName,
  latestVersion,
  modifiedFiles,
  onConfirm,
  onForkInstead,
}: UpdateConfirmDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Update will overwrite local changes"
      width={480}
      headerIcon={<WarningIcon />}
      footer={
        <>
          <button
            onClick={onClose}
            data-testid="update-cancel"
            className="px-3 py-1.5 text-xs font-mono rounded border border-aide-border text-aide-text-secondary hover:text-aide-text-primary transition-colors mr-auto"
          >
            Cancel
          </button>
          <button
            onClick={onForkInstead}
            data-testid="update-fork-instead"
            className="px-3 py-1.5 text-xs font-mono rounded text-aide-text-secondary hover:text-aide-text-primary transition-colors"
          >
            Fork instead
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="update-discard"
            className="px-3 py-1.5 text-xs font-mono rounded bg-smalti-crimson text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Updating…' : 'Discard & update'}
          </button>
        </>
      }
    >
      <p className="text-xs font-mono text-aide-text-primary leading-relaxed">
        <span className="font-semibold">{pluginName}</span> has local
        modifications that will be lost when updating to{' '}
        <span className="font-semibold">{latestVersion}</span>.
      </p>

      {modifiedFiles.length > 0 && (
        <div
          className="mt-3 bg-aide-background border border-aide-border rounded font-mono text-[11px] text-aide-text-secondary"
          style={{ padding: '10px 14px' }}
        >
          {modifiedFiles.map((file) => (
            <div key={file} className="flex items-center gap-3 py-0.5">
              <span className="text-aide-text-primary">{file}</span>
              <span className="text-aide-text-tertiary">·</span>
              <span>modified</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] font-mono text-aide-text-tertiary leading-relaxed">
        To preserve your changes, fork the plugin first.
      </p>
    </BaseDialog>
  );
}
