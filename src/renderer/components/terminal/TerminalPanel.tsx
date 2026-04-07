import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useThemeStore } from '../../stores/theme-store';
import '@xterm/xterm/css/xterm.css';

const DARK_THEME = {
  background: '#0F1117',
  foreground: '#CDD1E0',
  cursor: '#CDD1E0',
  cursorAccent: '#0F1117',
  selectionBackground: '#2E3140',
  selectionForeground: '#E8E9ED',
  black: '#1A1C23',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#CDD1E0',
  brightBlack: '#5C5E6A',
  brightRed: '#ff9e9e',
  brightGreen: '#b9f27c',
  brightYellow: '#f0c674',
  brightBlue: '#8cb4ff',
  brightMagenta: '#d4aaff',
  brightCyan: '#a4e4ff',
  brightWhite: '#E8E9ED',
};

const LIGHT_THEME = {
  background: '#FAFAF7',
  foreground: '#374151',
  cursor: '#374151',
  cursorAccent: '#FAFAF7',
  selectionBackground: '#C7D2FE',
  selectionForeground: '#1E1E1E',
  black: '#374151',
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#CA8A04',
  blue: '#2563EB',
  magenta: '#9333EA',
  cyan: '#0891B2',
  white: '#F3F4F6',
  brightBlack: '#6B7280',
  brightRed: '#EF4444',
  brightGreen: '#22C55E',
  brightYellow: '#EAB308',
  brightBlue: '#3B82F6',
  brightMagenta: '#A855F7',
  brightCyan: '#06B6D4',
  brightWhite: '#FFFFFF',
};

interface TerminalPanelProps {
  sessionId: string;
  visible?: boolean;
}

export function TerminalPanel({ sessionId, visible = true }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string>(sessionId);
  const theme = useThemeStore((s) => s.theme);

  // Keep sessionId ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize xterm + connect to pty session (deferred by one frame for layout)
  useEffect(() => {
    console.log('[TerminalPanel] init effect', { sessionId, hasContainer: !!containerRef.current });
    if (!containerRef.current || !sessionId) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let inputDisposable: { dispose: () => void } | null = null;
    let unsubscribe: (() => void) | null = null;

    const raf = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;

      const terminal = new Terminal({
        theme: useThemeStore.getState().theme === 'dark' ? DARK_THEME : LIGHT_THEME,
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', Menlo, Monaco, monospace",
        fontSize: 13,
        cursorBlink: true,
        cursorStyle: 'block',
        allowTransparency: false,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      console.log('[TerminalPanel] xterm opened', { sessionId: sessionIdRef.current, cols: terminal.cols, rows: terminal.rows, containerW: containerRef.current?.offsetWidth, containerH: containerRef.current?.offsetHeight });

      // Connect pty input/output immediately after xterm is ready
      inputDisposable = terminal.onData((data) => {
        window.aide.terminal.write(sessionIdRef.current, data);
      });
      unsubscribe = window.aide.terminal.onData((incomingSessionId, data) => {
        if (incomingSessionId === sessionIdRef.current) {
          terminal.write(data);
        }
      });

      // Resize pty to match terminal dimensions
      window.aide.terminal.resize(sessionIdRef.current, terminal.cols, terminal.rows);

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !fitAddonRef.current || !terminalRef.current) return;
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        fitAddonRef.current.fit();
        const sid = sessionIdRef.current;
        if (sid) {
          window.aide.terminal.resize(sid, terminalRef.current.cols, terminalRef.current.rows);
        }
      });
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      inputDisposable?.dispose();
      unsubscribe?.();
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
      }
    };
  }, [sessionId]);

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.theme = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
  }, [theme]);

  // Re-fit when tab becomes visible (display: none → block)
  useEffect(() => {
    if (!visible || !fitAddonRef.current || !terminalRef.current) return;
    const timer = setTimeout(() => {
      fitAddonRef.current?.fit();
      const sid = sessionIdRef.current;
      if (sid && terminalRef.current) {
        window.aide.terminal.resize(sid, terminalRef.current.cols, terminalRef.current.rows);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
