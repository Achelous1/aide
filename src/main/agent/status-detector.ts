import type { AgentStatus } from '../../types/ipc';
import type { AgentType } from './agent-config';

type StatusCallback = (sessionId: string, status: AgentStatus) => void;

/**
 * Interactive CLI agents (Claude Code, Gemini CLI, Codex CLI) do not emit
 * machine-readable status signals in TUI mode — no OSC 133, no status files.
 * Headless modes do (`--output-format stream-json`), but we use interactive.
 *
 * Strategy: rolling text buffer + agent-specific awaiting-input patterns.
 *   - Any output chunk → processing (resets idle timer)
 *   - No output for IDLE_QUIET_MS → idle
 *   - Agent-specific patterns matched against rolling buffer → awaiting-input
 *
 * The rolling buffer is required because PTY data arrives in chunks — a
 * selection-UI footer like "Enter to select · ↑/↓ to navigate · Esc to cancel"
 * may be split across multiple chunks, and single-chunk matching would fail.
 */

interface AgentProfile {
  /** Quiet period before transitioning to idle (ms) */
  idleQuietMs: number;
  /** Patterns that indicate the agent is awaiting user input */
  awaitingPatterns: RegExp[];
}

const DEFAULT_AWAITING: RegExp[] = [
  /\[Y\/n\]/i,
  /\(y\/n\)/i,
  /\[y\/N\]/i,
];

/** Selection UI patterns — arrow-key navigation menus used by Claude Code / Gemini */
const SELECTION_UI_AWAITING: RegExp[] = [
  // Full footer line: "Enter to select · ↑/↓ to navigate · Esc to cancel"
  // Non-greedy wildcards tolerate separator/spacing variations and ANSI fragments.
  /Enter to select[\s\S]*?navigate[\s\S]*?cancel/i,
];

const PROFILES: Record<AgentType, AgentProfile> = {
  claude: {
    idleQuietMs: 1500,
    awaitingPatterns: [
      ...DEFAULT_AWAITING,
      ...SELECTION_UI_AWAITING,
    ],
  },
  gemini: {
    idleQuietMs: 1500,
    awaitingPatterns: [
      ...DEFAULT_AWAITING,
      ...SELECTION_UI_AWAITING,
    ],
  },
  codex: {
    // Codex Rust TUI renders slower; longer quiet window avoids flapping
    idleQuietMs: 2000,
    awaitingPatterns: [
      ...DEFAULT_AWAITING,
      // Codex approval overlay (documented in codex-rs/protocol)
      /Command Approval Required/i,
      /Accept once/i,
      /\[a\]\s*Accept/i,
      /\[d\]\s*Decline/i,
    ],
  },
  shell: {
    idleQuietMs: 500,
    awaitingPatterns: DEFAULT_AWAITING,
  },
};

// Comprehensive ANSI escape stripping:
//   CSI (including DEC private ?), OSC (BEL or ST terminated), character-set selection
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1b(?:\[[?0-9;]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[()*+][A-Za-z0-9])/g;

/** Size of per-session rolling text buffer (bytes of cleaned text). */
const BUFFER_SIZE = 4096;

export class AgentStatusDetector {
  private statuses = new Map<string, AgentStatus>();
  private idleTimers = new Map<string, NodeJS.Timeout>();
  private sessionAgents = new Map<string, AgentType>();
  private textBuffers = new Map<string, string>();
  private callback: StatusCallback;

  constructor(callback: StatusCallback) {
    this.callback = callback;
  }

  /** Register a session's agent type — must be called before feed() */
  register(sessionId: string, agentType: AgentType): void {
    this.sessionAgents.set(sessionId, agentType);
  }

  feed(sessionId: string, data: string): void {
    const profile = PROFILES[this.sessionAgents.get(sessionId) ?? 'shell'];
    const clean = data.replace(ANSI_ESCAPE_RE, '');
    if (!clean.trim()) return;

    // Append to rolling buffer (tail-truncated to BUFFER_SIZE)
    const prev = this.textBuffers.get(sessionId) ?? '';
    const buffer = (prev + clean).slice(-BUFFER_SIZE);
    this.textBuffers.set(sessionId, buffer);

    // Match patterns against the rolling buffer, not just the current chunk.
    // This handles patterns that span multiple PTY chunks.
    if (profile.awaitingPatterns.some((re) => re.test(buffer))) {
      this.clearIdleTimer(sessionId);
      this.setStatus(sessionId, 'awaiting-input');
      return;
    }

    // Sticky awaiting-input: UI redraw chunks don't downgrade the status.
    // Only user input clears it (see notifyUserInput below).
    if (this.statuses.get(sessionId) === 'awaiting-input') {
      return;
    }

    // Any output → processing, then schedule transition to idle
    this.setStatus(sessionId, 'processing');
    this.scheduleIdle(sessionId, profile.idleQuietMs);
  }

  /**
   * Signal that the user typed input — clears sticky awaiting-input and the
   * text buffer so the next agent output can transition back to processing
   * without re-matching the stale question text.
   */
  notifyUserInput(sessionId: string): void {
    this.textBuffers.set(sessionId, '');
    if (this.statuses.get(sessionId) === 'awaiting-input') {
      this.setStatus(sessionId, 'processing');
      const profile = PROFILES[this.sessionAgents.get(sessionId) ?? 'shell'];
      this.scheduleIdle(sessionId, profile.idleQuietMs);
    }
  }

  private scheduleIdle(sessionId: string, quietMs: number): void {
    this.clearIdleTimer(sessionId);
    const timer = setTimeout(() => {
      this.idleTimers.delete(sessionId);
      this.setStatus(sessionId, 'idle');
    }, quietMs);
    this.idleTimers.set(sessionId, timer);
  }

  private clearIdleTimer(sessionId: string): void {
    const timer = this.idleTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionId);
    }
  }

  private setStatus(sessionId: string, status: AgentStatus): void {
    const current = this.statuses.get(sessionId);
    if (current !== status) {
      this.statuses.set(sessionId, status);
      this.callback(sessionId, status);
    }
  }

  remove(sessionId: string): void {
    this.clearIdleTimer(sessionId);
    this.statuses.delete(sessionId);
    this.sessionAgents.delete(sessionId);
    this.textBuffers.delete(sessionId);
  }
}
