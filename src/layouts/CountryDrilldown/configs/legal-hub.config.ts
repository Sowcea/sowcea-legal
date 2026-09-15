import type { CountryDrilldownConfig } from '../types';

// Legal Hub — la conformité de l'écosystème, mesurée. La porte de pays est le pré-requis universel ;
// les lignes par pays viennent de v_legal_country_matrix (une ligne par juridiction mesurée).
export const legalHubConfig: CountryDrilldownConfig = {
  moduleId: 'legal-hub',
  title: 'Legal Hub',
  subtitle: "Sélectionnez votre pays opérationnel pour lire les obligations, les restrictions et les pages légales qui s'y appliquent",
  icon: '⚖️',
  accentColor: '#007a79', // teal foncé — texte blanc lisible (5.4:1), même axe que l'accent #00b6b4
  rootPath: '/cpanel/legal-hub',
  globalDashboard: {
    kpis: [
      { label: 'Obligations actives', source: 'v_legal_overview', column: 'requirements_active', agg: 'max' },
      { label: 'Confirmées', source: 'v_legal_overview', column: 'requirements_confirmed', agg: 'max' },
      { label: 'En brouillon', source: 'v_legal_overview', column: 'requirements_draft', agg: 'max' },
      { label: 'Juridictions', source: 'v_legal_overview', column: 'jurisdictions', agg: 'max' },
      { label: 'Restrictions de contenu', source: 'v_legal_overview', column: 'content_restrictions', agg: 'max' },
    ],
    byCountry: {
      source: 'v_legal_country_matrix',
      countryColumn: 'country_code',
      columns: [
        { key: 'requirements_total', label: 'Obligations', agg: 'sum' },
        { key: 'confirmed', label: 'Confirmées', agg: 'sum' },
        { key: 'blocking', label: 'Bloquantes', agg: 'sum' },
        { key: 'overdue', label: 'Revue en retard', agg: 'sum' },
      ],
    },
  },
};
