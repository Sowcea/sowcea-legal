/**
 * Restrictions de contenu — v_legal_content_restrictions + v_legal_restrictions_due_review.
 * Ce que l'écosystème ne peut pas publier, vendre ou promouvoir, par pays et par sujet.
 */
import React, { useMemo, useState } from 'react';
import {
  useContentRestrictions,
  useRestrictionsDueReview,
  fmtDate,
  fmtNum,
  ago,
  label,
  RESTRICTS_LABELS,
  REVIEW_LABELS,
  SEVERITY_LABELS,
  reviewTone,
  severityTone,
} from '@/hooks/legal-hub/useLegalHub';
import {
  Chips,
  Country,
  ErrorBox,
  KpiTile,
  Loading,
  NoData,
  NonMesure,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Select,
  SourceLink,
  Table,
  Td,
} from '@/components/legalhub/ui';

export default function RestrictionsPage() {
  const q = useContentRestrictions();
  const due = useRestrictionsDueReview();
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const [country, setCountry] = useState('all');
  const [subject, setSubject] = useState('all');
  const [text, setText] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const countries = useMemo(() => Array.from(new Set(rows.map((r) => r.country_code ?? '').filter(Boolean))).sort(), [rows]);
  const subjects = useMemo(() => Array.from(new Set(rows.map((r) => r.subject ?? '').filter(Boolean))).sort(), [rows]);

  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (country === 'all' || r.country_code === country) &&
          (subject === 'all' || r.subject === subject) &&
          (!text || `${r.restriction_key} ${r.label ?? ''} ${r.authority ?? ''} ${r.legal_basis ?? ''}`.toLowerCase().includes(text.toLowerCase()))
      ),
    [rows, country, subject, text]
  );

  const confirmed = rows.filter((r) => r.review_status === 'confirmed').length;
  const overdue = rows.filter((r) => r.review_overdue).length;

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Restrictions de contenu"
        subtitle="Ce qui ne peut pas être publié, vendu ou promu, pays par pays. Les termes détectés servent aux filtres des autres modules ; la source officielle est donnée sur chaque ligne."
        right={
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Rechercher une restriction…" />
            <Select
              ariaLabel="Filtrer par pays"
              value={country}
              onChange={setCountry}
              options={[{ value: 'all', label: 'Tous les pays' }, ...countries.map((c) => ({ value: c, label: c }))]}
            />
            <Select
              ariaLabel="Filtrer par sujet"
              value={subject}
              onChange={setSubject}
              options={[{ value: 'all', label: 'Tous les sujets' }, ...subjects.map((s) => ({ value: s, label: s }))]}
            />
          </div>
        }
      />

      {rows.length === 0 ? (
        <NoData what="les restrictions de contenu" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Restrictions mesurées" value={fmtNum(rows.length)} />
            <KpiTile index={1} label="Confirmées" tone={confirmed === 0 ? 'warn' : 'good'} value={fmtNum(confirmed)} />
            <KpiTile index={2} label="Pays concernés" value={fmtNum(countries.length)} />
            <KpiTile index={3} label="Revues en retard" tone={overdue > 0 ? 'bad' : 'good'} value={fmtNum(overdue)} />
          </section>

          <Panel title="Restrictions">
            {list.length === 0 ? (
              <NoData what="ces filtres" />
            ) : (
              <Table head={['Restriction', 'Pays', 'Sujet', 'Porte sur', 'Sévérité', 'État de revue', 'Revue due', 'Source', '']}>
                {list.map((r) => (
                  <React.Fragment key={r.restriction_key + (r.country_code ?? '')}>
                    <tr
                      className="cursor-pointer hover:bg-[#effafa]/60"
                      onClick={() => setOpen(open === r.restriction_key ? null : r.restriction_key)}
                    >
                      <Td>
                        <div className="font-medium text-foreground">{r.label ?? r.restriction_key}</div>
                        <div className="font-mono text-xs text-slate-700">{r.restriction_key}</div>
                      </Td>
                      <Td>
                        <Country code={r.country_code} />
                      </Td>
                      <Td>{r.subject ?? <NonMesure />}</Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          {(r.restricts ?? []).length === 0 ? (
                            <NonMesure />
                          ) : (
                            (r.restricts ?? []).map((x) => (
                              <Pill key={x} tone="neutral">
                                {label(RESTRICTS_LABELS, x)}
                              </Pill>
                            ))
                          )}
                        </span>
                      </Td>
                      <Td>
                        <Pill tone={severityTone(r.severity)}>{label(SEVERITY_LABELS, r.severity)}</Pill>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <Pill tone={reviewTone(r.review_status)}>{label(REVIEW_LABELS, r.review_status)}</Pill>
                          {r.review_overdue && <Pill tone="bad">revue en retard</Pill>}
                          {r.is_active === false && <Pill tone="muted">inactive</Pill>}
                        </div>
                      </Td>
                      <Td>{fmtDate(r.review_due)}</Td>
                      <Td className="max-w-[200px]">
                        <SourceLink url={r.source_url} />
                      </Td>
                      <Td className="text-right text-xs text-[#006e6c]">{open === r.restriction_key ? 'réduire' : 'détail'}</Td>
                    </tr>

                    {open === r.restriction_key && (
                      <tr className="bg-[#effafa]/50">
                        <Td colSpan={9}>
                          <div className="grid gap-4 p-2 text-sm md:grid-cols-2">
                            <div>
                              <p className="font-medium text-foreground">Base légale</p>
                              <p className="mt-1 whitespace-pre-line text-slate-800">{r.legal_basis ?? <NonMesure />}</p>
                              {r.notes && (
                                <>
                                  <p className="mt-3 font-medium text-foreground">Notes de revue</p>
                                  <p className="mt-1 whitespace-pre-line text-slate-800">{r.notes}</p>
                                </>
                              )}
                              <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1 text-xs text-slate-800">
                                <dt className="text-slate-700">Autorité</dt>
                                <dd>{r.authority ?? <NonMesure />}</dd>
                                <dt className="text-slate-700">Revue par</dt>
                                <dd className="break-words">{r.reviewed_by ?? <NonMesure />}</dd>
                                <dt className="text-slate-700">Revue le</dt>
                                <dd>{fmtDate(r.reviewed_at)}</dd>
                              </dl>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Catégories exemptées</p>
                              <div className="mt-1">
                                <Chips items={r.exempt_categories} tone="teal" />
                              </div>
                              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Termes détectés par langue</p>
                              {!r.terms_by_language || Object.keys(r.terms_by_language).length === 0 ? (
                                <p className="mt-1">
                                  <NonMesure />
                                </p>
                              ) : (
                                <div className="mt-1 space-y-2">
                                  {Object.entries(r.terms_by_language).map(([lang, t]) => (
                                    <div key={lang} className="rounded-lg border border-slate-200 bg-white p-2">
                                      <p className="text-xs font-semibold text-[#006e6c]">
                                        {lang.toUpperCase()}
                                        {t?.kind ? <span className="ml-1 font-normal text-slate-700">· {String(t.kind)}</span> : null}
                                      </p>
                                      <div className="mt-1">
                                        <Chips items={t?.patterns ?? null} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="Revues à faire" right={<Pill tone={(due.data ?? []).length > 0 ? 'warn' : 'good'}>{fmtNum(due.data?.length ?? null)}</Pill>}>
            {due.isLoading ? (
              <Loading />
            ) : due.error ? (
              <ErrorBox error={due.error} />
            ) : (due.data ?? []).length === 0 ? (
              <NoData what="les revues à échéance" />
            ) : (
              <Table head={['Priorité', 'Restriction', 'Pays', 'État', 'Revue due', 'À vérifier', 'Source contrôlée', 'Maintenue par']}>
                {(due.data ?? []).map((d) => (
                  <tr key={d.id} className="hover:bg-[#effafa]/60">
                    <Td>
                      <Pill tone={Number(d.priority ?? 9) <= 1 ? 'bad' : Number(d.priority ?? 9) <= 2 ? 'warn' : 'muted'}>
                        {d.priority === null ? '—' : `P${d.priority}`}
                      </Pill>
                    </Td>
                    <Td>
                      <div className="font-medium text-foreground">{d.label ?? d.restriction_key}</div>
                      <div className="font-mono text-xs text-slate-700">{d.restriction_key}</div>
                    </Td>
                    <Td>
                      <Country code={d.country_code} />
                    </Td>
                    <Td>
                      <Pill tone={reviewTone(d.review_status)}>{label(REVIEW_LABELS, d.review_status)}</Pill>
                    </Td>
                    <Td>{fmtDate(d.review_due)}</Td>
                    <Td className="max-w-[260px]">{d.needs_attention ?? <NonMesure />}</Td>
                    <Td>{ago(d.source_checked_at)}</Td>
                    <Td>{d.maintained_by ?? <NonMesure />}</Td>
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
