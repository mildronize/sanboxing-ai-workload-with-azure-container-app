interface StatusBadgeProps {
  workerType?: string;
  elapsedMs?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function StatusBadge({ workerType, elapsedMs }: StatusBadgeProps) {
  if (!workerType) return null;

  const label = workerType === "caj" ? "CAJ" : "Dynamic Session";
  const durationText = elapsedMs != null ? formatDuration(elapsedMs) : null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--sea-ink-soft)]">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          workerType === "caj"
            ? "bg-amber-500"
            : "bg-emerald-500"
        }`}
      />
      {label}
      {durationText && (
        <>
          <span className="text-[var(--sea-ink-soft)]/50">|</span>
          <span>{durationText}</span>
        </>
      )}
    </span>
  );
}
