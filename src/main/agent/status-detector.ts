import type { AgentStatus } from '../../types/ipc';

type StatusCallback = (sessionId: string, status: AgentStatus) => void;

const DEBOUNCE_MS = 300;

export class AgentStatusDetector {
  private statuses = new Map<string, AgentStatus>();
  private callback: StatusCallback;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(callback: StatusCallback) {
    this.callback = callback;
  }

  feed(sessionId: string, data: string): void {
    // Strip ANSI escape codes
    // eslint-disable-next-line no-control-regex
    const clean = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
    if (!clean) return;

    let newStatus: AgentStatus = 'processing';

    // Prompt patterns → idle
    if (/[$%>❯]\s*$/.test(clean) || /^\s*[$%>❯]\s*$/.test(clean)) {
      newStatus = 'idle';
    }
    // Question patterns → awaiting-input (check after idle so it can override)
    if (/\?\s*$/.test(clean) || /\[Y\/n\]/i.test(clean) || /\(y\/n\)/i.test(clean)) {
      newStatus = 'awaiting-input';
    }

    this.debouncedUpdate(sessionId, newStatus);
  }

  private debouncedUpdate(sessionId: string, status: AgentStatus): void {
    const existing = this.debounceTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(sessionId);
      const current = this.statuses.get(sessionId);
      if (current !== status) {
        this.statuses.set(sessionId, status);
        this.callback(sessionId, status);
      }
    }, DEBOUNCE_MS);

    this.debounceTimers.set(sessionId, timer);
  }

  remove(sessionId: string): void {
    const timer = this.debounceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }
    this.statuses.delete(sessionId);
  }
}
