import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Loader2, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MODULE_SLUG, vdb } from "@/lib/validationClient";
import type { ValidationRun, ValidationRow } from "@/hooks/useValidationRun";

interface Props {
  moduleName: string;
  run: ValidationRun | null;
  onClose: () => void;
  onRevalidate: () => void;
  onApproved: () => void;
  refetch: () => void;
}

function minutesAgo(iso: string | null): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function StatusDot({ status }: { status: ValidationRow["item_status"] }) {
  if (status === "passed")
    return <Check className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "failed") return <X className="h-4 w-4 shrink-0 text-red-600" />;
  const color =
    status === "running"
      ? "bg-amber-500 animate-pulse"
      : status === "passed_with_warnings"
        ? "bg-orange-500"
        : status === "skipped"
          ? "bg-gray-300"
          : "bg-red-500";
  return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />;
}


function ItemBadges({ item }: { item: ValidationRow }) {
  const text = `${item.detail_md ?? ""}\n${item.item_message ?? ""}`;
  const detail = (item.detail_md ?? "").trim();
  const tool = ["Lighthouse", "axe", "Supabase Advisor"].find((t) =>
    detail.toLowerCase().startsWith(t.toLowerCase())
  );
  const toolValue = tool ? detail.slice(tool.length).replace(/^[\s:·-]+/, "").split("\n")[0].slice(0, 24) : "";
  return (
    <>
      {text.includes("🔧") && (
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
          auto-corrigido
        </Badge>
      )}
      {text.includes("🔒") && (
        <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600">
          gate — abre após aprovação
        </Badge>
      )}
      {tool && (
        <Badge variant="outline" className="border-teal-300 bg-accent text-teal-700">
          ferramenta externa{toolValue ? ` · ${toolValue}` : ""}
        </Badge>
      )}
    </>
  );
}

