import { supabase } from "@/integrations/supabase/client";

// Global Hub views/RPCs are not present in generated types.
const sb = supabase as any;

/** Registry slug of this module (public.global_hub_sources.module_slug). */
export const REGISTRY_SLUG = "legal-hub";

export type KpiFormat = "number" | "currency" | "percent";
export type KpiAgg = "count" | "sum" | "avg" | "max";

export interface HubKpi {
  key: string;
  label: string;
  agg: KpiAgg;
  column: string | null;
  format?: KpiFormat;
}

export interface HubSource {
  module_slug: string;
  display_name: string;
  source_view: string;
  country_column: string;
  time_column: string | null;
  kpis: HubKpi[];
  sort: number | null;
  is_active: boolean;
}

export interface HubCounter {
  module_slug: string;
  source_view: string;
  country_code: string; // '*' global, 'NC' non classé, else ISO-2
  kpis: Record<string, number | null>;
  rows: number;
  computed_at: string;
}

export interface HubMinutePoint {
  module_slug: string;
  source_view: string;
  minute: string;
  kpis: Record<string, number | null>;
  rows: number;
}

export async function fetchSources(): Promise<HubSource[]> {
  const { data, error } = await sb
    .from("global_hub_sources")
    .select("module_slug,display_name,source_view,country_column,time_column,kpis,sort,is_active")
    .eq("module_slug", REGISTRY_SLUG)
    .eq("is_active", true)
    .order("sort", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as HubSource[];
}

export async function fetchCounters(): Promise<HubCounter[]> {
  const { data, error } = await sb
    .from("v_global_hub_counters")
    .select("module_slug,source_view,country_code,kpis,rows,computed_at")
    .eq("module_slug", REGISTRY_SLUG);
  if (error) throw new Error(error.message);
  return (data ?? []) as HubCounter[];
}

export async function fetchMinuteSeries(): Promise<HubMinutePoint[]> {
  const { data, error } = await sb
    .from("v_global_hub_rollup_minute")
    .select("module_slug,source_view,minute,kpis,rows")
    .eq("module_slug", REGISTRY_SLUG)
    .order("minute", { ascending: true })
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as HubMinutePoint[];
}

export interface TimeseriesPoint {
  day: string;
  values: Record<string, number | null>;
}

/** Daily series through the contract RPC. Returns [] when the RPC is unavailable. */
export async function fetchTimeseries(
  sourceView: string,
  countryCode: string | null,
  days: number
): Promise<TimeseriesPoint[]> {
  const { data, error } = await sb.rpc("global_hub_timeseries", {
    p_module_slug: REGISTRY_SLUG,
    p_source_view: sourceView,
    p_country_code: countryCode,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  const rows: any[] = Array.isArray(data) ? data : (data?.points ?? data?.series ?? []);
  return rows.map((r: any) => ({
    day: String(r.day ?? r.bucket ?? r.date ?? ""),
    values: (r.kpis ?? r.values ?? r) as Record<string, number | null>,
  }));
}

export function formatKpi(value: number | null, format?: KpiFormat): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (format === "currency")
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  if (format === "percent") return `${Math.round(value * 10) / 10}%`;
  const rounded = Math.round(value * 10) / 10;
  return new Intl.NumberFormat("fr-FR").format(rounded);
}

/** Pick the counter row for a source + selected country ('*' when global). */
export function counterFor(
  counters: HubCounter[],
  sourceView: string,
  countryCode: string | null
): HubCounter | undefined {
  return counters.find(
    (c) => c.source_view === sourceView && c.country_code === (countryCode ?? "*")
  );
}

/** Country rows for a source, excluding the global aggregate. */
export function countryRows(counters: HubCounter[], sourceView: string): HubCounter[] {
  return counters.filter((c) => c.source_view === sourceView && c.country_code !== "*");
}
