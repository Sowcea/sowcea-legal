/**
 * Pages légales — public.legal_pages (ce qui est écrit et publié) +
 * v_geo_country_legal_coverage (ce qui manque, pays par pays).
 */
import { useMemo, useState } from 'react';
import { useLegalPages, useCountryLegalCoverage, fmtDate, fmtNum, ago } from '@/hooks/legal-hub/useLegalHub';
import { Chips, Country, ErrorBox, KpiTile, Loading, NoData, NonMesure, PageHeader, Panel, Pill, SearchInput, Select, Table, Td } from '@/components/legalhub/ui';

const statusTone = (s: string | null): 'good' | 'warn' | 'muted' =>
  s === 'published' ? 'good' : s === 'draft' || s === 'review' ? 'warn' : 'muted';

const STATUS_LABELS: Record<string, string> = {
  published: 'Publiée',
  draft: 'Brouillon',
  review: 'En revue',
  archived: 'Archivée',
};

export default function PagesPage() {
  const pages = useLegalPages();
  const coverage = useCountryLegalCoverage();

  const rows = useMemo(() => pages.data ?? [], [pages.data]);
  const [lang, setLang] = useState('all');
  const [status, setStatus] = useState('all');
  const [text, setText] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(true);

  const langs = useMemo(() => Array.from(new Set(rows.map((r) => r.language ?? '').filter(Boolean))).sort(), [rows]);
  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status ?? '').filter(Boolean))).sort(), [rows]);

  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (lang === 'all' || r.language === lang) &&
          (status === 'all' || r.status === status) &&
          (!text || `${r.slug} ${r.title ?? ''} ${r.country_code ?? ''}`.toLowerCase().includes(text.toLowerCase()))
      ),
    [rows, lang, status, text]
  );

  const published = rows.filter((r) => r.status === 'published').length;
  const cov = useMemo(() => coverage.data ?? [], [coverage.data]);
  const covList = useMemo(
    () => (onlyGaps ? cov.filter((c) => (c.missing ?? []).length > 0 || (c.legal_not_localized ?? []).length > 0 || (c.fallback_generic ?? []).length > 0) : cov),
    [cov, onlyGaps]
  );
  const countriesFullyCovered = cov.filter((c) => (c.missing ?? []).length === 0 && (c.legal_not_localized ?? []).length === 0).length;

  if (pages.isLoading) return <Loading />;
  if (pages.error) return <ErrorBox error={pages.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pages légales"
        subtitle="Les textes publiés (CGV, mentions légales, confidentialité…) et, en dessous, ce qui manque encore pays par pays : localisé, repli générique, ou absent."
        right={
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Rechercher une page…" />
            <Select
              ariaLabel="Filtrer par langue"
              value={lang}
              onChange={setLang}
              options={[{ value: 'all', label: 'Toutes les langues' }, ...langs.map((l) => ({ value: l, label: l.toUpperCase() }))]}
            />
            <Select
              ariaLabel="Filtrer par statut"
              value={status}
              onChange={setStatus}
              options={[{ value: 'all', label: 'Tous les statuts' }, ...statuses.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))]}
            />
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile index={0} label="Pages enregistrées" value={fmtNum(rows.length)} hint="public.legal_pages" />
        <KpiTile index={1} label="Publiées" tone={published === 0 ? 'warn' : 'good'} value={fmtNum(published)} />
        <KpiTile index={2} label="Langues" value={fmtNum(langs.length)} />
        <KpiTile
          index={3}
          label="Pays entièrement couverts"
          tone={cov.length > 0 && countriesFullyCovered === 0 ? 'warn' : 'default'}
          value={coverage.isLoading ? '…' : fmtNum(countriesFullyCovered)}
          hint={cov.length > 0 ? `sur ${fmtNum(cov.length)} pays mesurés` : undefined}
        />
      </section>

      <Panel title="Pages enregistrées">
        {rows.length === 0 ? (
          <NoData what="les pages légales" />
        ) : list.length === 0 ? (
          <NoData what="ces filtres" />
        ) : (
          <Table head={['Page', 'Langue', 'Pays', 'Statut', 'Version', 'En vigueur le', 'Mise à jour']}>
            {list.map((p) => (
              <tr key={p.id} className="hover:bg-[#effafa]/60">
                <Td>
                  <div className="font-medium text-foreground">{p.title ?? p.slug}</div>
                  <div className="font-mono text-xs text-slate-700">{p.slug}</div>
                </Td>
                <Td>
                  <Pill tone="teal">{(p.language ?? '—').toUpperCase()}</Pill>
                </Td>
                <Td>{p.country_code ? <Country code={p.country_code} /> : <Pill tone="muted">générique</Pill>}</Td>
                <Td>
                  <Pill tone={statusTone(p.status)}>{p.status ? STATUS_LABELS[p.status] ?? p.status : '—'}</Pill>
                </Td>
                <Td className="font-mono text-xs">{p.version ?? '—'}</Td>
                <Td>{fmtDate(p.effective_at)}</Td>
                <Td>{ago(p.updated_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      <Panel
        title="Couverture par pays"
        right={
          <label className="flex items-center gap-2 text-xs text-slate-800">
            <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} className="h-4 w-4 accent-[#007a79]" />
            N'afficher que les pays incomplets
          </label>
        }
      >
        {coverage.isLoading ? (
          <Loading />
        ) : coverage.error ? (
          <ErrorBox error={coverage.error} />
        ) : cov.length === 0 ? (
          <NoData what="la couverture légale par pays" />
        ) : covList.length === 0 ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
            Aucun pays incomplet parmi les {fmtNum(cov.length)} pays mesurés.
          </div>
        ) : (
          <Table head={['Pays', 'Langue par défaut', 'Localisées', 'Repli générique', 'Manquantes', 'Non localisées', 'Obligations', 'Documents', 'Dernière localisation']}>
            {covList.map((c) => (
              <tr key={c.country_code} className="hover:bg-[#effafa]/60">
                <Td className="font-medium">
                  <Country code={c.country_code} />
                  {c.unlocked === false && (
                    <div className="mt-0.5">
                      <Pill tone="muted">pays verrouillé</Pill>
                    </div>
                  )}
                </Td>
                <Td>{c.default_language ? c.default_language.toUpperCase() : <NonMesure />}</Td>
                <Td>
                  <Chips items={c.localized} tone="teal" />
                </Td>
                <Td>
                  <Chips items={c.fallback_generic} />
                </Td>
                <Td>
                  {(c.missing ?? []).length === 0 ? (
                    <Pill tone="good">aucune</Pill>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {(c.missing ?? []).map((m) => (
                        <Pill key={m} tone="bad">
                          {m}
                        </Pill>
                      ))}
                    </span>
                  )}
                </Td>
                <Td>
                  {(c.legal_not_localized ?? []).length === 0 ? (
                    <Pill tone="good">aucune</Pill>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {(c.legal_not_localized ?? []).map((m) => (
                        <Pill key={m} tone="warn">
                          {m}
                        </Pill>
                      ))}
                    </span>
                  )}
                </Td>
                <Td>{fmtNum(c.regulatory_requirements)}</Td>
                <Td>{fmtNum(c.compliance_documents)}</Td>
                <Td>{ago(c.last_localized_update)}</Td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-slate-700">
          Source : <code className="rounded bg-slate-100 px-1">public.v_geo_country_legal_coverage</code>. « Repli générique » signifie qu'une
          page générale existe mais qu'aucune version propre au pays n'a été écrite.
        </p>
      </Panel>
    </div>
  );
}
