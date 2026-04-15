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
      return "AIDE can't read this folder. Grant Full Disk Access in System Settings.";
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
    <div
      style={{
        width: '100%',
        padding: '12px',
        background: '#1A1C23',
        borderBottom: '1px solid #2E3140',
        fontFamily: 'monospace',
        flexShrink: 0,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#F59E0B', fontSize: '11px' }}>⚠</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#E8E9ED' }}>Permission Required</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#5C5E6A',
            fontSize: '12px',
            lineHeight: 1,
            padding: '0 2px',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#E8E9ED'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#5C5E6A'; }}
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p
        style={{
          margin: '0 0 8px 0',
          fontSize: '10px',
          color: '#8B8D98',
          lineHeight: 1.4,
        }}
      >
        {description}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {showOpenSettings && (
          <button
            type="button"
            onClick={handleOpenSettings}
            style={{
              height: '24px',
              padding: '0 8px',
              background: '#10B981',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'monospace',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Open Settings
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          style={{
            height: '24px',
            padding: '0 8px',
            background: '#24262E',
            color: '#E8E9ED',
            border: '1px solid #2E3140',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
