/**
 * legalHubNav — SOURCE OF TRUTH of the Legal Hub menu.
 * The validation manifest is regenerated from the menu, so every entry here must have
 * exactly one page, and every page must read real measured views (never hand-written rows).
 */
export const MODULE_SLUG = 'legal-hub';
export const MODULE_TITLE = 'Legal Hub';
export const ROOT = '/cpanel/legal-hub';
export const ACCENT = '#00b6b4';
export const ACCENT_DEEP = '#007a79'; // text-safe teal (AA on white)
export const ACCENT_TEXT = '#006e6c'; // pills / small text
export const ACCENT_SOFT = '#effafa'; // Sowcea background accent

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  /** path relative to ROOT ('' = index) */
  path: string;
  /** the measured views this page reads — kept next to the menu so the manifest stays honest */
  views: string[];
  description: string;
}

export const NAV: NavItem[] = [
  {
    id: 'overview',
    label: "Vue d'ensemble",
    icon: '⚖️',
    path: '',
    views: ['v_legal_overview', 'v_legal_source_freshness'],
    description: "Tous les compteurs mesurés du module et l'état du synchroniseur.",
  },
  {
    id: 'obligations',
    label: 'Obligations',
    icon: '📜',
    path: 'obligations',
    views: ['v_legal_requirements'],
    description: 'Le catalogue des obligations réglementaires, avec sa source et son état de revue.',
  },
  {
    id: 'countries',
    label: 'Couverture par pays',
    icon: '🗺️',
    path: 'pays',
    views: ['v_legal_country_matrix'],
    description: 'Ce que chaque juridiction porte : total, confirmées, bloquantes, revues en retard.',
  },
  {
    id: 'verticals',
    label: 'Couverture par verticale',
    icon: '🧩',
    path: 'verticales',
    views: ['v_legal_vertical_coverage'],
    description: 'Les obligations rattachées à chaque section et catégorie du catalogue de services.',
  },
  {
    id: 'privacy',
    label: 'Confidentialité',
    icon: '🔐',
    path: 'confidentialite',
    views: ['v_processing_register'],
    description: 'Le registre des traitements (RGPD art. 30), transferts hors UE en évidence.',
  },
  {
    id: 'restrictions',
    label: 'Restrictions de contenu',
    icon: '🚫',
    path: 'restrictions',
    views: ['v_legal_content_restrictions', 'v_legal_restrictions_due_review'],
    description: 'Ce qui est interdit ou encadré par pays et par sujet, avec les termes détectés.',
  },
  {
    id: 'pages',
    label: 'Pages légales',
    icon: '📄',
    path: 'pages',
    views: ['legal_pages', 'v_geo_country_legal_coverage'],
    description: 'Les pages publiées, leur version, et la couverture linguistique par pays.',
  },
  {
    id: 'sources',
    label: 'Sources',
    icon: '📡',
    path: 'sources',
    views: ['v_legal_source_freshness'],
    description: "D'où viennent les obligations et depuis combien de temps la source n'a pas bougé.",
  },
];

export const navHref = (item: NavItem) => (item.path ? `${ROOT}/${item.path}` : ROOT);
