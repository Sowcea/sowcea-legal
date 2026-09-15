export type GlobalAgg = 'sum' | 'count' | 'avg' | 'max';

export interface GlobalKpi {
  label: string;
  source: string;
  column: string;
  agg: GlobalAgg;
  /** optional equality filter, e.g. { is_active: true } */
  filter?: Record<string, unknown>;
  suffix?: string;
}

export interface GlobalByCountry {
  source: string;
  countryColumn: 'country_code' | 'country_codes';
  columns: { key: string; label: string; agg: GlobalAgg }[];
}

export interface GlobalDashboardConfig {
  kpis: GlobalKpi[];
  byCountry: GlobalByCountry;
}

export interface CountryDrilldownConfig {
  moduleId: string;
  title: string;
  subtitle: string;
  icon: string;
  accentColor?: string;
  /** route that hosts the module after the door (informative; the gate renders in place) */
  rootPath?: string;
  globalDashboard?: GlobalDashboardConfig;
}

export interface OperationalCountry {
  code: string;
  name: string;
  flag: string;
  region: string;
  currency: string;
  timezone: string;
}
