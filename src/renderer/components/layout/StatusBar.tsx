interface StatusBarProps {
  branch?: string;
  pluginCount?: number;
  agentName?: string;
}

export function StatusBar({ branch = 'main', pluginCount = 0, agentName }: StatusBarProps) {
  return (
    <div
      className="flex items-center w-full shrink-0 px-3 gap-4 bg-aide-accent text-black text-[11px] font-mono"
      style={{ height: '24px' }}
    >
      <span>git: {branch}</span>
      <span>[{pluginCount}] plugins active</span>
      <div className="flex-1" />
      {agentName && <span>{agentName}</span>}
    </div>
  );
}
