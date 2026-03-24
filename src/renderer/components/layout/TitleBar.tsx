export function TitleBar() {
  return (
    <div
      className="flex items-center w-full shrink-0 bg-aide-surface-elevated border-b border-aide-border"
      style={{ height: '40px' }}
    >
      {/* macOS traffic lights placeholder */}
      <div className="flex items-center gap-1.5 px-4">
        <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#28C840]" />
      </div>

      {/* Centered title */}
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[13px] font-bold font-mono text-aide-accent">&gt; aide</span>
      </div>
    </div>
  );
}
