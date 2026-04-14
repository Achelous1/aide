import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

interface CachedTerminal {
  term: Terminal;
  fitAddon: FitAddon;
  /** Wrapper div that xterm renders into. Lives detached when not displayed. */
  container: HTMLDivElement;
  /** Unsubscribe function for the PTY data listener — bound for the lifetime of the cache entry */
  unsubscribeData: () => void;
}

const cache = new Map<string, CachedTerminal>();

/**
 * Get-or-create the xterm for this PTY session. The xterm is owned by the
 * cache, not by any React component. It survives across workspace switches.
 */
export function getOrCreate(sessionId: string, theme: ITheme): CachedTerminal {
  let entry = cache.get(sessionId);
  if (entry) return entry;

  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';

  const term = new Terminal({
    theme,
    fontFamily: "'JetBrainsMono Nerd Font Mono', 'JetBrainsMono NF', 'MesloLGS NF', 'JetBrains Mono', 'IBM Plex Mono', Menlo, Monaco, 'Symbols Nerd Font Mono', monospace",
    fontSize: 13,
    unicodeVersion: '11',
    cursorBlink: true,
    cursorStyle: 'block',
    allowTransparency: false,
    scrollback: 5000,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(container);
  fitAddon.fit();

  // Wire PTY → xterm. Listener stays alive for the cache entry's lifetime.
  const unsubscribeData = window.aide.terminal.onData((sid, data) => {
    if (sid === sessionId) {
      term.write(data);
    }
  });

  // Wire xterm → PTY (user input)
  term.onData((data) => {
    window.aide.terminal.write(sessionId, data);
  });

  // Wire xterm resize → PTY resize
  term.onResize(({ cols, rows }) => {
    window.aide.terminal.resize(sessionId, cols, rows);
  });

  entry = { term, fitAddon, container, unsubscribeData };
  cache.set(sessionId, entry);
  return entry;
}

/** Attach the cached container into a parent (React-rendered) DOM node. */
export function attach(sessionId: string, parent: HTMLElement): void {
  const entry = cache.get(sessionId);
  if (!entry) return;
  if (entry.container.parentElement !== parent) {
    parent.appendChild(entry.container);
  }
  // Refit after attach so the xterm picks up the new viewport size
  requestAnimationFrame(() => {
    try {
      entry.fitAddon.fit();
    } catch {
      // ignore — may not be visible yet
    }
  });
}

/**
 * Detach the cached container from its current parent. The xterm is NOT
 * disposed — it stays alive in the cache until dispose() is called.
 */
export function detach(sessionId: string): void {
  const entry = cache.get(sessionId);
  if (!entry) return;
  entry.container.remove();
}

/** Update the theme on a cached xterm without recreating it. */
export function setTheme(sessionId: string, theme: ITheme): void {
  const entry = cache.get(sessionId);
  if (!entry) return;
  entry.term.options.theme = theme;
}

/**
 * Permanently dispose the xterm. Call only when the tab is closed by the
 * user or the PTY exits unexpectedly — NOT on workspace switch.
 */
export function dispose(sessionId: string): void {
  const entry = cache.get(sessionId);
  if (!entry) return;
  entry.unsubscribeData();
  entry.term.dispose();
  entry.container.remove();
  cache.delete(sessionId);
}

/** Dispose all cached terminals — called on app quit. */
export function disposeAll(): void {
  for (const sessionId of cache.keys()) {
    dispose(sessionId);
  }
}

export function has(sessionId: string): boolean {
  return cache.has(sessionId);
}

export function getFitAddon(sessionId: string): FitAddon | null {
  return cache.get(sessionId)?.fitAddon ?? null;
}

/** Get cached terminal cols/rows for PTY resize calls. Returns null if not cached. */
export function getDimensions(sessionId: string): { cols: number; rows: number } | null {
  const entry = cache.get(sessionId);
  if (!entry) return null;
  return { cols: entry.term.cols, rows: entry.term.rows };
}
