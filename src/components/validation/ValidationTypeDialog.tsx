import { LayoutGrid, Network } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onCancel: () => void;
  onChoose: (runType: "module" | "org") => void;
}

const options = [
  {
    type: "module" as const,
    icon: LayoutGrid,
    name: "Validar Módulo",
    subtitle: "Testa cada secção da app, dados e ecrãs, um a um.",
  },
  {
    type: "org" as const,
    icon: Network,
    name: "Validar Setup ORG",
    subtitle: "Testa o stack de agentes: Dify → Paperclip → Hermes → Triad Center.",
  },
];

export function ValidationTypeDialog({ open, onCancel, onChoose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[420px] overflow-hidden bg-background p-6">
        <h2 className="mb-4 text-center text-[18px] font-semibold text-foreground">
          Que validação queres correr?
        </h2>

        <div className="flex flex-col gap-3">
          {options.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onChoose(opt.type)}
              className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent">
                <opt.icon className="h-5 w-5 text-primary" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{opt.name}</span>
                <span className="text-sm text-slate-600">{opt.subtitle}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
