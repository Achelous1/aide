import { useEffect, useState } from 'react';
import { BaseDialog } from './BaseDialog';

interface ForkAsNewPluginDialogProps {
  open: boolean;
  onClose: () => void;
  originalPluginName: string;
  originalPluginId: string;
  onConfirm: (opts: {
    newName: string;
    newDescription: string;
    restoreOriginal: boolean;
  }) => Promise<void>;
}

export function ForkAsNewPluginDialog({
  open,
  onClose,
  originalPluginName,
  originalPluginId,
  onConfirm,
}: ForkAsNewPluginDialogProps) {
  const [newName, setNewName] = useState(`${originalPluginName}-fork`);
  const [newDescription, setNewDescription] = useState(
    `Custom variant of ${originalPluginName}`
  );
  const [restoreOriginal, setRestoreOriginal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open with the (possibly updated) original name
  useEffect(() => {
    if (open) {
      setNewName(`${originalPluginName}-fork`);
      setNewDescription(`Custom variant of ${originalPluginName}`);
      setRestoreOriginal(false);
      setSubmitting(false);
    }
  }, [open, originalPluginName]);

  const handleConfirm = async () => {
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        newName: newName.trim(),
        newDescription: newDescription.trim(),
        restoreOriginal,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Fork as new plugin"
      width={480}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono rounded border border-aide-border text-aide-text-secondary hover:text-aide-text-primary hover:border-aide-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!newName.trim() || submitting}
            data-testid="fork-confirm"
            className="px-3 py-1.5 text-xs font-mono rounded bg-aide-accent text-aide-background hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Forking…' : 'Fork plugin'}
          </button>
        </>
      }
    >
      <p className="text-xs font-mono text-aide-text-secondary mb-4 leading-relaxed">
        This creates a new plugin with its own identity. Updates from the
        original will no longer apply.
      </p>

      <label className="block">
        <span className="text-xs font-mono text-aide-text-primary">New name</span>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          data-testid="fork-name-input"
          className="mt-1 w-full bg-aide-background border border-aide-border rounded px-3 py-2 text-xs font-mono text-aide-text-primary focus:outline-none focus:border-aide-accent"
        />
      </label>

      <label className="block mt-4">
        <span className="text-xs font-mono text-aide-text-primary">Description</span>
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          data-testid="fork-description-input"
          className="mt-1 w-full bg-aide-background border border-aide-border rounded px-3 py-2 text-xs font-mono text-aide-text-primary focus:outline-none focus:border-aide-accent"
        />
      </label>

      <fieldset className="mt-5">
        <legend className="text-xs font-mono text-aide-text-primary mb-2">
          Original plugin
        </legend>
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <input
            type="radio"
            name={`fork-original-${originalPluginId}`}
            checked={!restoreOriginal}
            onChange={() => setRestoreOriginal(false)}
            data-testid="fork-keep-original"
            className="accent-aide-accent"
          />
          <span className="text-xs font-mono text-aide-text-primary">
            Keep original as-is (recommended)
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <input
            type="radio"
            name={`fork-original-${originalPluginId}`}
            checked={restoreOriginal}
            onChange={() => setRestoreOriginal(true)}
            data-testid="fork-restore-original"
            className="accent-aide-accent"
          />
          <span className="text-xs font-mono text-aide-text-primary">
            Restore original to upstream
          </span>
        </label>
      </fieldset>
    </BaseDialog>
  );
}
