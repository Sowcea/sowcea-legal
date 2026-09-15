import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCountry } from "@/context/CountryContext";
import { StatTile } from "./StatTile";
import { MetricCard } from "./MetricCard";
import {
  counterFor,
  countryRows,
  fetchCounters,
  fetchMinuteSeries,
  fetchSources,
  formatKpi,
  type HubKpi,
} from "@/lib/globalHub";

const QUERY_KEY = ["sowcea-team-dashboard"];

export function ModuleDashboard() {
  const { currentCountry } = useCountry();
  const code = currentCountry?.code ?? null;
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  const sources = useQuery({
    queryKey: [...QUERY_KEY, "sources"],
    queryFn: fetchSources,
    refetchInterval: 90_000,
    retry: false,
  });
  const counters = useQuery({
    queryKey: [...QUERY_KEY, "counters"],
    queryFn: fetchCounters,
    refetchInterval: 90_000,
    retry: false,
  });
  const minutes = useQuery({
    queryKey: [...QUERY_KEY, "minutes"],
    queryFn: fetchMinuteSeries,
    refetchInterval: 90_000,
    retry: false,
  });

  // Refresh on the global-hub rollup tick (broadcast), polling stays as fallback.
  useEffect(() => {
    const channel = supabase
      .channel("global-hub", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "tick" }, () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const computedAt = useMemo(() => {
    const stamps = (counters.data ?? []).map((c) => new Date(c.computed_at).getTime());
    return stamps.length ? Math.max(...stamps) : null;
  }, [counters.data]);
  const secondsAgo = computedAt ? Math.max(0, Math.round((now - computedAt) / 1000)) : null;

  const error = (sources.error ?? counters.error ?? minutes.error) as Error | undefined;
  const loading = sources.isLoading || counters.isLoading || minutes.isLoading;

  const metrics = useMemo(() => {
    const rows: {
      sourceTitle: string;
      sourceView: string;
      kpi: HubKpi;
      value: number | null;
    }[] = [];
    (sources.data ?? []).forEach((s) => {
      const counter = counterFor(counters.data ?? [], s.source_view, code);
      (s.kpis ?? []).forEach((kpi) => {
        const raw = counter?.kpis?.[kpi.key];
        const num = raw === null || raw === undefined ? null : Number(raw);
        rows.push({
          sourceTitle: s.display_name,
          sourceView: s.source_view,
          kpi,
          value: num !== null && Number.isNaN(num) ? null : num,
        });
      });
    });
    return rows;
  }, [sources.data, counters.data, code]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-12">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">
          {code
            ? `Vue du pays sélectionné · ${currentCountry?.flagEmoji} ${code} · lecture seule`
            : "Vue globale · lecture seule · tous les pays réunis"}
        </p>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-[#effafa] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-foreground"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Source indisponible: {error.message}
        </div>
      )}

      {!error && !loading && metrics.length === 0 && (
        <div className="rounded-2xl border border-[#effafa] bg-white p-8 text-center text-sm text-slate-600">
          Aucune donnée
        </div>
      )}

      {metrics.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {metrics.slice(0, 5).map((m) => (
              <StatTile
                key={`${m.sourceView}-${m.kpi.key}`}
                label={m.kpi.label}
                value={m.value}
                format={(v) => formatKpi(v, m.kpi.format)}
                secondsAgo={secondsAgo}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {metrics.map((m) => (
              <MetricCard
                key={`card-${m.sourceView}-${m.kpi.key}`}
                sourceTitle={m.sourceTitle}
                sourceView={m.sourceView}
                kpi={m.kpi}
                value={m.value}
                countryCode={code}
                countryCounters={countryRows(counters.data ?? [], m.sourceView)}
                minuteSeries={minutes.data ?? []}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
