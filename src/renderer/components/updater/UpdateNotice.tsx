import { useEffect, useState } from 'react';
import type { UpdateInfo } from '../../../types/ipc';

interface Props {
  collapsed?: boolean;
}

export function UpdateNotice({ collapsed = false }: Props) {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    window.aide.updater.getInfo().then(setInfo);
    return window.aide.updater.onChanged(setInfo);
  }, []);

  if (!info?.hasUpdate) return null;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await window.aide.updater.download();
    } finally {
      setDownloading(false);
    }
  };

  if (collapsed) {
    return (
      <div className="update-notice-enter flex items-center justify-center w-12 h-12 border-t border-aide-border">
        <button
          onClick={handleDownload}
          disabled={downloading}
          title={`Update available — ${info.latestTag}`}
          className="w-7 h-7 rounded flex items-center justify-center bg-aide-accent text-aide-terminal-bg hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          ⬇
        </button>
      </div>
    );
  }

  return (
    <div className="update-notice-enter flex items-center gap-2.5 px-3 py-3 border-t border-aide-border bg-aide-surface-sidebar">
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-aide-accent">
          ⬆ {downloading ? 'Downloading...' : 'Update available'}
        </span>
        <span className="text-[13px] font-mono font-bold text-aide-text-primary truncate">
          {info.latestTag}
        </span>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        title={`Download ${info.latestTag}`}
        className="shrink-0 w-7 h-7 rounded flex items-center justify-center bg-aide-accent text-aide-terminal-bg text-[13px] font-bold hover:opacity-85 transition-opacity disabled:opacity-50"
      >
        ⬇
      </button>
    </div>
  );
}
