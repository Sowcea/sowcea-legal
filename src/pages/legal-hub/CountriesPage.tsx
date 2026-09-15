/**
 * Couverture par pays — v_legal_country_matrix. Tableau + graphique, uniquement des lignes mesurées.
 */
import { useMemo } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLegalCountryMatrix, fmtNum, ago } from '@/hooks/legal-hub/useLegalHub';
import { Country, ErrorBox, KpiTile, Loading, NoData, NonMesure, PageHeader, Panel, Pill, Table, Td } from '@/components/legalhub/ui';

const TEAL = '#00b6b4';
const TEAL_DEEP = '#007a79';

export default function CountriesPage() {
  const q = useLegalCountryMatrix();
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const chart = useMemo(
    () =>
      rows
        .filter((r) => r.country_code)
        .map((r) => ({
          country: r.country_code as string,
          name: r.country_name ?? r.country_code,
          confirmed: Number(r.confirmed ?? 0),
          draft: Number(r.draft ?? 0),
          blocking: Number(r.blocking ?? 0),
        })),
    [rows]
  );

  const totals = useMemo(
    () => ({
      countries: rows.length,
      eu: rows.filter((r) => r.eu_member).length,
      blocking: rows.reduce((a, r) => a + Number(r.blocking ?? 0), 0),
      overdue: rows.reduce((a, r) => a + Number(r.overdue ?? 0), 0),
    }),
    [rows]
  );

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Couverture par pays"
        subtitle="Une ligne par juridiction mesurée : ce qui vient du droit de l'Union, ce qui est national, ce qui bloque, et ce dont la revue est en retard."
      />

      {rows.length === 0 ? (
        <NoData what="la couverture par pays" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Juridictions mesurées" value={fmtNum(totals.countries)} />
            <KpiTile index={1} label="Membres de l'UE" value={fmtNum(totals.eu)} hint="colonne eu_member" />
            <KpiTile index={2} label="Obligations bloquantes" tone={totals.blocking > 0 ? 'warn' : 'default'} value={fmtNum(totals.blocking)} />
            <KpiTile index={3} label="Revues en retard" tone={totals.overdue > 0 ? 'bad' : 'good'} value={fmtNum(totals.overdue)} />
          </section>

          <Panel title="Obligations par pays">
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="country" tick={{ fontSize: 12, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #d0f0f0', fontSize: 12, color: '#0f172a' }}
                    formatter={(v: number, n: string) => [fmtNum(v), n]}
                    labelFormatter={(l) => chart.find((c) => c.country === l)?.name ?? String(l)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#334155' }} />
                  <RBar dataKey="confirmed" name="Confirmées" stackId="s" fill={TEAL_DEEP} radius={[0, 0, 0, 0]} />
                  <RBar dataKey="draft" name="En brouillon" stackId="s" fill={TEAL} radius={[4, 4, 0, 0]}>
                    {chart.map((c) => (
                      <Cell key={c.country} fill={TEAL} />
                    ))}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-700">
              Source : <code className="rounded bg-slate-100 px-1">public.v_legal_country_matrix</code> — colonnes <code>confirmed</code> et{' '}
              <code>draft</code>. Aucune donnée n'est ajoutée pour les pays absents de la vue.
            </p>
          </Panel>

          <Panel title="Détail par juridiction">
            <Table head={['Pays', 'UE', 'Total', 'Confirmées', 'Brouillons', 'Bloquantes', 'Revue en retard', 'Nationales', "Issues de l'UE", 'Dernier contrôle']}>
              {rows.map((r) => (
                <tr key={r.country_code ?? 'nc'} className="hover:bg-[#effafa]/60">
                  <Td className="font-medium">
                    <Country code={r.country_code} name={r.country_name} />
                  </Td>
                  <Td>{r.eu_member === null ? <NonMesure /> : r.eu_member ? <Pill tone="teal">UE</Pill> : <Pill tone="muted">hors UE</Pill>}</Td>
                  <Td className="font-semibold">{fmtNum(r.requirements_total)}</Td>
                  <Td>
                    {Number(r.confirmed ?? 0) === 0 ? (
                      <Pill tone="warn">0</Pill>
                    ) : (
                      <Pill tone="good">{fmtNum(r.confirmed)}</Pill>
                    )}
                  </Td>
                  <Td>{fmtNum(r.draft)}</Td>
                  <Td className={Number(r.blocking ?? 0) > 0 ? 'font-semibold text-amber-900' : ''}>
                    {fmtNum(r.blocking)}
                  </Td>
                  <Td className={Number(r.overdue ?? 0) > 0 ? 'font-semibold text-red-800' : ''}>{fmtNum(r.overdue)}</Td>
                  <Td>{fmtNum(r.national)}</Td>
                  <Td>{fmtNum(r.from_eu)}</Td>
                  <Td>{ago(r.last_source_check)}</Td>
                </tr>
              ))}
            </Table>
          </Panel>
        </>
      )}
    </div>
  );
}
