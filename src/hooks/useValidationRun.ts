import { useCallback, useEffect, useRef, useState } from "react";
import { vdb } from "@/lib/validationClient";

export type ItemStatus =
  | "pending"
  | "running"
  | "passed"
  | "passed_with_warnings"
  | "failed"
  | "skipped";

export interface ValidationRow {
  run_id: string;
  module_slug: string;
  run_type: "module" | "org";
  run_status: string;
  progress_pct: number | null;
  current_category: string | null;
  run_message: string | null;
  summary_md: string | null;
  started_at: string | null;
  finished_at: string | null;
  paused?: boolean | null;
  item_id: string;
  category_key: string;
  category_name: string;
  sort_order: number | null;
  item_status: ItemStatus;
  item_message: string | null;
  detail_md: string | null;
  evidence_urls: string[] | null;
  checks_total: number | null;
  checks_passed: number | null;
}

export interface ValidationRun {
  runId: string;
  runType: "module" | "org";
  runStatus: string;
  progressPct: number;
  currentCategory: string | null;
  runMessage: string | null;
  summaryMd: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  paused: boolean;
  items: ValidationRow[];
}

function buildRun(rows: ValidationRow[]): ValidationRun | null {
  if (!rows.length) return null;
  // newest run for the module
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
  );
  const runId = sorted[0].run_id;
  const items = rows
    .filter((r) => r.run_id === runId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const head = items[0];
  return {
    runId,
    runType: (head.run_type as "module" | "org") ?? "module",
    runStatus: head.run_status,
    progressPct: Number(head.progress_pct ?? 0),
    currentCategory: head.current_category,
    runMessage: head.run_message,
    summaryMd: head.summary_md,
    startedAt: head.started_at,
    finishedAt: head.finished_at,
    paused: Boolean(head.paused),
    items,
  };
}

export function useValidationRun(moduleSlug: string, enabled: boolean) {
  const [run, setRun] = useState<ValidationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const fetchRun = useCallback(async () => {
    const { data, error } = await vdb
      .from("v_validation_active_run")
      .select("*")
      .eq("module_slug", moduleSlug);
    if (error) return;
    setRun(buildRun((data ?? []) as ValidationRow[]));
  }, [moduleSlug]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    fetchRun().finally(() => setLoading(false));

    const interval = window.setInterval(() => {
      if (enabledRef.current) fetchRun();
    }, 5000);

    const channel = vdb
      .channel(`validation-${moduleSlug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "validation", table: "runs" },
        () => fetchRun()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "validation", table: "run_items" },
        () => fetchRun()
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      vdb.removeChannel(channel);
    };
  }, [enabled, moduleSlug, fetchRun]);

  const resetLocal = useCallback(() => setRun(null), []);

  // Optimistically reset every stripe to pending when a new run is requested.
  const resetToPending = useCallback(() => {
    setRun((prev) =>
      prev
        ? {
            ...prev,
            runStatus: "running",
            progressPct: 0,
            runMessage: "a preparar a validação…",
            summaryMd: null,
            finishedAt: null,
            paused: false,
            currentCategory: null,
            items: prev.items.map((i) => ({
              ...i,
              item_status: "pending" as ItemStatus,
              item_message: null,
              detail_md: null,
            })),
          }
        : prev
    );
  }, []);

  return { run, loading, refetch: fetchRun, resetLocal, resetToPending, setRun };

}

export async function hasActiveRun(moduleSlug: string): Promise<boolean> {
  const { data, error } = await vdb
    .from("v_validation_active_run")
    .select("run_id, run_status")
    .eq("module_slug", moduleSlug)
    .in("run_status", ["running", "awaiting_approval"])
    .limit(1);
  if (error) return false;
  return Boolean(data && data.length);
}
