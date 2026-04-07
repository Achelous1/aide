import { useEffect, useRef } from 'react';
import { useThemeStore } from '../../stores/theme-store';
import * as xtermCache from '../../lib/xterm-cache';
import '@xterm/xterm/css/xterm.css';

export const DARK_THEME = {
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

export const LIGHT_THEME = {
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

function currentTheme() {
  return useThemeStore.getState().theme === 'dark' ? DARK_THEME : LIGHT_THEME;
}

interface TerminalPanelProps {
  sessionId: string;
  visible?: boolean;
}

export function TerminalPanel({ sessionId, visible = true }: TerminalPanelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);

  // On mount: get-or-create the cached xterm, then attach it to our mount div.
  // On unmount: detach only — do NOT dispose (xterm survives workspace switches).
  useEffect(() => {
    if (!mountRef.current || !sessionId) return;
    const parent = mountRef.current;
    let resizeObserver: ResizeObserver | null = null;

    const raf = requestAnimationFrame(() => {
      // Ensure the xterm exists and is attached
      xtermCache.getOrCreate(sessionId, currentTheme());
      xtermCache.attach(sessionId, parent);

      // Initial PTY resize after attach
      const fitAddon = xtermCache.getFitAddon(sessionId);
      if (fitAddon) {
        try { fitAddon.fit(); } catch { /* ignore */ }
      }
      const dims = xtermCache.getDimensions(sessionId);
      if (dims) {
        window.aide.terminal.resize(sessionId, dims.cols, dims.rows);
      }

      // ResizeObserver to refit when the container resizes (split pane drags)
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) return;
        const fitAddon = xtermCache.getFitAddon(sessionId);
        if (!fitAddon) return;
        try { fitAddon.fit(); } catch { /* ignore */ }
        const dims = xtermCache.getDimensions(sessionId);
        if (dims) {
          window.aide.terminal.resize(sessionId, dims.cols, dims.rows);
        }
      });
      resizeObserver.observe(parent);
    });

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      xtermCache.detach(sessionId);
    };
  }, [sessionId]);

  // Update theme on this cached xterm when app theme changes
  useEffect(() => {
    xtermCache.setTheme(sessionId, theme === 'dark' ? DARK_THEME : LIGHT_THEME);
  }, [theme, sessionId]);

  // Re-fit when tab becomes visible (display: none → block)
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      const fitAddon = xtermCache.getFitAddon(sessionId);
      if (!fitAddon) return;
      try { fitAddon.fit(); } catch { /* ignore */ }
      const dims = xtermCache.getDimensions(sessionId);
      if (dims) {
        window.aide.terminal.resize(sessionId, dims.cols, dims.rows);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [visible, sessionId]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
    />
  );
}
