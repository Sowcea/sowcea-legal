import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MODULE_NAME, MODULE_SLUG, vdb } from "@/lib/validationClient";
import { hasActiveRun, useValidationRun } from "@/hooks/useValidationRun";
import { ValidationTypeDialog } from "./ValidationTypeDialog";
import { ValidationRunway } from "./ValidationRunway";

export function ValidationModeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [on, setOn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { run, refetch, resetLocal, resetToPending } = useValidationRun(MODULE_SLUG, panelOpen);

  useEffect(() => {
    hasActiveRun(MODULE_SLUG).then((active) => {
      if (active) {
        setOn(true);
        setPanelOpen(true);
      }
    });
  }, []);

  const handleToggle = async (next: boolean) => {
    if (next) {
      setOn(true);
      setDialogOpen(true);
      return;
    }
    if (run?.paused && !window.confirm("Desligar agora aborta a validação em pausa. Continuar?")) {
      return;
    }
    setOn(false);
    setPanelOpen(false);
    resetLocal();
    const { error } = await vdb.rpc("validation_cancel_request", {
      p_module_slug: MODULE_SLUG,
    });
    if (error) toast.error(error.message ?? "Não foi possível cancelar a validação.");
  };


  const handleChoose = async (runType: "module" | "org") => {
    setDialogOpen(false);
    resetToPending();
    const { error } = await vdb.rpc("validation_request_run", {
      p_module_slug: MODULE_SLUG,
      p_run_type: runType,
    });
    if (error && !/already running or queued/i.test(error.message ?? "")) {
      const msg = /manifest/i.test(error.message ?? "")
        ? `Este módulo ainda não tem manifest de validação — pede ao Claude: prepara a validação do módulo ${MODULE_SLUG}`
        : error.message ?? "Não foi possível iniciar a validação.";
      toast.error(msg);
      setOn(false);
      return;
    }
    setOn(true);
    setPanelOpen(true);
    refetch();
  };

  return (
    <>
      {!collapsed && (
        <div className="border-t border-border/30 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Validation Mode
            </span>
            <Switch
              checked={on}
              onCheckedChange={handleToggle}
              aria-label="Validation Mode"
            />
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Valida cada secção do módulo, uma a uma.
          </p>
        </div>
      )}

      <ValidationTypeDialog
        open={dialogOpen}
        onCancel={() => {
          setDialogOpen(false);
          if (!panelOpen) setOn(false);
        }}
        onChoose={handleChoose}
      />

      {panelOpen && (
        <ValidationRunway
          moduleName={MODULE_NAME}
          run={run}
          refetch={refetch}
          onClose={() => setPanelOpen(false)}
          onRevalidate={() => setDialogOpen(true)}
          onApproved={() => {
            // After module approval the ORG run starts by itself: keep the panel
            // open and let polling/realtime pick up the new ORG run.
            if (run?.runType === "module") {
              refetch();
              return;
            }
            setPanelOpen(false);
            setOn(false);
            resetLocal();
          }}
        />
      )}
    </>
  );
}
