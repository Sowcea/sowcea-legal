/**
 * AgentPanels — separadores "Conseils" e "Tâches" do dock do agente (Parte G, Marino 07/09/2026 23:37):
 * o agente propõe melhorias (regras, UI, implementação, dados, automação); o Marino aprova/recusa AQUI; o sistema
 * (runner VPS) executa em automático e o resultado aparece na mesma carta. "Tâches": tarefas agendadas, últimas acções
 * e relatórios do agente. Só leitura + 2 escritas (aprovar/recusar) via Edge Fn `module-agent-actions`.
 */
import { useCallback, useEffect, useState } from 'react';
import { Inline } from './AgentMarkdown';

export type Proposal = { id: string; kind: string; title: string; rationale: string | null; proposal: { details?: string; sql?: string | null; steps?: string[] | null } | null; impact: string | null; status: string; proposed_by: string; decision_note: string | null; decided_at: string | null; applied_at: string | null; result: Record<string, unknown> | null; created_at: string };
export type Task = { id: string; title: string; action: string; params: Record<string, unknown>; every_minutes: number | null; next_run_at: string; last_run_at: string | null; last_result: Record<string, unknown> | null; runs: number; max_runs: number | null; status: string; created_at: string };
export type LogRow = { action: string; actor: string; ok: boolean; result: Record<string, unknown> | null; created_at: string };

