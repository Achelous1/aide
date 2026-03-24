export function TitleBar() {
  return (
    <div
      className="relative flex items-center w-full shrink-0 bg-aide-surface-elevated border-b border-aide-border"
      style={{ height: '40px', WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left padding for macOS native traffic lights (hiddenInset) */}
      <div className="w-20 shrink-0" />

      {/* Centered title */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[13px] font-bold font-mono text-aide-accent">&gt; aide</span>
      </div>
    </div>
  );
}
