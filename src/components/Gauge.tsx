interface Props {
  label: string;
  value: number; // 0-100
  displayValue: string;
  colorClass?: string;
}

export default function Gauge({ label, value, displayValue, colorClass }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = colorClass ?? barColor(pct);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{displayValue}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className={`h-2.5 rounded-full transition-all ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function barColor(pct: number): string {
  if (pct >= 65) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-rose-500";
}
