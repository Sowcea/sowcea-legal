/**
 * useLegalHub — every read of the Legal Hub, one hook per measured view.
 * All views live in `public` but are NOT in the generated `Database` types (Lovable regenerates
 * types.ts, so we never edit it by hand) — they go through the loosely-typed accessor `db`.
 *
 * Rule: nothing here invents a value. A view that returns no rows returns [] and the page says so.
 */
import { useQuery } from '@tanstack/react-query';
import { db } from '@/integrations/supabase/db';

const STALE = 60_000;

/* ------------------------------------------------------------------ types */

export interface LegalOverview {
  requirements_active: number | null;
  requirements_confirmed: number | null;
  requirements_draft: number | null;
  requirements_overdue: number | null;
  jurisdictions: number | null;
  content_restrictions: number | null;
  restrictions_confirmed: number | null;
  processing_activities: number | null;
  legal_pages_published: number | null;
  sources_bound: number | null;
  sources_stale: number | null;
  sources_failing: number | null;
  cases_total: number | null;
  last_measurement: string | null;
  sync_last_seen: string | null;
  sync_status: string | null;
}

export interface LegalRequirement {
  requirement_key: string;
  jurisdiction: string | null;
  regime: string | null;
  category: string | null;
  title: string | null;
  obligation: string | null;
  audience: string | null;
  legal_basis: string | null;
  authority: string | null;
  source_url: string | null;
  source_name: string | null;
  severity: string | null;
  review_status: string | null;
  review_due: string | null;
  effective_from: string | null;
  penalties: string | null;
  applies_to_sections: string[] | null;
  applies_to_categories: string[] | null;
  source_checked_at: string | null;
  source_changed_at: string | null;
  source_moved_since_review: boolean | null;
  review_overdue: boolean | null;
  is_mandatory: boolean | null;
  implementation_status: string | null;
  updated_at: string | null;
}

export interface LegalCountryRow {
  country_code: string | null;
  country_name: string | null;
  eu_member: boolean | null;
  requirements_total: number | null;
  confirmed: number | null;
  draft: number | null;
  blocking: number | null;
  overdue: number | null;
  national: number | null;
  from_eu: number | null;
  last_source_check: string | null;
}

export interface LegalVerticalRow {
  category_slug: string | null;
  category_name: string | null;
  section_slug: string | null;
  section_name: string | null;
  requirements_total: number | null;
  blocking: number | null;
  specific_to_category: number | null;
  transversal: number | null;
}

export interface TransferOutsideEu {
  destinataire?: string;
  dados?: string;
  garantia?: string;
  via?: string;
  [k: string]: unknown;
}

export interface ProcessingActivity {
  ref: string;
  name: string | null;
  purpose: string | null;
  legal_basis: string | null;
  data_subjects: string[] | null;
  data_categories: string[] | null;
  recipients: string[] | null;
  has_transfers_outside_eu: boolean | null;
  transfers_outside_eu: TransferOutsideEu[] | null;
  retention: string | null;
  security_measures: string[] | null;
  source_of_truth: string | null;
  reviewed_at: string | null;
}

export interface RestrictionTerms {
  kind?: string;
  patterns?: string[];
  [k: string]: unknown;
}

export interface ContentRestriction {
  restriction_key: string;
  country_code: string | null;
  subject: string | null;
  label: string | null;
  restricts: string[] | null;
  authority: string | null;
  legal_basis: string | null;
  source_url: string | null;
  severity: string | null;
  review_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_due: string | null;
  is_active: boolean | null;
  notes: string | null;
  terms_by_language: Record<string, RestrictionTerms> | null;
  exempt_categories: string[] | null;
  review_overdue: boolean | null;
}

export interface RestrictionDueReview {
  id: string;
  restriction_key: string;
  country_code: string | null;
  subject: string | null;
  label: string | null;
  review_status: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_due: string | null;
  source_url: string | null;
  source_checked_at: string | null;
  source_changed_at: string | null;
  maintained_by: string | null;
  last_sync_note: string | null;
  needs_attention: string | null;
  priority: number | null;
}

export interface LegalPage {
  id: string;
  slug: string;
  language: string | null;
  country_code: string | null;
  title: string | null;
  status: string | null;
  version: string | null;
  effective_at: string | null;
  updated_at: string | null;
}

