interface StatusBadgeProps {
  workerType?: string;
  elapsedMs?: number;
  isPending?: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function StatusBadge({ workerType, elapsedMs, isPending }: StatusBadgeProps) {
  if (!workerType) return null;

  const isCAJ = workerType === "caj";
  const label = isCAJ ? "CAJ" : "Dynamic Session";
  const durationText = elapsedMs != null ? formatDuration(elapsedMs) : null;

  // Determine emoji and color based on state
  let emoji: string;
  let colorClass: string;
  let borderClass: string;

  if (isCAJ && isPending) {
    emoji = "⏳";
    colorClass = "text-amber-300";
    borderClass = "border-amber-500/40 bg-amber-500/10";
  } else if (isCAJ) {
    emoji = "✅";
    colorClass = "text-emerald-300";
    borderClass = "border-emerald-500/40 bg-emerald-500/10";
  } else {
    emoji = "⚡";
    colorClass = "text-sky-300";
    borderClass = "border-sky-500/40 bg-sky-500/10";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${borderClass} ${colorClass}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {durationText && !isPending && (
        <>
          <span className="opacity-40">|</span>
          <span>{durationText}</span>
        </>
      )}
      {isPending && (
        <span className="ml-0.5 inline-flex gap-0.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
        </span>
      )}
    </span>
  );
}
