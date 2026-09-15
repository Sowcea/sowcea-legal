/**
 * Sources — v_legal_source_freshness. D'où viennent les obligations, et dans quel état est le flux.
 * Le rattachement au Data Center est MESURÉ : on rapproche `source_name` du catalogue public
 * `v_data_center_sources`. Aucune source n'est étiquetée « Data Center » sans correspondance réelle.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/integrations/supabase/db';
import { useSourceFreshness, fmtNum, fmtDateTime, ago } from '@/hooks/legal-hub/useLegalHub';
import { Chips, ErrorBox, KpiTile, Loading, NoData, NonMesure, PageHeader, Panel, Pill, SearchInput, Select, Table, Td } from '@/components/legalhub/ui';

interface DcSourceRef {
  source_name: string;
  display_name: string | null;
  domain: string | null;
  owner_module: string | null;
  regime: string | null;
  connector_status: string | null;
}

/** Catalogue du Data Center — sert uniquement à rapprocher les noms, jamais à inventer une source. */
function useDataCenterCatalog() {
  return useQuery<DcSourceRef[]>({
    queryKey: ['legal', 'dc-catalog'],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await db
        .from('v_data_center_sources')
        .select('source_name,display_name,domain,owner_module,regime,connector_status');
      if (error) throw new Error(`v_data_center_sources : ${error.message}`);
      return (data ?? []) as DcSourceRef[];
    },
    retry: false,
  });
}

const TOPIC_LABELS: Record<string, string> = {
  consumer: 'Droit de la consommation',
  privacy: 'Vie privée',
  product_safety: 'Sécurité des produits',
  sanctions: 'Sanctions',
  tax_vat: 'TVA et fiscalité',
};

