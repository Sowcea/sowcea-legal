/**
 * Obligations — v_legal_requirements. Le catalogue tel qu'il est mesuré.
 * L'état de revue (brouillon / confirmée) est mis en évidence sur chaque ligne : une obligation
 * non confirmée ne doit jamais passer pour une règle arrêtée.
 */
import React, { useMemo, useState } from 'react';
import {
  useLegalRequirements,
  fmtDate,
  fmtNum,
  ago,
  label,
  REGIME_LABELS,
  REVIEW_LABELS,
  SEVERITY_LABELS,
  reviewTone,
  severityTone,
  type LegalRequirement,
} from '@/hooks/legal-hub/useLegalHub';
import {
  Chips,
  ErrorBox,
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

const uniq = (rows: LegalRequirement[], key: keyof LegalRequirement) =>
  Array.from(new Set(rows.map((r) => (r[key] as string | null) ?? '').filter(Boolean))).sort();

export default function ObligationsPage() {
  const q = useLegalRequirements();
  const rows = useMemo(() => q.data ?? [], [q.data]);

  const [jurisdiction, setJurisdiction] = useState('all');
  const [regime, setRegime] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [review, setReview] = useState('all');
  const [text, setText] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (jurisdiction === 'all' || r.jurisdiction === jurisdiction) &&
          (regime === 'all' || r.regime === regime) &&
          (severity === 'all' || r.severity === severity) &&
          (review === 'all' || r.review_status === review) &&
          (!text ||
            `${r.requirement_key} ${r.title ?? ''} ${r.obligation ?? ''} ${r.authority ?? ''} ${r.legal_basis ?? ''} ${r.category ?? ''}`
              .toLowerCase()
              .includes(text.toLowerCase()))
      ),
    [rows, jurisdiction, regime, severity, review, text]
  );

  const confirmed = list.filter((r) => r.review_status === 'confirmed').length;
  const drafts = list.filter((r) => r.review_status === 'draft').length;

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Obligations"
        subtitle="Le catalogue des obligations réglementaires mesurées, chacune avec son autorité, sa base légale et sa source officielle. L'état de revue est affiché sur chaque ligne."
        right={
          <div className="flex flex-wrap gap-2">
            <SearchInput value={text} onChange={setText} placeholder="Rechercher une obligation…" />
            <Select
              ariaLabel="Filtrer par juridiction"
              value={jurisdiction}
              onChange={setJurisdiction}
              options={[{ value: 'all', label: 'Toutes les juridictions' }, ...uniq(rows, 'jurisdiction').map((v) => ({ value: v, label: v }))]}
            />
            <Select
              ariaLabel="Filtrer par régime"
              value={regime}
              onChange={setRegime}
              options={[{ value: 'all', label: 'Tous les régimes' }, ...uniq(rows, 'regime').map((v) => ({ value: v, label: label(REGIME_LABELS, v) }))]}
            />
            <Select
              ariaLabel="Filtrer par sévérité"
              value={severity}
              onChange={setSeverity}
              options={[{ value: 'all', label: 'Toutes les sévérités' }, ...uniq(rows, 'severity').map((v) => ({ value: v, label: label(SEVERITY_LABELS, v) }))]}
            />
            <Select
              ariaLabel="Filtrer par état de revue"
              value={review}
              onChange={setReview}
              options={[{ value: 'all', label: 'Tous les états' }, ...uniq(rows, 'review_status').map((v) => ({ value: v, label: label(REVIEW_LABELS, v) }))]}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
        <Pill tone="teal">{fmtNum(list.length)} obligation(s) affichée(s)</Pill>
        <Pill tone={confirmed === 0 ? 'warn' : 'good'}>{fmtNum(confirmed)} confirmée(s)</Pill>
        <Pill tone={drafts > 0 ? 'warn' : 'muted'}>{fmtNum(drafts)} en brouillon</Pill>
        {confirmed === 0 && list.length > 0 && (
          <span className="text-xs text-amber-900">Aucune obligation encore confirmée dans cette sélection — à lire comme un travail en cours.</span>
        )}
      </div>

      {rows.length === 0 ? (
        <NoData what="le catalogue d'obligations" />
      ) : list.length === 0 ? (
        <NoData what="ces filtres" />
      ) : (
        <Panel>
          <Table head={['Obligation', 'Juridiction', 'Régime', 'Sévérité', 'État de revue', 'Revue due', 'Source', '']}>
            {list.map((r) => (
              <React.Fragment key={r.requirement_key}>
                <tr className="cursor-pointer hover:bg-[#effafa]/60" onClick={() => setOpen(open === r.requirement_key ? null : r.requirement_key)}>
                  <Td>
                    <div className="font-medium text-foreground">{r.title ?? r.requirement_key}</div>
                    <div className="text-xs text-slate-700">
                      {r.requirement_key}
                      {r.category ? ` · ${r.category}` : ''}
                      {r.audience ? ` · ${r.audience}` : ''}
                    </div>
                  </Td>
                  <Td>{r.jurisdiction ?? <NonMesure />}</Td>
                  <Td>
                    <Pill tone="neutral">{label(REGIME_LABELS, r.regime)}</Pill>
                  </Td>
                  <Td>
                    <Pill tone={severityTone(r.severity)}>{label(SEVERITY_LABELS, r.severity)}</Pill>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Pill tone={reviewTone(r.review_status)}>{label(REVIEW_LABELS, r.review_status)}</Pill>
                      {r.review_overdue && <Pill tone="bad">revue en retard</Pill>}
                      {r.source_moved_since_review && <Pill tone="warn">la source a bougé</Pill>}
                    </div>
                  </Td>
                  <Td>{fmtDate(r.review_due)}</Td>
                  <Td className="max-w-[220px]">
                    <SourceLink url={r.source_url} label={r.source_name ?? 'Source officielle ↗'} />
                    <div className="mt-0.5 text-xs text-slate-700">contrôlée {ago(r.source_checked_at)}</div>
                  </Td>
                  <Td className="text-right text-xs text-[#006e6c]">{open === r.requirement_key ? 'réduire' : 'détail'}</Td>
                </tr>

                {open === r.requirement_key && (
                  <tr className="bg-[#effafa]/50">
                    <Td colSpan={8}>
                      <div className="grid gap-4 p-2 text-sm md:grid-cols-2">
                        <div>
                          <p className="font-medium text-foreground">Obligation</p>
                          <p className="mt-1 whitespace-pre-line text-slate-800">{r.obligation ?? <NonMesure />}</p>
                          <p className="mt-3 font-medium text-foreground">Base légale</p>
                          <p className="mt-1 whitespace-pre-line text-slate-800">{r.legal_basis ?? <NonMesure />}</p>
                          {r.penalties && (
                            <>
                              <p className="mt-3 font-medium text-foreground">Sanctions</p>
                              <p className="mt-1 whitespace-pre-line text-red-800">{r.penalties}</p>
                            </>
                          )}
                        </div>
                        <div>
                          <dl className="grid grid-cols-[150px_1fr] gap-y-1 text-xs text-slate-800">
                            <dt className="text-slate-700">Autorité</dt>
                            <dd>{r.authority ?? <NonMesure />}</dd>
                            <dt className="text-slate-700">Source</dt>
                            <dd>
                              <SourceLink url={r.source_url} label={r.source_url ?? undefined} />
                            </dd>
                            <dt className="text-slate-700">En vigueur depuis</dt>
                            <dd>{fmtDate(r.effective_from)}</dd>
                            <dt className="text-slate-700">Obligatoire</dt>
                            <dd>{r.is_mandatory === null ? <NonMesure /> : r.is_mandatory ? 'oui' : 'non'}</dd>
                            <dt className="text-slate-700">Mise en œuvre</dt>
                            <dd>{r.implementation_status ?? <NonMesure />}</dd>
                            <dt className="text-slate-700">Source contrôlée</dt>
                            <dd>{ago(r.source_checked_at)}</dd>
                            <dt className="text-slate-700">Source modifiée</dt>
                            <dd>{ago(r.source_changed_at)}</dd>
                            <dt className="text-slate-700">Dernière mise à jour</dt>
                            <dd>{ago(r.updated_at)}</dd>
                          </dl>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-700">Sections concernées</p>
                          <div className="mt-1">
                            <Chips items={r.applies_to_sections} tone="teal" />
                          </div>
                          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-700">Catégories concernées</p>
                          <div className="mt-1">
                            <Chips items={r.applies_to_categories} />
                          </div>
                        </div>
                      </div>
                    </Td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </Table>
        </Panel>
      )}
    </div>
  );
}
