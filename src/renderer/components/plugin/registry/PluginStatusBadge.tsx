import type { SyncStatus } from '../../../../types/plugin-registry';

interface PluginStatusBadgeProps {
  status: SyncStatus;
  latestVersion?: string;
}

/**
 * Small pill badge showing a plugin's sync status with the global registry.
 * Color-coded per status:
 * - synced            → accent (cyan)
 * - update-available  → accent-info (sky blue) + "update X.Y.Z →"
 * - locally-modified  → accent-warning (gold)
 * - unknown           → text-tertiary (local only)
 */
export function PluginStatusBadge({ status, latestVersion }: PluginStatusBadgeProps) {
  const cfg = (() => {
    switch (status) {
      case 'synced':
        return {
          label: 'synced',
          cls: 'bg-aide-accent/15 text-aide-accent border border-aide-accent/40',
          testColor: 'accent',
        };
      case 'update-available':
        return {
          label: latestVersion ? `update ${latestVersion} →` : 'update available',
          cls: 'bg-aide-accent-info/15 text-aide-accent-info border border-aide-accent-info/40',
          testColor: 'accent-info',
        };
      case 'locally-modified':
        return {
          label: 'locally modified',
          cls: 'bg-aide-accent-warning/15 text-aide-accent-warning border border-aide-accent-warning/40',
          testColor: 'accent-warning',
        };
      case 'unknown':
      default:
        return {
          label: 'local only',
          cls: 'bg-aide-text-tertiary/15 text-aide-text-tertiary border border-aide-text-tertiary/40',
          testColor: 'tertiary',
        };
    }
  })();

  return (
    <span
      data-status={status}
      data-color={cfg.testColor}
      className={`inline-flex items-center font-mono leading-none rounded ${cfg.cls}`}
      style={{ fontSize: 10, padding: '2px 6px' }}
    >
      {cfg.label}
    </span>
  );
}
