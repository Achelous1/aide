import { useEffect, useState, useRef, useCallback } from 'react';

interface PluginViewProps {
  pluginId: string;
  pluginName: string;
}

export function PluginView({ pluginId, pluginName }: PluginViewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    window.aide.plugin.getHtml(pluginId)
      .then((result) => {
        if (!cancelled) setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pluginId]);

  useEffect(() => {
    if (!html) { setBlobUrl(null); return; }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  // Forward file events to plugin iframe via postMessage
  useEffect(() => {
    const handler = (e: Event) => {
      const { event, filePath } = (e as CustomEvent<{ event: string; filePath: string }>).detail;
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'aide:file-event', event, filePath },
        '*'
      );
    };
    window.addEventListener('aide:file-event', handler);
    return () => window.removeEventListener('aide:file-event', handler);
  }, []);

  // Send theme to iframe when it loads or theme changes
  const sendTheme = useCallback(() => {
    const isDark = !document.documentElement.classList.contains('light');
    iframeRef.current?.contentWindow?.postMessage(
      { theme: isDark ? 'dark' : 'light' },
      '*'
    );
  }, []);

  useEffect(() => {
    if (!html) return;
    const observer = new MutationObserver(sendTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [html, sendTheme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-aide-surface-sidebar text-aide-text-secondary">
        <span className="text-xs font-mono">Loading plugin...</span>
      </div>
    );
  }

  if (blobUrl) {
    return (
      <iframe
        ref={iframeRef}
        src={blobUrl}
        sandbox="allow-scripts"
        className="w-full h-full border-0"
        title={pluginName}
        onLoad={sendTheme}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-aide-surface-sidebar text-aide-text-secondary gap-4 p-8">
      <span className="text-[24px]" style={{ color: 'var(--accent)' }}>◈</span>
      <span className="text-[16px] font-semibold text-aide-text-primary">{pluginName}</span>
      <span className="text-[13px] text-center max-w-xs">
        This plugin runs in the background. Manage it from the Plugins panel.
      </span>
      <div className="flex items-center gap-2 text-[11px] font-mono text-aide-text-tertiary">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span>Active — {pluginId}</span>
      </div>
    </div>
  );
}