export function ValidationRunway({
  moduleName,
  run,
  onClose,
  onRevalidate,
  onApproved,
  refetch,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [dismissStale, setDismissStale] = useState(false);
  const [fixLog, setFixLog] = useState<{ status: string; summary: string | null } | null>(null);
  const runningRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDismissStale(false);
    setContinuing(false);
  }, [run?.runId]);

  useEffect(() => {
    setContinuing(false);
  }, [run?.currentCategory, run?.paused]);

  useEffect(() => {
    let cancelled = false;
    vdb
      .from("v_validation_fix_log")
      .select("status, summary, started_at")
      .eq("module_slug", MODULE_SLUG)
      .order("started_at", { ascending: false })
      .limit(1)
      .then(({ data }: { data: any[] | null }) => {
        if (!cancelled) setFixLog(data?.[0] ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [run?.runId, run?.runMessage]);

  useEffect(() => {
    if (run?.runMessage?.includes("relançada automaticamente")) {
      toast.info("Nova validação em curso (auto)");
    }
  }, [run?.runId, run?.runMessage]);

  useEffect(() => {
    runningRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [run?.currentCategory]);

  const counts = useMemo(() => {
    const items = run?.items ?? [];
    return {
      total: items.length,
      done: items.filter((i) =>
        ["passed", "passed_with_warnings", "failed", "skipped"].includes(i.item_status)
      ).length,
      green: items.filter((i) => i.item_status === "passed").length,
      orange: items.filter((i) => i.item_status === "passed_with_warnings").length,
      red: items.filter((i) => i.item_status === "failed").length,
    };
  }, [run]);

  const isRunning = run?.runStatus === "running";
  const isFinished =
    run?.runStatus === "awaiting_approval" ||
    run?.runStatus === "failed" ||
    run?.runStatus === "aborted";
  const isFixPass = Boolean(
    run?.runMessage?.includes("fix pass") ||
      run?.runMessage?.includes("relançada automaticamente")
  );
  const needsFix = Boolean(run?.runMessage?.includes("precisam de correcção"));
  const staleMinutes = minutesAgo(run?.finishedAt ?? null);
  const showStale = Boolean(isFinished && !dismissStale && staleMinutes >= 2);

  const pausedItem = useMemo(() => {
    if (!run?.paused) return null;
    const done = run.items.filter((i) =>
      ["passed", "passed_with_warnings", "failed"].includes(i.item_status)
    );
    return done.length ? done[done.length - 1] : null;
  }, [run]);

  const handleApprove = async () => {
    if (!run) return;
    setApproving(true);
    setApproveError(null);
    const { error } = await vdb.rpc("validation_approve_run", { p_run_id: run.runId });
    setApproving(false);
    if (error) {
      setApproveError(error.message ?? "Não foi possível aprovar a validação.");
      return;
    }
    toast.success("Módulo validado ✅");
    setSummaryOpen(false);
    onApproved();
  };

  const handleContinue = async () => {
    if (!run) return;
    setContinuing(true);
    const { error } = await vdb.rpc("validation_continue_run", { p_run_id: run.runId });
    if (error) {
      setContinuing(false);
      toast.error(error.message ?? "Não foi possível continuar.");
      return;
    }
    refetch();
  };

  return createPortal(
    <>
      <aside className="fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-border bg-background shadow-lg sm:w-[380px]">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Validation Runway</h2>
              <p className="text-xs text-slate-600">{moduleName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar painel">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {run && (
            <>
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    run.runType === "org"
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-teal-300 bg-accent text-teal-700"
                  )}
                >
                  {run.runType === "org" ? "Setup ORG" : "Validação de Módulo"}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, run.progressPct))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {counts.done}/{counts.total} categorias · {Math.round(run.progressPct)}%
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{run.runMessage ?? (isRunning ? "a validar…" : "")}</span>
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 rounded-lg border border-border bg-accent p-2 text-[11px] leading-snug text-slate-600">
            Validação contínua: repete, corrige e relança sozinha até ficar verde. Só a
            aprovação é tua.
          </div>

          {isFixPass && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">🤖 Correcção automática em curso</p>
              {fixLog && (
                <p className="mt-1 whitespace-pre-wrap">
                  {fixLog.status}
                  {fixLog.summary ? ` · ${fixLog.summary}` : ""}
                </p>
              )}
            </div>
          )}

          {needsFix && (
            <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              <p className="font-semibold">🛠️ Correcção pedida</p>
              {run?.summaryMd && (
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">{run.summaryMd}</pre>
              )}
              <p className="mt-1">
                O backend corrige e relança sozinho; se precisar de ti, aparece na Prompt Zone
                (grupo Auto-fix UI).
              </p>
            </div>
          )}

          {showStale && run && (
            <div className="mb-3 flex gap-2 rounded-lg border border-border bg-accent p-3 text-xs text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Última validação: {run.runType === "org" ? "Setup ORG" : "Módulo"} ·
                terminada há {staleMinutes} min — carrega em Revalidar para correr de novo.
              </span>
            </div>
          )}

          {!run && (
            <p className="text-sm text-slate-600">Nenhuma validação em curso.</p>
          )}

          <div className="space-y-1">
            {run?.items.map((item) => {
              const running = item.item_status === "running";
              return (
                <div
                  key={item.item_id}
                  ref={running ? runningRef : undefined}
                  onClick={() =>
                    item.item_status === "failed"
                      ? setExpanded(expanded === item.item_id ? null : item.item_id)
                      : undefined
                  }
                  className={cn(
                    "rounded-lg px-2 py-2 transition-all duration-300",
                    running && "bg-accent",
                    item.item_status === "failed" && "cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={item.item_status} />
                    <span
                      className={cn(
                        "text-sm",
                        item.item_status === "pending" || item.item_status === "skipped"
                          ? "text-slate-600"
                          : "text-foreground"
                      )}
                    >
                      {item.category_name}
                    </span>
                    {item.item_status === "passed_with_warnings" && (
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        <AlertTriangle className="mr-1 h-3 w-3" /> aviso
                      </Badge>
                    )}
                    {item.item_status === "failed" && (
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        ✕ falhou
                      </Badge>
                    )}
                    <ItemBadges item={item} />
                    {item.item_status === "skipped" && (
                      <span className="text-xs text-slate-600">saltado</span>
                    )}
                  </div>

                  {item.item_message && item.item_status !== "pending" && (
                    <p className="ml-[18px] mt-0.5 text-xs text-slate-600">
                      {running ? `a testar: ${item.item_message}` : item.item_message}
                    </p>
                  )}

                  {expanded === item.item_id && item.detail_md && (
                    <pre className="ml-[18px] mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs text-foreground">
                      {item.detail_md}
                    </pre>
                  )}

                  {item.evidence_urls?.length ? (
                    <div className="ml-[18px] mt-1 flex flex-wrap gap-2">
                      {item.evidence_urls.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          evidência
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ORG step pause card */}
          {run?.paused && pausedItem && (
            <div className="mt-4 rounded-xl border border-border bg-accent p-4">
              <h3 className="text-sm font-semibold text-foreground">Etapa concluída</h3>
              <p className="mt-1 text-xs text-slate-600">
                {pausedItem.category_name} · ✅ {pausedItem.checks_passed ?? 0}/
                {pausedItem.checks_total ?? 0}
                {pausedItem.item_status === "passed_with_warnings" ? " · ⚠ avisos" : ""}
                {pausedItem.item_status === "failed" ? " · ❌ falhas" : ""}
              </p>
              {pausedItem.detail_md && (
                <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-background p-2 text-xs text-foreground">
                  {pausedItem.detail_md}
                </pre>
              )}
              <Button className="mt-3 w-full" onClick={handleContinue} disabled={continuing}>
                {continuing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> a continuar…
                  </>
                ) : (
                  "Continuar para a próxima etapa →"
                )}
              </Button>
              <p className="mt-2 text-xs text-slate-600">
                a validação fica em pausa até 4 horas; depois expira e podes revalidar
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          {isRunning && !run?.paused && (
            <p className="text-xs text-slate-600">
              podes fechar o painel — a validação continua no servidor
            </p>
          )}

          {run?.runStatus === "awaiting_approval" && (
            <div className="rounded-xl border border-border bg-accent p-3">
              <h3 className="text-sm font-semibold text-foreground">Validação terminada</h3>
              <p className="mt-1 text-xs text-slate-600">
                {counts.green} verdes · {counts.orange} laranja · {counts.red} vermelhas
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setApproveError(null);
                    setSummaryOpen(true);
                  }}
                >
                  Ver resumo e aprovar
                </Button>
                <Button variant="secondary" onClick={onRevalidate}>
                  Revalidar
                </Button>
              </div>
            </div>
          )}

          {(run?.runStatus === "failed" || run?.runStatus === "aborted") && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <h3 className="text-sm font-semibold text-red-700">
                {run?.runStatus === "aborted" ? "Validação expirou/abortada" : "Validação falhou"}
              </h3>
              <p className="mt-1 text-xs text-red-700/80">
                {counts.green} verdes · {counts.orange} laranja · {counts.red} vermelhas
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="outline" onClick={() => setSummaryOpen(true)}>
                  Ver resumo
                </Button>
                <Button variant="secondary" onClick={onRevalidate}>
                  Revalidar
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] bg-background sm:max-w-[640px]">
          <h2 className="text-base font-semibold text-foreground">Resumo da validação</h2>
          <pre className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs text-foreground">
            {run?.summaryMd ?? "Sem resumo disponível."}
          </pre>
          {approveError && (
            <p className="text-xs text-red-600">{approveError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSummaryOpen(false)}>
              Fechar
            </Button>
            {run?.runStatus === "awaiting_approval" && (
              <Button onClick={handleApprove} disabled={approving}>
                {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aprovar validação
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>,
    document.body
  );
}
