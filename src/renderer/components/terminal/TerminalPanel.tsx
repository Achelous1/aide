import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  sessionId: string;
}

export function TerminalPanel({ sessionId }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize xterm once
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: {
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
      },
      fontFamily: "'JetBrains Mono', 'IBM Plex Mono', Menlo, Monaco, monospace",
      fontSize: 13,
      cursorBlink: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Connect to sessionId — re-runs when sessionId changes
  useEffect(() => {
    if (!sessionId || !terminalRef.current) return;

    const terminal = terminalRef.current;

    // Send user input to this session's pty
    const inputDisposable = terminal.onData((data) => {
      window.aide.terminal.write(sessionId, data);
    });

    // Receive output from this session's pty
    const unsubscribe = window.aide.terminal.onData((incomingSessionId, data) => {
      if (incomingSessionId === sessionId) {
        terminal.write(data);
      }
    });

    // Resize pty to match terminal dimensions
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
      window.aide.terminal.resize(sessionId, terminal.cols, terminal.rows);
    }

    return () => {
      inputDisposable.dispose();
      unsubscribe();
    };
  }, [sessionId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
