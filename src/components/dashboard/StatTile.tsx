import { AnimatedNumber } from "./AnimatedNumber";
import { LivePill } from "./LivePill";

interface Props {
  label: string;
  value: number | null;
  format: (v: number | null) => string;
  secondsAgo: number | null;
}

export function StatTile({ label, value, format, secondsAgo }: Props) {
  return (
    <div className="rounded-2xl border border-[#effafa] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-foreground">
          <AnimatedNumber value={value} format={format} />
        </p>
        <LivePill secondsAgo={secondsAgo} />
      </div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
    </div>
  );
}