export interface CountryLegalCoverage {
  country_code: string;
  unlocked: boolean | null;
  default_language: string | null;
  localized: string[] | null;
  fallback_generic: string[] | null;
  missing: string[] | null;
  legal_not_localized: string[] | null;
  covered: boolean | null;
  legal_localized: boolean | null;
  regulatory_requirements: number | null;
  compliance_documents: number | null;
  last_localized_update: string | null;
}

export interface SourceFreshness {
  source_name: string;
  topic: string | null;
  country_codes: string[] | null;
  poll_hours: number | null;
  is_enabled: boolean | null;
  last_fetch: string | null;
  http_status: number | null;
  item_count: number | null;
  changed: boolean | null;
  error: string | null;
  hours_since: number | null;
  stale: boolean | null;
  requirements_bound: number | null;
}

/* ------------------------------------------------------------------ reads */

/**
 * Collects a prepared query. The relation name is written as a LITERAL at every
 * call site, so the ecosystem's real-data guard can verify
 * statically that every read targets a real measured view — a variable name
 * would silently defeat it.
 */
async function collect<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, label: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${label} : ${error.message}`);
  return ((data ?? []) as T[]);
}

export function useLegalOverview() {
  return useQuery<LegalOverview | null>({
    queryKey: ['legal', 'overview'],
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await db.from('v_legal_overview').select('*').maybeSingle();
      if (error) throw new Error(`v_legal_overview : ${error.message}`);
      return (data ?? null) as LegalOverview | null;
    },
  });
}

export function useLegalRequirements() {
  return useQuery<LegalRequirement[]>({
    queryKey: ['legal', 'requirements'],
    staleTime: STALE,
    queryFn: () =>
      collect<LegalRequirement>(db.from('v_legal_requirements').select('requirement_key,jurisdiction,regime,category,title,obligation,audience,legal_basis,authority,source_url,source_name,severity,review_status,review_due,effective_from,penalties,applies_to_sections,applies_to_categories,source_checked_at,source_changed_at,source_moved_since_review,review_overdue,is_mandatory,implementation_status,updated_at').order('jurisdiction', { ascending: true, nullsFirst: false }), 'v_legal_requirements'),
  });
}

export function useLegalCountryMatrix() {
  return useQuery<LegalCountryRow[]>({
    queryKey: ['legal', 'country-matrix'],
    staleTime: STALE,
    queryFn: () =>
      collect<LegalCountryRow>(db.from('v_legal_country_matrix').select('country_code,country_name,eu_member,requirements_total,confirmed,draft,blocking,overdue,national,from_eu,last_source_check').order('requirements_total', { ascending: false, nullsFirst: false }), 'v_legal_country_matrix'),
  });
}

export function useLegalVerticalCoverage() {
  return useQuery<LegalVerticalRow[]>({
    queryKey: ['legal', 'vertical-coverage'],
    staleTime: STALE,
    queryFn: () =>
      collect<LegalVerticalRow>(db.from('v_legal_vertical_coverage').select('category_slug,category_name,section_slug,section_name,requirements_total,blocking,specific_to_category,transversal').order('requirements_total', { ascending: false, nullsFirst: false }), 'v_legal_vertical_coverage'),
  });
}

export function useProcessingRegister() {
  return useQuery<ProcessingActivity[]>({
    queryKey: ['legal', 'processing-register'],
    staleTime: STALE,
    queryFn: () =>
      collect<ProcessingActivity>(db.from('v_processing_register').select('ref,name,purpose,legal_basis,data_subjects,data_categories,recipients,has_transfers_outside_eu,transfers_outside_eu,retention,security_measures,source_of_truth,reviewed_at').order('ref', { ascending: true, nullsFirst: false }), 'v_processing_register'),
  });
}

export function useContentRestrictions() {
  return useQuery<ContentRestriction[]>({
    queryKey: ['legal', 'content-restrictions'],
    staleTime: STALE,
    queryFn: () =>
      collect<ContentRestriction>(db.from('v_legal_content_restrictions').select('restriction_key,country_code,subject,label,restricts,authority,legal_basis,source_url,severity,review_status,reviewed_by,reviewed_at,review_due,is_active,notes,terms_by_language,exempt_categories,review_overdue').order('country_code', { ascending: true, nullsFirst: false }), 'v_legal_content_restrictions'),
  });
}

export function useRestrictionsDueReview() {
  return useQuery<RestrictionDueReview[]>({
    queryKey: ['legal', 'restrictions-due-review'],
    staleTime: STALE,
    queryFn: () =>
      collect<RestrictionDueReview>(db.from('v_legal_restrictions_due_review').select('id,restriction_key,country_code,subject,label,review_status,reviewed_by,reviewed_at,review_due,source_url,source_checked_at,source_changed_at,maintained_by,last_sync_note,needs_attention,priority').order('priority', { ascending: true, nullsFirst: false }), 'v_legal_restrictions_due_review'),
  });
}

export function useLegalPages() {
  return useQuery<LegalPage[]>({
    queryKey: ['legal', 'pages'],
    staleTime: STALE,
    queryFn: () =>
      collect<LegalPage>(
        db.from('legal_pages')
          .select('id,slug,language,country_code,title,status,version,effective_at,updated_at')
          .order('slug', { ascending: true, nullsFirst: false }),
        'legal_pages'
      ),
  });
}

export function useCountryLegalCoverage() {
  return useQuery<CountryLegalCoverage[]>({
    queryKey: ['legal', 'country-legal-coverage'],
    staleTime: STALE,
    queryFn: () =>
      collect<CountryLegalCoverage>(db.from('v_geo_country_legal_coverage').select('country_code,unlocked,default_language,localized,fallback_generic,missing,legal_not_localized,covered,legal_localized,regulatory_requirements,compliance_documents,last_localized_update').order('country_code', { ascending: true, nullsFirst: false }), 'v_geo_country_legal_coverage'),
  });
}

export function useSourceFreshness() {
  return useQuery<SourceFreshness[]>({
    queryKey: ['legal', 'source-freshness'],
    staleTime: STALE,
    queryFn: () =>
      collect<SourceFreshness>(db.from('v_legal_source_freshness').select('source_name,topic,country_codes,poll_hours,is_enabled,last_fetch,http_status,item_count,changed,error,hours_since,stale,requirements_bound').order('hours_since', { ascending: false, nullsFirst: false }), 'v_legal_source_freshness'),
  });
}

/* ------------------------------------------------------------- formatting */

/** A measured number, or `null` when nothing was measured — never a stand-in value. */
export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v));
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Relative age in French. Returns 'jamais' when the timestamp is null (measured absence). */
export function ago(v: string | null | undefined): string {
  if (!v) return 'jamais';
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return 'jamais';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 31) return `il y a ${d} j`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `il y a ${mo} mois`;
  return `il y a ${Math.floor(mo / 12)} an(s)`;
}

/* ------------------------------------------------------------ vocabulary */
// Labels are display-only translations of the values the views actually return.
// An unknown value is shown raw — we never map it onto an invented category.

export const SEVERITY_LABELS: Record<string, string> = {
  block: 'Bloquante',
  blocking: 'Bloquante',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
  restrict: 'Encadrée',
  info: 'Information',
};

export const REVIEW_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  confirmed: 'Confirmée',
  review: 'À revoir',
  pending: 'En attente',
  rejected: 'Rejetée',
};

export const REGIME_LABELS: Record<string, string> = {
  eu: 'Union européenne',
  national: 'National',
  local: 'Local',
  international: 'International',
};

export const RESTRICTS_LABELS: Record<string, string> = {
  advertising: 'Publicité',
  selling: 'Vente',
  promotion: 'Promotion',
  content: 'Contenu',
  targeting: 'Ciblage',
};

export const severityTone = (s: string | null): 'bad' | 'warn' | 'teal' | 'muted' =>
  s === 'block' || s === 'blocking' || s === 'high' ? 'bad' : s === 'medium' || s === 'restrict' ? 'warn' : s ? 'teal' : 'muted';

export const reviewTone = (s: string | null): 'good' | 'warn' | 'muted' =>
  s === 'confirmed' ? 'good' : s === 'draft' || s === 'review' || s === 'pending' ? 'warn' : 'muted';

export const label = (map: Record<string, string>, v: string | null | undefined): string =>
  v ? map[v] ?? v : '—';
