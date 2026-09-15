/**
 * Couverture par verticale — v_legal_vertical_coverage.
 * Une ligne par catégorie du catalogue de services, regroupée par section.
 */
import { useMemo, useState } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLegalVerticalCoverage, fmtNum } from '@/hooks/legal-hub/useLegalHub';
import { Bar, ErrorBox, KpiTile, Loading, NoData, NonMesure, PageHeader, Panel, Pill, SearchInput, Select, Table, Td } from '@/components/legalhub/ui';

const TEAL_DEEP = '#007a79';
const TEAL = '#00b6b4';

export default function VerticalsPage() {
  const q = useLegalVerticalCoverage();
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const [section, setSection] = useState('all');
  const [text, setText] = useState('');

  const sections = useMemo(
    () => Array.from(new Set(rows.map((r) => r.section_slug ?? '').filter(Boolean))).sort(),
    [rows]
  );

  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (section === 'all' || r.section_slug === section) &&
          (!text || `${r.category_slug ?? ''} ${r.category_name ?? ''} ${r.section_name ?? ''}`.toLowerCase().includes(text.toLowerCase()))
      ),
    [rows, section, text]
  );

  const maxTotal = useMemo(() => Math.max(1, ...rows.map((r) => Number(r.requirements_total ?? 0))), [rows]);

  /** Une barre par section : somme des colonnes mesurées, jamais une estimation. */
  const bySection = useMemo(() => {
    const m = new Map<string, { section: string; name: string; total: number; blocking: number; specific: number }>();
    for (const r of rows) {
      const key = r.section_slug ?? '—';
      const cur = m.get(key) ?? { section: key, name: r.section_name ?? key, total: 0, blocking: 0, specific: 0 };
      cur.total += Number(r.requirements_total ?? 0);
      cur.blocking += Number(r.blocking ?? 0);
      cur.specific += Number(r.specific_to_category ?? 0);
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const totals = useMemo(
    () => ({
      categories: rows.length,
      sections: sections.length,
      blocking: rows.reduce((a, r) => a + Number(r.blocking ?? 0), 0),
      specific: rows.reduce((a, r) => a + Number(r.specific_to_category ?? 0), 0),
    }),
    [rows, sections.length]
  );

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Couverture par verticale"
        subtitle="Ce que chaque catégorie de services porte comme obligations : celles qui lui sont propres et celles qui s'appliquent à tout le catalogue."
        right={
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Rechercher une catégorie…" />
            <Select
              ariaLabel="Filtrer par section"
              value={section}
              onChange={setSection}
              options={[{ value: 'all', label: 'Toutes les sections' }, ...sections.map((s) => ({ value: s, label: rows.find((r) => r.section_slug === s)?.section_name ?? s }))]}
            />
          </div>
        }
      />

      {rows.length === 0 ? (
        <NoData what="la couverture par verticale" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Catégories mesurées" value={fmtNum(totals.categories)} />
            <KpiTile index={1} label="Sections" value={fmtNum(totals.sections)} />
            <KpiTile index={2} label="Obligations bloquantes" tone={totals.blocking > 0 ? 'warn' : 'default'} value={fmtNum(totals.blocking)} />
            <KpiTile index={3} label="Spécifiques à une catégorie" value={fmtNum(totals.specific)} hint="le reste est transversal" />
          </section>

          <Panel title="Obligations par section">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySection} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #d0f0f0', fontSize: 12, color: '#0f172a' }} formatter={(v: number, n: string) => [fmtNum(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#334155' }} />
                  <RBar dataKey="total" name="Obligations" fill={TEAL_DEEP} radius={[0, 4, 4, 0]} />
                  <RBar dataKey="blocking" name="Bloquantes" fill={TEAL} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-700">
              Source : <code className="rounded bg-slate-100 px-1">public.v_legal_vertical_coverage</code>, sommes des colonnes mesurées par section.
            </p>
          </Panel>

          <Panel title="Détail par catégorie">
            {list.length === 0 ? (
              <NoData what="ces filtres" />
            ) : (
              <Table head={['Catégorie', 'Section', 'Obligations', 'Bloquantes', 'Spécifiques', 'Transversales', 'Poids']}>
                {list.map((r) => (
                  <tr key={`${r.section_slug}-${r.category_slug}`} className="hover:bg-[#effafa]/60">
                    <Td>
                      <div className="font-medium text-foreground">{r.category_name ?? r.category_slug ?? <NonMesure />}</div>
                      <div className="text-xs text-slate-700">{r.category_slug ?? ''}</div>
                    </Td>
                    <Td>
                      <Pill tone="teal">{r.section_name ?? r.section_slug ?? '—'}</Pill>
                    </Td>
                    <Td className="font-semibold">{fmtNum(r.requirements_total)}</Td>
                    <Td className={Number(r.blocking ?? 0) > 0 ? 'font-semibold text-amber-900' : ''}>{fmtNum(r.blocking)}</Td>
                    <Td>{fmtNum(r.specific_to_category)}</Td>
                    <Td>{fmtNum(r.transversal)}</Td>
                    <Td className="min-w-[110px]">
                      <Bar value={Number(r.requirements_total ?? 0)} max={maxTotal} tone={TEAL_DEEP} />
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