export default function SourcesPage() {
  const q = useSourceFreshness();
  const dc = useDataCenterCatalog();
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const [topic, setTopic] = useState('all');
  const [state, setState] = useState('all');
  const [text, setText] = useState('');

  const dcByName = useMemo(() => {
    const m = new Map<string, DcSourceRef>();
    for (const s of dc.data ?? []) m.set(s.source_name, s);
    return m;
  }, [dc.data]);

  const topics = useMemo(() => Array.from(new Set(rows.map((r) => r.topic ?? '').filter(Boolean))).sort(), [rows]);

  const list = useMemo(
    () =>
      rows.filter((r) => {
        if (topic !== 'all' && r.topic !== topic) return false;
        if (state === 'stale' && !r.stale) return false;
        if (state === 'failing' && !r.error && !(r.http_status !== null && r.http_status >= 400)) return false;
        if (state === 'bound' && !(Number(r.requirements_bound ?? 0) > 0)) return false;
        if (state === 'unbound' && Number(r.requirements_bound ?? 0) > 0) return false;
        if (text && !`${r.source_name} ${r.topic ?? ''} ${(r.country_codes ?? []).join(' ')}`.toLowerCase().includes(text.toLowerCase())) return false;
        return true;
      }),
    [rows, topic, state, text]
  );

  const fromDataCenter = useMemo(() => rows.filter((r) => dcByName.has(r.source_name)).length, [rows, dcByName]);
  const stale = rows.filter((r) => r.stale).length;
  const failing = rows.filter((r) => r.error || (r.http_status !== null && r.http_status >= 400)).length;
  const bound = rows.reduce((a, r) => a + Number(r.requirements_bound ?? 0), 0);

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sources"
        subtitle="Chaque source officielle suivie par le Legal Hub, avec la date de son dernier relevé, le code HTTP obtenu et le nombre d'obligations qui s'y rattachent."
        right={
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Rechercher une source…" />
            <Select
              ariaLabel="Filtrer par sujet"
              value={topic}
              onChange={setTopic}
              options={[{ value: 'all', label: 'Tous les sujets' }, ...topics.map((t) => ({ value: t, label: TOPIC_LABELS[t] ?? t }))]}
            />
            <Select
              ariaLabel="Filtrer par état"
              value={state}
              onChange={setState}
              options={[
                { value: 'all', label: 'Tous les états' },
                { value: 'stale', label: 'Périmées' },
                { value: 'failing', label: 'En échec' },
                { value: 'bound', label: 'Avec obligations' },
                { value: 'unbound', label: 'Sans obligation' },
              ]}
            />
          </div>
        }
      />

      {rows.length === 0 ? (
        <NoData what="les sources du Legal Hub" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Sources suivies" value={fmtNum(rows.length)} />
            <KpiTile index={1} label="Périmées" tone={stale > 0 ? 'warn' : 'good'} value={fmtNum(stale)} hint="colonne stale" />
            <KpiTile index={2} label="En échec" tone={failing > 0 ? 'bad' : 'good'} value={fmtNum(failing)} hint="erreur ou HTTP ≥ 400" />
            <KpiTile index={3} label="Obligations rattachées" value={fmtNum(bound)} hint="somme de requirements_bound" />
          </section>

          <div className="rounded-xl border border-[#d0f0f0] bg-[#effafa] p-4 text-sm text-slate-800">
            {dc.isLoading ? (
              'Rapprochement avec le catalogue du Data Center en cours…'
            ) : dc.error ? (
              <>
                Le catalogue du Data Center n'a pas pu être lu ({String((dc.error as Error).message)}) — la colonne « Collecte » reste donc{' '}
                <em>non mesurée</em> sur toutes les lignes.
              </>
            ) : (
              <>
                <strong>{fmtNum(fromDataCenter)}</strong> source(s) sur {fmtNum(rows.length)} sont rapprochées du catalogue du{' '}
                <strong>Data Center</strong> (<code className="rounded bg-white px-1">public.v_data_center_sources</code>) : c'est lui qui
                fait la collecte, le Legal Hub ne fait que lire ce qu'il rapporte. Les autres sont propres au Legal Hub.
              </>
            )}
          </div>

          <Panel title="Détail des sources">
            {list.length === 0 ? (
              <NoData what="ces filtres" />
            ) : (
              <Table head={['Source', 'Sujet', 'Pays', 'Cadence', 'Dernier relevé', 'HTTP', 'Éléments', 'Obligations', 'État', 'Collecte']}>
                {list.map((s) => {
                  const ref = dcByName.get(s.source_name);
                  return (
                    <tr key={s.source_name} className="hover:bg-[#effafa]/60">
                      <Td>
                        <div className="font-medium text-foreground">{ref?.display_name ?? s.source_name}</div>
                        <div className="font-mono text-xs text-slate-700">{s.source_name}</div>
                      </Td>
                      <Td>{s.topic ? TOPIC_LABELS[s.topic] ?? s.topic : <NonMesure />}</Td>
                      <Td className="max-w-[180px]">
                        {(s.country_codes ?? []).length === 0 ? <Pill tone="muted">tous pays</Pill> : <Chips items={s.country_codes} />}
                      </Td>
                      <Td>{s.poll_hours === null ? <NonMesure /> : `${fmtNum(s.poll_hours)} h`}</Td>
                      <Td>
                        <div>{ago(s.last_fetch)}</div>
                        <div className="text-xs text-slate-700">{fmtDateTime(s.last_fetch)}</div>
                      </Td>
                      <Td>
                        {s.http_status === null ? (
                          <NonMesure />
                        ) : (
                          <Pill tone={s.http_status >= 400 ? 'bad' : s.http_status >= 300 ? 'warn' : 'good'}>{s.http_status}</Pill>
                        )}
                      </Td>
                      <Td>{fmtNum(s.item_count)}</Td>
                      <Td className="font-semibold">
                        {Number(s.requirements_bound ?? 0) === 0 ? <Pill tone="muted">0</Pill> : fmtNum(s.requirements_bound)}
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          {s.error ? (
                            <Pill tone="bad" title={s.error}>
                              en échec
                            </Pill>
                          ) : s.stale ? (
                            <Pill tone="warn">périmée</Pill>
                          ) : (
                            <Pill tone="good">à jour</Pill>
                          )}
                          {s.changed && <Pill tone="teal">a changé</Pill>}
                          {s.is_enabled === false && <Pill tone="muted">désactivée</Pill>}
                          {s.hours_since !== null && <span className="text-xs text-slate-700">{fmtNum(s.hours_since, 1)} h</span>}
                        </div>
                      </Td>
                      <Td>
                        {dc.isLoading ? (
                          <span className="text-xs text-slate-700">…</span>
                        ) : ref ? (
                          <Pill tone="teal" title={`owner_module : ${ref.owner_module ?? '—'} · régime : ${ref.regime ?? '—'}`}>
                            Data Center
                          </Pill>
                        ) : dc.error ? (
                          <NonMesure />
                        ) : (
                          <Pill tone="muted">propre au Legal Hub</Pill>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            )}
            <p className="mt-2 text-xs text-slate-700">
              Source : <code className="rounded bg-slate-100 px-1">public.v_legal_source_freshness</code>. La colonne « Collecte » est
              obtenue en rapprochant <code>source_name</code> de <code>public.v_data_center_sources</code>.
            </p>
          </Panel>
        </>
      )}
    </div>
  );
}
