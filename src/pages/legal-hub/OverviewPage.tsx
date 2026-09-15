/**
 * Vue d'ensemble — v_legal_overview (une ligne, tous les compteurs mesurés) + v_legal_source_freshness.
 * Rien n'est calculé à la main ici : chaque chiffre vient d'une colonne de la vue.
 */
import { useMemo } from 'react';
import {
  useLegalOverview,
  useSourceFreshness,
  fmtNum,
  fmtDateTime,
  ago,
} from '@/hooks/legal-hub/useLegalHub';
import { ErrorBox, KpiTile, Loading, NoData, NonMesure, Panel, PageHeader, Pill, Table, Td } from '@/components/legalhub/ui';

const syncTone = (s: string | null | undefined): 'good' | 'warn' | 'bad' | 'muted' =>
  s === 'healthy' ? 'good' : s === 'stale' || s === 'degraded' ? 'warn' : s === 'failing' || s === 'error' ? 'bad' : 'muted';

export default function OverviewPage() {
  const overview = useLegalOverview();
  const sources = useSourceFreshness();

  const o = overview.data;
  const stale = useMemo(() => (sources.data ?? []).filter((s) => s.stale), [sources.data]);
  const failing = useMemo(() => (sources.data ?? []).filter((s) => s.error || (s.http_status !== null && s.http_status >= 400)), [sources.data]);

  if (overview.isLoading) return <Loading />;
  if (overview.error) return <ErrorBox error={overview.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Tout ce que le Legal Hub a réellement mesuré. Un compteur à zéro est un zéro mesuré, pas un trou : il est affiché tel quel."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={syncTone(o?.sync_status)} title="public.v_legal_overview.sync_status">
              Synchronisation : {o?.sync_status ?? 'non mesurée'}
            </Pill>
            <Pill tone="teal" title="public.v_legal_overview.sync_last_seen">
              Vue {ago(o?.sync_last_seen)}
            </Pill>
          </div>
        }
      />

      {!o ? (
        <NoData what="la vue d'ensemble" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Obligations actives" value={o.requirements_active === null ? <NonMesure /> : fmtNum(o.requirements_active)} hint="v_legal_overview.requirements_active" />
            <KpiTile
              index={1}
              label="Confirmées"
              tone={o.requirements_confirmed === 0 ? 'warn' : 'good'}
              value={o.requirements_confirmed === null ? <NonMesure /> : fmtNum(o.requirements_confirmed)}
              hint={o.requirements_confirmed === 0 ? 'Aucune obligation encore confirmée' : 'Revue humaine faite'}
            />
            <KpiTile
              index={2}
              label="En brouillon"
              tone={o.requirements_draft && o.requirements_draft > 0 ? 'warn' : 'default'}
              value={o.requirements_draft === null ? <NonMesure /> : fmtNum(o.requirements_draft)}
              hint="À confirmer avant de s'y fier"
            />
            <KpiTile
              index={3}
              label="Revue en retard"
              tone={o.requirements_overdue && o.requirements_overdue > 0 ? 'bad' : 'default'}
              value={o.requirements_overdue === null ? <NonMesure /> : fmtNum(o.requirements_overdue)}
              hint="review_due dépassée"
            />
            <KpiTile index={4} label="Juridictions" value={o.jurisdictions === null ? <NonMesure /> : fmtNum(o.jurisdictions)} hint="Pays et blocs couverts" />
            <KpiTile index={5} label="Restrictions de contenu" value={o.content_restrictions === null ? <NonMesure /> : fmtNum(o.content_restrictions)} hint={`dont ${fmtNum(o.restrictions_confirmed)} confirmées`} />
            <KpiTile index={6} label="Traitements (RGPD art. 30)" value={o.processing_activities === null ? <NonMesure /> : fmtNum(o.processing_activities)} hint="Registre des traitements" />
            <KpiTile index={7} label="Pages légales publiées" value={o.legal_pages_published === null ? <NonMesure /> : fmtNum(o.legal_pages_published)} hint="legal_pages, statut publié" />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="État des sources">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#d0f0f0] bg-[#effafa] p-3">
                  <p className="text-2xl font-bold text-foreground">{o.sources_bound === null ? '—' : fmtNum(o.sources_bound)}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#006e6c]">Rattachées</p>
                </div>
                <div className={`rounded-xl border p-3 ${o.sources_stale && o.sources_stale > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-2xl font-bold text-foreground">{o.sources_stale === null ? '—' : fmtNum(o.sources_stale)}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-700">Périmées</p>
                </div>
                <div className={`rounded-xl border p-3 ${o.sources_failing && o.sources_failing > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                  <p className="text-2xl font-bold text-foreground">{o.sources_failing === null ? '—' : fmtNum(o.sources_failing)}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-700">En échec</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-[160px_1fr] gap-y-1 text-xs text-slate-800">
                <dt className="text-slate-700">Dernière mesure</dt>
                <dd>{fmtDateTime(o.last_measurement)}</dd>
                <dt className="text-slate-700">Synchroniseur vu</dt>
                <dd>{fmtDateTime(o.sync_last_seen)}</dd>
                <dt className="text-slate-700">Dossiers juridiques</dt>
                <dd>{o.cases_total === null ? <NonMesure /> : fmtNum(o.cases_total)}</dd>
              </dl>
            </Panel>

            <Panel title="Sources à surveiller" right={<Pill tone="teal">{fmtNum(sources.data?.length ?? null)} sources</Pill>}>
              {sources.isLoading ? (
                <Loading />
              ) : sources.error ? (
                <ErrorBox error={sources.error} />
              ) : (sources.data ?? []).length === 0 ? (
                <NoData what="la fraîcheur des sources" />
              ) : stale.length === 0 && failing.length === 0 ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                  Aucune source périmée ni en échec parmi les {fmtNum(sources.data?.length ?? null)} sources mesurées.
                </div>
              ) : (
                <Table head={['Source', 'Sujet', 'Dernier relevé', 'État']}>
                  {[...failing, ...stale.filter((s) => !failing.includes(s))].map((s) => (
                    <tr key={s.source_name} className="hover:bg-[#effafa]/60">
                      <Td className="font-medium">{s.source_name}</Td>
                      <Td>{s.topic ?? <NonMesure />}</Td>
                      <Td>{ago(s.last_fetch)}</Td>
                      <Td>
                        {s.error ? (
                          <Pill tone="bad" title={s.error}>
                            échec HTTP {s.http_status ?? '—'}
                          </Pill>
                        ) : (
                          <Pill tone="warn">périmée ({s.hours_since === null ? '—' : `${fmtNum(s.hours_since)} h`})</Pill>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Panel>
          </div>

          {o.requirements_confirmed === 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Aucune obligation encore confirmée.</strong> Les {fmtNum(o.requirements_draft)} obligations du catalogue sont en
              brouillon : elles ont une base légale et une source, mais aucune n'a été relue et confirmée. Tant que c'est le cas, rien
              ici ne doit être présenté comme une règle arrêtée.
            </div>
          )}
        </>
      )}
    </div>
  );
}
