/**
 * Confidentialité — v_processing_register : le registre des traitements (RGPD art. 30).
 * C'est le document qui protège Sowcea en cas de contrôle : il est présenté en entier,
 * avec les transferts hors UE mis en évidence.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useProcessingRegister, fmtDate, fmtNum, ago } from '@/hooks/legal-hub/useLegalHub';
import { Chips, ErrorBox, KpiTile, Loading, NoData, NonMesure, PageHeader, Panel, Pill, SearchInput, Table, Td } from '@/components/legalhub/ui';

export default function PrivacyPage() {
  const q = useProcessingRegister();
  const rows = useMemo(() => q.data ?? [], [q.data]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () =>
      rows.filter(
        (r) => !text || `${r.ref} ${r.name ?? ''} ${r.purpose ?? ''} ${r.legal_basis ?? ''} ${r.source_of_truth ?? ''}`.toLowerCase().includes(text.toLowerCase())
      ),
    [rows, text]
  );

  const withTransfers = useMemo(() => rows.filter((r) => r.has_transfers_outside_eu), [rows]);
  const lastReview = useMemo(
    () => rows.map((r) => r.reviewed_at).filter(Boolean).sort().slice(-1)[0] ?? null,
    [rows]
  );

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Confidentialité"
        subtitle="Le registre des activités de traitement exigé par l'article 30 du RGPD. Chaque traitement dit sa finalité, sa base légale, ses destinataires, sa durée de conservation et ses transferts hors UE."
        right={<SearchInput value={text} onChange={setText} placeholder="Rechercher un traitement…" />}
      />

      {rows.length === 0 ? (
        <NoData what="le registre des traitements" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile index={0} label="Traitements inscrits" value={fmtNum(rows.length)} hint="v_processing_register" />
            <KpiTile
              index={1}
              label="Avec transferts hors UE"
              tone={withTransfers.length > 0 ? 'warn' : 'good'}
              value={fmtNum(withTransfers.length)}
              hint="chaque transfert doit porter une garantie"
            />
            <KpiTile index={2} label="Sans transfert hors UE" value={fmtNum(rows.length - withTransfers.length)} />
            <KpiTile index={3} label="Dernière revue" value={<span className="text-xl">{ago(lastReview)}</span>} hint={fmtDate(lastReview)} />
          </section>

          {withTransfers.length > 0 && (
            <Panel title="Transferts hors Union européenne" className="border-amber-300">
              <p className="mb-3 text-sm text-slate-800">
                {fmtNum(withTransfers.length)} traitement(s) envoient des données hors de l'UE. Chaque ligne indique le destinataire et la
                garantie invoquée, telle qu'elle est inscrite au registre.
              </p>
              <Table head={['Traitement', 'Destinataire', 'Données', 'Garantie', 'Voie']}>
                {withTransfers.flatMap((r) =>
                  (r.transfers_outside_eu ?? []).map((t, i) => (
                    <tr key={`${r.ref}-${i}`} className="hover:bg-amber-50">
                      <Td className="font-medium">
                        {r.ref} · {r.name ?? ''}
                      </Td>
                      <Td>
                        <Pill tone="warn">{String(t.destinataire ?? t.recipient ?? 'destinataire non précisé')}</Pill>
                      </Td>
                      <Td>{String(t.dados ?? t.data ?? '—')}</Td>
                      <Td className="max-w-[320px]">{String(t.garantia ?? t.safeguard ?? '—')}</Td>
                      <Td>{t.via ? String(t.via) : '—'}</Td>
                    </tr>
                  ))
                )}
              </Table>
            </Panel>
          )}

          <div className="space-y-3">
            {list.length === 0 ? (
              <NoData what="cette recherche" />
            ) : (
              list.map((r, i) => (
                <motion.article
                  key={r.ref}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03 }}
                  className="rounded-2xl border border-[#d0f0f0] bg-white p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(open === r.ref ? null : r.ref)}
                    className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        <span className="mr-2 rounded bg-[#effafa] px-1.5 py-0.5 font-mono text-xs text-[#006e6c]">{r.ref}</span>
                        {r.name ?? <NonMesure />}
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm text-slate-800">{r.purpose ?? <NonMesure />}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {r.has_transfers_outside_eu ? <Pill tone="warn">transferts hors UE</Pill> : <Pill tone="good">reste dans l'UE</Pill>}
                      <span className="text-xs text-slate-700">revu {ago(r.reviewed_at)}</span>
                      <span className="text-xs text-[#006e6c]">{open === r.ref ? 'réduire' : 'tout afficher'}</span>
                    </div>
                  </button>

                  {open === r.ref && (
                    <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 text-sm md:grid-cols-2">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Base légale</p>
                          <p className="mt-1 text-slate-800">{r.legal_basis ?? <NonMesure />}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Personnes concernées</p>
                          <div className="mt-1">
                            <Chips items={r.data_subjects} tone="teal" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Catégories de données</p>
                          <div className="mt-1">
                            <Chips items={r.data_categories} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Destinataires</p>
                          <div className="mt-1">
                            <Chips items={r.recipients} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Durée de conservation</p>
                          <p className="mt-1 whitespace-pre-line text-slate-800">{r.retention ?? <NonMesure />}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Mesures de sécurité</p>
                          <div className="mt-1">
                            <Chips items={r.security_measures} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Source de vérité</p>
                          <p className="mt-1 break-all font-mono text-xs text-slate-800">{r.source_of_truth ?? '—'}</p>
                        </div>
                        {r.has_transfers_outside_eu && (r.transfers_outside_eu ?? []).length > 0 && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Transferts hors UE</p>
                            <ul className="mt-2 space-y-2 text-xs text-slate-800">
                              {(r.transfers_outside_eu ?? []).map((t, k) => (
                                <li key={k}>
                                  <span className="font-semibold">{String(t.destinataire ?? t.recipient ?? 'destinataire non précisé')}</span>
                                  {t.dados ? <> — {String(t.dados)}</> : null}
                                  {t.garantia ? <div className="text-slate-700">Garantie : {String(t.garantia)}</div> : null}
                                  {t.via ? <div className="text-slate-700">Voie : {String(t.via)}</div> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.article>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
