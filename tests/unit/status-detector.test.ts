import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentStatusDetector } from '../../src/main/agent/status-detector';
import type { AgentStatus } from '../../src/types/ipc';

describe('AgentStatusDetector', () => {
  let events: Array<{ sessionId: string; status: AgentStatus }>;
  let detector: AgentStatusDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    events = [];
    detector = new AgentStatusDetector((sessionId, status) => {
      events.push({ sessionId, status });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic transitions', () => {
    it('emits processing on first output, then idle after quiet period', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Hello world');
      expect(events).toEqual([{ sessionId: 's1', status: 'processing' }]);

      vi.advanceTimersByTime(1500);
      expect(events.at(-1)).toEqual({ sessionId: 's1', status: 'idle' });
    });

    it('does not emit duplicate consecutive statuses', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'chunk 1');
      detector.feed('s1', 'chunk 2');
      detector.feed('s1', 'chunk 3');
      const processingCount = events.filter((e) => e.status === 'processing').length;
      expect(processingCount).toBe(1);
    });

    it('ignores whitespace-only chunks', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', '   \n  ');
      expect(events).toEqual([]);
    });

    it('ignores chunks containing only ANSI escape codes', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', '\x1b[2J\x1b[H');
      expect(events).toEqual([]);
    });
  });

  describe('agent-specific quiet periods', () => {
    it('claude uses 1500ms quiet period', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'chunk');
      vi.advanceTimersByTime(1499);
      expect(events.at(-1)?.status).toBe('processing');
      vi.advanceTimersByTime(1);
      expect(events.at(-1)?.status).toBe('idle');
    });

    it('codex uses 2000ms quiet period (Rust TUI is slower)', () => {
      detector.register('s1', 'codex');
      detector.feed('s1', 'chunk');
      vi.advanceTimersByTime(1500);
      expect(events.at(-1)?.status).toBe('processing');
      vi.advanceTimersByTime(500);
      expect(events.at(-1)?.status).toBe('idle');
    });

    it('shell uses 500ms quiet period', () => {
      detector.register('s1', 'shell');
      detector.feed('s1', 'chunk');
      vi.advanceTimersByTime(500);
      expect(events.at(-1)?.status).toBe('idle');
    });
  });

  describe('awaiting-input detection — single chunk', () => {
    it('detects Y/n prompt for any agent', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Continue? [Y/n] ');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('detects full Claude Code selection footer', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('detects Codex approval overlay', () => {
      detector.register('s1', 'codex');
      detector.feed('s1', 'Command Approval Required\n[a] Accept once\n[d] Decline');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('does NOT match partial footer ("Enter to select" alone)', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select a file from the list');
      expect(events.at(-1)?.status).toBe('processing');
    });

    it('does NOT match "Esc to cancel" alone (false positive guard)', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Press Esc to cancel the operation');
      expect(events.at(-1)?.status).toBe('processing');
    });
  });

  describe('awaiting-input detection — split across chunks', () => {
    it('matches footer split into 3 chunks', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ');
      detector.feed('s1', '↑/↓ to navigate · ');
      detector.feed('s1', 'Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('matches footer after a large content burst', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', '1. Pizza\n  Round flat food.');
      detector.feed('s1', '2. Burger\n  Meat between bread.');
      detector.feed('s1', '3. Salad\n  Cold plant pieces.');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('matches footer containing ANSI color codes', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', '\x1b[2mEnter to select\x1b[0m · \x1b[2m↑/↓ to navigate\x1b[0m · \x1b[2mEsc to cancel\x1b[0m');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });
  });

  describe('sticky awaiting-input', () => {
    it('stays in awaiting-input when UI redraw chunks arrive', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');

      // Simulate cursor movement / highlight redraw — must NOT downgrade
      detector.feed('s1', '> 2. Burger');
      detector.feed('s1', '\x1b[A\x1b[B');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('does not emit duplicate awaiting-input events on redraw', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      detector.feed('s1', '> highlighted option');
      const awaitingCount = events.filter((e) => e.status === 'awaiting-input').length;
      expect(awaitingCount).toBe(1);
    });

    it('notifyUserInput transitions awaiting-input → processing', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');

      detector.notifyUserInput('s1');
      expect(events.at(-1)?.status).toBe('processing');
    });

    it('notifyUserInput clears the text buffer so stale pattern does not re-match', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      detector.notifyUserInput('s1');

      // New content that does NOT contain the footer — should stay processing
      detector.feed('s1', 'Generating response...');
      expect(events.at(-1)?.status).toBe('processing');
    });

    it('notifyUserInput on non-awaiting session is a no-op for status', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'regular output');
      const beforeLength = events.length;
      detector.notifyUserInput('s1');
      expect(events.length).toBe(beforeLength);
    });
  });

  describe('rolling buffer behavior', () => {
    it('trims buffer to size limit when exceeded', () => {
      detector.register('s1', 'claude');
      // Push >4KB of content that does NOT contain the footer
      const filler = 'a'.repeat(5000);
      detector.feed('s1', filler);
      // Then push the footer — buffer should still match because it is appended
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('awaiting-input');
    });

    it('does NOT match a pattern that was pushed out of the buffer', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'Enter to select · '); // partial footer at start
      // Push enough content to slide the partial footer out of the buffer
      detector.feed('s1', 'x'.repeat(5000));
      // Push the rest of the footer — "Enter to select" is gone from buffer
      detector.feed('s1', '↑/↓ to navigate · Esc to cancel');
      expect(events.at(-1)?.status).toBe('processing');
    });
  });

  describe('session lifecycle', () => {
    it('defaults to shell profile when session is not registered', () => {
      detector.feed('s1', 'chunk');
      vi.advanceTimersByTime(500);
      expect(events.at(-1)?.status).toBe('idle');
    });

    it('remove() clears timers, buffer, and status', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'chunk');
      detector.remove('s1');
      vi.advanceTimersByTime(2000);
      // No idle event should fire after removal
      const idleEvents = events.filter((e) => e.status === 'idle');
      expect(idleEvents).toEqual([]);
    });

    it('multiple sessions are isolated', () => {
      detector.register('s1', 'claude');
      detector.register('s2', 'codex');
      detector.feed('s1', 'Enter to select · ↑/↓ to navigate · Esc to cancel');
      detector.feed('s2', 'regular output');

      const s1Last = events.filter((e) => e.sessionId === 's1').at(-1);
      const s2Last = events.filter((e) => e.sessionId === 's2').at(-1);
      expect(s1Last?.status).toBe('awaiting-input');
      expect(s2Last?.status).toBe('processing');
    });
  });

  describe('idle timer reset on continued output', () => {
    it('delays idle transition when new chunks keep arriving', () => {
      detector.register('s1', 'claude');
      detector.feed('s1', 'chunk 1');
      vi.advanceTimersByTime(1000);
      detector.feed('s1', 'chunk 2');
      vi.advanceTimersByTime(1000);
      // 2000ms elapsed total, but timer was reset at 1000 → still processing
      expect(events.at(-1)?.status).toBe('processing');
      vi.advanceTimersByTime(500);
      // 1500ms since last chunk → now idle
      expect(events.at(-1)?.status).toBe('idle');
    });
  });
});
