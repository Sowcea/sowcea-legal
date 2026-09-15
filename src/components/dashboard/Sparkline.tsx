import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface Props {
  data: { x: string; y: number | null }[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = "#00b6b4", height = 40 }: Props) {
  const usable = data.filter((d) => d.y !== null && d.y !== undefined);
  if (usable.length < 2) {
    return (
      <div className="flex items-center text-[11px] text-slate-600" style={{ height }}>
        Série indisponible
      </div>
    );
  }
  const gradientId = `spark-${color.replace("#", "")}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={usable} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={600}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
