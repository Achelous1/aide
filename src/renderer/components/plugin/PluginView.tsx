import { useEffect, useRef, useCallback } from 'react';

interface PluginViewProps {
  pluginId: string;
  pluginName: string;
}

export function PluginView({ pluginId, pluginName }: PluginViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Handle invoke requests from plugin iframe
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== 'aide:invoke') return;
      // Only accept messages from our iframe
      if (e.source !== iframeRef.current?.contentWindow) return;

      const { callId, plugin, tool, args } = e.data;
      try {
        const result = await window.aide.plugin.invoke(plugin, tool, args ?? {});
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'aide:invoke-result', callId, result },
          '*'
        );
      } catch (err) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'aide:invoke-error', callId, error: String(err) },
          '*'
        );
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
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
    const observer = new MutationObserver(sendTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [sendTheme]);

  return (
    <iframe
      ref={iframeRef}
      src={`aide-plugin://${pluginId}/index.html`}
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      title={pluginName}
      onLoad={sendTheme}
    />
  );
}
