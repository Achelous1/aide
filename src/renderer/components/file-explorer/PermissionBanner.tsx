import type { FsReadTreeError } from '../../../types/ipc';

interface PermissionBannerProps {
  errorCode: FsReadTreeError['code'];
  errorPath: string;
  errorMessage: string;
  onRetry: () => void;
  onDismiss: () => void;
}

function getDescription(errorCode: FsReadTreeError['code'], errorPath: string, errorMessage: string): string {
  const parts = errorPath.replace(/\\/g, '/').split('/');
  const basename = parts[parts.length - 1] || errorPath;
  switch (errorCode) {
    case 'EPERM':
      return "smalti can't read this folder. Grant Full Disk Access in System Settings.";
    case 'ENOENT':
      return `Folder no longer exists: ${basename}`;
    case 'ENOTDIR':
      return `Path is not a directory: ${basename}`;
    default:
      return `Failed to read folder: ${errorMessage}`;
  }
}

export function PermissionBanner({ errorCode, errorPath, errorMessage, onRetry, onDismiss }: PermissionBannerProps) {
  const isDarwin = window.aide.system.isDarwin();
  const showOpenSettings = isDarwin && errorCode === 'EPERM';
  const description = getDescription(errorCode, errorPath, errorMessage);

  const handleOpenSettings = () => {
    window.aide.system.openPrivacySettings();
  };

  return (
    <div className="w-full flex-shrink-0 p-3 font-mono bg-aide-surface border-b border-aide-border">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-aide-accent-warning text-[11px]">⚠</span>
          <span className="text-[11px] font-semibold text-aide-text-primary">Permission Required</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss"
          className="bg-transparent border-0 cursor-pointer text-aide-text-tertiary hover:text-aide-text-primary text-[12px] leading-none px-0.5"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className="m-0 mb-2 text-[10px] text-aide-text-secondary leading-snug">
        {description}
      </p>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        {showOpenSettings && (
          <button
            type="button"
            onClick={handleOpenSettings}
            className="h-6 px-2 rounded text-[10px] font-mono font-semibold cursor-pointer bg-aide-accent text-aide-background border-0 hover:opacity-90 transition-opacity"
          >
            Open Settings
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="h-6 px-2 rounded text-[10px] font-mono cursor-pointer bg-aide-surface-elevated text-aide-text-primary border border-aide-border hover:bg-aide-border transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
