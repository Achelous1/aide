import type { AgentStatus } from '../../../types/ipc';

/**
 * Visual indicators for agent status.
 * - idle:            blue ● dot (#3B82F6)
 * - processing:      three yellow bouncing dots (#F59E0B)
 * - awaiting-input:  bold yellow ? (#F59E0B)
 *
 * All three trigger the `status-ding` keyframe animation on status change
 * via React `key={status}` remount.
 */

const STATUS_COLORS = {
  idle: '#3B82F6',
  processing: '#F59E0B',
  awaiting: '#F59E0B',
} as const;

/** Three bouncing dots with phase-offset animation (typing indicator) */
export function BouncingDots({ color, size = 3 }: { color: string; size?: number }) {
  return (
    <span className="inline-flex items-end gap-[1px]" style={{ height: size + 3 }} data-testid="bouncing-dots">
      <span className="dot-bounce rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
      <span className="dot-bounce rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
      <span className="dot-bounce rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
    </span>
  );
}

/** Inline status dot used in the expanded tab list */
export function StatusDot({ status }: { status: AgentStatus }) {
  if (status === 'idle') {
    return (
      <span
        key="idle"
        data-testid="status-dot"
        data-status="idle"
        className="status-ding text-[10px] leading-none"
        style={{ color: STATUS_COLORS.idle }}
      >
        ●
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span
        key="processing"
        data-testid="status-dot"
        data-status="processing"
        className="status-ding inline-flex items-center leading-none"
      >
        <BouncingDots color={STATUS_COLORS.processing} size={3} />
      </span>
    );
  }
  // awaiting-input
  return (
    <span
      key="awaiting"
      data-testid="status-dot"
      data-status="awaiting-input"
      className="status-ding text-[10px] leading-none font-bold"
      style={{ color: STATUS_COLORS.awaiting }}
    >
      ?
    </span>
  );
}

/** Overlay badge used on the collapsed workspace icon */
export function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === 'idle') {
    return (
      <span
        key="idle"
        data-testid="status-badge"
        data-status="idle"
        className="status-ding absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#3B82F6] border border-aide-surface-elevated"
      />
    );
  }
  if (status === 'processing') {
    return (
      <span
        key="processing"
        data-testid="status-badge"
        data-status="processing"
        className="status-ding absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F59E0B] border border-aide-surface-elevated flex items-center justify-center"
      >
        <BouncingDots color="#000" size={2} />
      </span>
    );
  }
  // awaiting-input
  return (
    <span
      key="awaiting"
      data-testid="status-badge"
      data-status="awaiting-input"
      className="status-ding absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border border-aide-surface-elevated flex items-center justify-center"
    >
      <span className="text-[7px] text-black font-bold leading-none">?</span>
    </span>
  );
}
