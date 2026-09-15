import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCountryByCode } from "@/layouts/CountryDrilldown/countries";
import { fetchTimeseries, formatKpi, type HubCounter, type HubKpi, type HubMinutePoint } from "@/lib/globalHub";

const PALETTE = ["#00b6b4", "#45c6c4", "#8bd9d7", "#b7e8e7", "#d8f2f1", "#94a3b8"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sourceView: string;
  kpi: HubKpi;
  countryCode: string | null;
  countryCounters: HubCounter[];
  minuteSeries: HubMinutePoint[];
}

export function MetricDetailDialog({
  open,
  onOpenChange,
  title,
  sourceView,
  kpi,
  countryCode,
  countryCounters,
  minuteSeries,
}: Props) {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [tableOpen, setTableOpen] = useState(false);
  const fmt = (v: number | null) => formatKpi(v, kpi.format);

  const daily = useQuery({
    queryKey: ["sowcea-team-dashboard", "timeseries", sourceView, kpi.key, countryCode, days],
    queryFn: () => fetchTimeseries(sourceView, countryCode, days),
    enabled: open,
    retry: false,
  });

  const chartData = useMemo(() => {
    if (daily.data && daily.data.length > 1) {
      return daily.data.map((p) => ({ x: p.day.slice(0, 10), y: Number(p.values?.[kpi.key] ?? NaN) }));
    }
    // fallback: live minute rollup series (7 days of ticks)
    return minuteSeries
      .filter((m) => m.source_view === sourceView)
      .map((m) => ({ x: new Date(m.minute).toLocaleTimeString(), y: Number(m.kpis?.[kpi.key] ?? NaN) }));
  }, [daily.data, minuteSeries, sourceView, kpi.key]);

  const usable = chartData.filter((d) => !Number.isNaN(d.y));

  const ranking = useMemo(
    () =>
      countryCounters
        .map((c) => ({
          code: c.country_code,
          value: Number(c.kpis?.[kpi.key] ?? NaN),
          rows: c.rows,
        }))
        .filter((r) => !Number.isNaN(r.value))
        .sort((a, b) => b.value - a.value),
    [countryCounters, kpi.key]
  );
  const max = ranking.length ? Math.max(...ranking.map((r) => r.value)) || 1 : 1;
  const label = (code: string) =>
    code === "NC" ? "Non classé" : `${getCountryByCode(code)?.flag ?? "🏳️"} ${code}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {title} · {kpi.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                days === d
                  ? "border-[#00b6b4] bg-[#effafa] text-[#00807e]"
                  : "border-border bg-white text-slate-600 hover:bg-[#effafa]"
              }`}
            >
              {d} j
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-[#effafa] bg-white p-3">
          {usable.length < 2 ? (
            <p className="py-8 text-center text-sm text-slate-600">
              {daily.isError ? `Source indisponible: ${(daily.error as Error).message}` : "Aucune donnée"}
            </p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usable}>
                  <defs>
                    <linearGradient id="detail-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b6b4" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#00b6b4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#effafa" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={36} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke="#00b6b4"
                    strokeWidth={2}
                    fill="url(#detail-area)"
                    animationDuration={700}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#effafa] bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Répartition par pays
            </p>
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-600">Aucune donnée</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ranking} dataKey="value" nameKey="code" innerRadius={38} outerRadius={62}>
                      {ranking.map((r, i) => (
                        <Cell key={r.code} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, n: any) => [fmt(Number(v)), label(String(n))]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#effafa] bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Classement par pays
            </p>
            {ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-600">Aucune donnée</p>
            ) : (
              <div className="space-y-2">
                {ranking.map((r) => (
                  <motion.div key={r.code} layout className="text-xs">
                    <div className="mb-1 flex justify-between">
                      <span className="font-medium text-foreground">{label(r.code)}</span>
                      <span className="text-slate-600">{fmt(r.value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#effafa]">
                      <motion.div
                        layout
                        className="h-full rounded-full bg-[#00b6b4]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.value / max) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#effafa] bg-white">
          <button
            onClick={() => setTableOpen((v) => !v)}
            className="w-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
          >
            {tableOpen ? "▾" : "▸"} Tableau détaillé
          </button>
          {tableOpen && (
            <table className="w-full text-xs">
              <thead className="bg-[#effafa]">
                <tr>
                  <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Pays</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-slate-600">{kpi.label}</th>
                  <th className="px-3 py-1.5 text-right font-semibold text-slate-600">Lignes</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-600">
                      Aucune donnée
                    </td>
                  </tr>
                )}
                {ranking.map((r) => (
                  <tr key={r.code} className="border-t border-[#effafa]">
                    <td className="px-3 py-1.5 text-foreground">{label(r.code)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.value)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-600">{r.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
