import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";
import { MetricDetailDialog } from "./MetricDetailDialog";
import { getCountryByCode } from "@/layouts/CountryDrilldown/countries";
import { formatKpi, type HubCounter, type HubKpi, type HubMinutePoint } from "@/lib/globalHub";

interface Props {
  sourceTitle: string;
  sourceView: string;
  kpi: HubKpi;
  value: number | null;
  countryCode: string | null;
  countryCounters: HubCounter[];
  minuteSeries: HubMinutePoint[];
}

export function MetricCard({
  sourceTitle,
  sourceView,
  kpi,
  value,
  countryCode,
  countryCounters,
  minuteSeries,
}: Props) {
  const [open, setOpen] = useState(false);
  const fmt = (v: number | null) => formatKpi(v, kpi.format);

  const series = useMemo(
    () =>
      minuteSeries
        .filter((m) => m.source_view === sourceView)
        .slice(-120)
        .map((m) => {
          const raw = m.kpis?.[kpi.key];
          const num = raw === null || raw === undefined ? null : Number(raw);
          return { x: m.minute, y: num !== null && Number.isNaN(num) ? null : num };
        }),
    [minuteSeries, sourceView, kpi.key]
  );

  const top3 = useMemo(() => {
    const rows = countryCounters
      .map((c) => ({ code: c.country_code, value: Number(c.kpis?.[kpi.key] ?? NaN) }))
      .filter((r) => !Number.isNaN(r.value))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const max = rows.length ? Math.max(...rows.map((r) => r.value)) || 1 : 1;
    return rows.map((r) => ({ ...r, pct: (r.value / max) * 100 }));
  }, [countryCounters, kpi.key]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-[#effafa] bg-white p-4 text-left shadow-sm transition-colors hover:border-[#00b6b4]"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{kpi.label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          <AnimatedNumber value={value} format={fmt} />
        </p>

        <div className="mt-2">
          <Sparkline data={series} />
        </div>

        <div className="mt-3 space-y-1.5">
          {top3.length === 0 ? (
            <p className="text-[11px] text-slate-600">Aucune donnée par pays</p>
          ) : (
            top3.map((r) => (
              <motion.div key={r.code} layout className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-slate-600">
                  {r.code === "NC" ? "Non classé" : `${getCountryByCode(r.code)?.flag ?? "🏳️"} ${r.code}`}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#effafa]">
                  <motion.span
                    layout
                    className="block h-full rounded-full bg-[#00b6b4]"
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-[11px] text-slate-600">
                  {fmt(r.value)}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </button>

      <MetricDetailDialog
        open={open}
        onOpenChange={setOpen}
        title={sourceTitle}
        sourceView={sourceView}
        kpi={kpi}
        countryCode={countryCode}
        countryCounters={countryCounters}
        minuteSeries={minuteSeries}
      />
    </>
  );
}
