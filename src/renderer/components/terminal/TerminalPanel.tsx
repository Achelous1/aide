import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selectionBackground: '#3b4261',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Spawn a shell session
    window.aide.terminal.spawn().then((id) => {
      sessionIdRef.current = id;
    });

    // Send user input to pty
    terminal.onData((data) => {
      if (sessionIdRef.current) {
        window.aide.terminal.write(sessionIdRef.current, data);
      }
    });

    // Receive pty output
    const unsubscribe = window.aide.terminal.onData((_sessionId, data) => {
      terminal.write(data);
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current && sessionIdRef.current) {
        fitAddonRef.current.fit();
        window.aide.terminal.resize(
          sessionIdRef.current,
          terminalRef.current.cols,
          terminalRef.current.rows
        );
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      unsubscribe();
      if (sessionIdRef.current) {
        window.aide.terminal.kill(sessionIdRef.current);
      }
      terminal.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}