const KIND: Record<string, { label: string; cls: string }> = {
  rule: { label: 'Règle', cls: 'bg-sky-100 text-sky-800' }, ui: { label: 'UI', cls: 'bg-violet-100 text-violet-800' }, implementation: { label: 'Implémentation', cls: 'bg-indigo-100 text-indigo-800' },
  data: { label: 'Données', cls: 'bg-amber-100 text-amber-800' }, automation: { label: 'Automatisation', cls: 'bg-teal-100 text-teal-800' }, other: { label: 'Autre', cls: 'bg-slate-100 text-slate-700' },
};
const STATUS: Record<string, { label: string; cls: string }> = {
  proposed: { label: 'À valider', cls: 'bg-amber-100 text-amber-800' }, approved: { label: 'Approuvé · en file', cls: 'bg-sky-100 text-sky-800' }, in_progress: { label: 'En cours', cls: 'bg-sky-100 text-sky-800' },
  applied: { label: 'Appliqué', cls: 'bg-emerald-100 text-emerald-800' }, rejected: { label: 'Refusé', cls: 'bg-slate-200 text-slate-700' }, failed: { label: 'Échec', cls: 'bg-red-100 text-red-800' },
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-800' }, paused: { label: 'En pause', cls: 'bg-slate-100 text-slate-700' }, done: { label: 'Terminée', cls: 'bg-slate-200 text-slate-700' }, cancelled: { label: 'Annulée', cls: 'bg-slate-200 text-slate-700' },
};
const Chip = ({ map, k }: { map: Record<string, { label: string; cls: string }>; k: string }) => { const v = map[k] ?? { label: k, cls: 'bg-slate-100 text-slate-700' }; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{v.label}</span>; };
const when = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); const m = Math.round((Date.now() - d.getTime()) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return `il y a ${m} min`; if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`; return d.toLocaleDateString(); };

export function ProposalsPanel({ call, accent, isAdmin }: { call: (action: string, body: Record<string, unknown>) => Promise<any>; accent: string; isAdmin: boolean }) {
  const [rows, setRows] = useState<Proposal[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => call('proposals_list', {}).then((d) => setRows((d?.proposals ?? []) as Proposal[])).catch((e) => setErr(String(e?.message ?? e))), [call]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    const note = decision === 'rejected' ? (window.prompt('Raison du refus (optionnel)') ?? '') : '';
    setBusy(id); setErr(null);
    try { await call('proposals_decide', { id, decision, note }); await load(); } catch (e: any) { setErr(String(e?.message ?? e)); } finally { setBusy(null); }
  };
  const pending = (rows ?? []).filter((r) => r.status === 'proposed'); const others = (rows ?? []).filter((r) => r.status !== 'proposed');
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">L’agent propose des améliorations (règles, UI, implémentation, données, automatisation). Tu valides ici ; le système applique automatiquement et le résultat s’affiche sur la carte.</p>
      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      {rows === null && <p className="text-xs text-slate-600">Chargement…</p>}
      {rows !== null && rows.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center text-xs text-slate-600">Aucun conseil pour l’instant. Demande à l’agent : « Que proposes-tu d’améliorer ? »</div>}
      {[...pending, ...others].map((p) => {
        const isOpen = open === p.id;
        return (
          <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip map={KIND} k={p.kind} /><Chip map={STATUS} k={p.status} />
              <span className="ml-auto text-[10px] text-slate-600">{when(p.created_at)}</span>
            </div>
            <h4 className="mt-1.5 text-[13px] font-semibold text-slate-900"><Inline text={p.title} /></h4>
            {p.rationale && <p className="mt-1 text-[12px] text-slate-700"><Inline text={p.rationale} /></p>}
            <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen} className="mt-1.5 text-[11px] font-medium underline decoration-dotted underline-offset-2" style={{ color: accent }}>{isOpen ? 'Masquer les détails' : 'Voir les détails'}</button>
            {isOpen && (
              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-2.5 text-[12px] text-slate-700">
                {p.proposal?.details && <p className="whitespace-pre-wrap break-words">{p.proposal.details}</p>}
                {!!p.proposal?.steps?.length && <ol className="list-decimal space-y-0.5 pl-4">{p.proposal.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                {p.proposal?.sql && <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-slate-100">{p.proposal.sql}</pre>}
                {p.impact && <p><span className="font-semibold">Impact :</span> {p.impact}</p>}
                {p.decision_note && <p><span className="font-semibold">Décision :</span> {p.decision_note}</p>}
                {p.result && <p className="break-words"><span className="font-semibold">Résultat :</span> {String((p.result as any).summary ?? (p.result as any).note ?? (p.result as any).error ?? JSON.stringify(p.result)).slice(0, 600)}</p>}
              </div>
            )}
            {p.status === 'proposed' && (
              <div className="mt-2.5 flex gap-2">
                <button type="button" disabled={!isAdmin || busy === p.id} onClick={() => void decide(p.id, 'approved')} style={{ background: accent }} className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm disabled:opacity-40">✅ Approuver</button>
                <button type="button" disabled={!isAdmin || busy === p.id} onClick={() => void decide(p.id, 'rejected')} className="rounded-xl border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Refuser</button>
                {!isAdmin && <span className="self-center text-[10px] text-slate-600">réservé aux administrateurs</span>}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function TasksPanel({ call, accent, moduleSlug }: { call: (action: string, body: Record<string, unknown>) => Promise<any>; accent: string; moduleSlug: string }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [log, setLog] = useState<LogRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([call('tasks_list', {}), call('actions_log', { limit: 20 })]).then(([t, l]) => { setTasks((t?.tasks ?? []) as Task[]); setLog((l?.log ?? []) as LogRow[]); }).catch((e) => setErr(String(e?.message ?? e))), [call]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);
  const cancel = async (id: string) => { try { await call('tasks_cancel', { id }); await load(); } catch (e: any) { setErr(String(e?.message ?? e)); } };
  const label = (a: string) => ({ notifications_autofix: 'Auto-fix des notifications', notifications_resolve: 'Archiver / résoudre les notifications', validation_run: 'Lancer la validation', validation_status: 'État de la validation', report_save: 'Rapport', send_to_team: 'Envoyer à l’équipe', notifications_list: 'Lister les notifications', propose_improvement: 'Conseil proposé', data_update: 'Mise à jour de données', tasks_create: 'Tâche créée', tasks_cancel: 'Tâche annulée' } as Record<string, string>)[a] ?? a.replace(/_/g, ' ');
  return (
    <div className="space-y-4">
      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
      <section>
        <h4 className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><span aria-hidden className="h-3.5 w-1 rounded-full" style={{ background: accent }} />Tâches planifiées</h4>
        {tasks === null && <p className="text-xs text-slate-600">Chargement…</p>}
        {tasks !== null && tasks.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-center text-xs text-slate-600">Aucune tâche. Demande à l’agent : « Programme l’auto-fix des notifications toutes les heures. »</p>}
        <div className="space-y-2">
          {(tasks ?? []).map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <div className="flex flex-wrap items-center gap-1.5"><Chip map={STATUS} k={t.status} /><span className="text-[13px] font-medium text-slate-900">{t.title}</span></div>
              <p className="mt-0.5 text-[11px] text-slate-600">{label(t.action)} · {t.every_minutes ? `toutes les ${t.every_minutes} min` : 'une fois'} · {t.runs} exécution{t.runs > 1 ? 's' : ''}{t.last_run_at ? ` · dernière ${when(t.last_run_at)}` : ''}{t.status === 'active' ? ` · prochaine ${when(t.next_run_at) || 'bientôt'}` : ''}</p>
              {t.status === 'active' && <button type="button" onClick={() => void cancel(t.id)} className="mt-1 text-[11px] text-slate-600 underline decoration-dotted underline-offset-2">Annuler</button>}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h4 className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600"><span aria-hidden className="h-3.5 w-1 rounded-full" style={{ background: accent }} />Dernières actions</h4>
        {log !== null && log.length === 0 && <p className="text-xs text-slate-600">Aucune action encore pour {moduleSlug}.</p>}
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {(log ?? []).map((l, i) => (
            <li key={i} className="flex items-start gap-2 px-2.5 py-1.5 text-[12px]">
              <span aria-hidden className={`mt-1 h-2 w-2 shrink-0 rounded-full ${l.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="min-w-0 flex-1"><p className="text-slate-900">{label(l.action)} <span className="text-slate-600">· {l.actor.replace(/^user:.*/, 'toi').replace(/^agent:.*/, 'agent').replace(/^task:.*/, 'tâche').replace(/^runner$/, 'système')}</span></p>{l.result && <p className="truncate text-[11px] text-slate-600">{String((l.result as any).note ?? (l.result as any).error ?? (l.result as any).summary ?? '').slice(0, 140)}</p>}</div>
              <span className="shrink-0 text-[10px] text-slate-600">{when(l.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
