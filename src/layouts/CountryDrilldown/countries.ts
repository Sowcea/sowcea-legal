import type { OperationalCountry } from './types';

export const OPERATIONAL_COUNTRIES: OperationalCountry[] = [
  { code: 'FR', name: 'France',       flag: '🇫🇷', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'PT', name: 'Portugal',     flag: '🇵🇹', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Lisbon' },
  { code: 'DE', name: 'Germany',      flag: '🇩🇪', region: 'Central Europe',  currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'BE', name: 'Belgium',      flag: '🇧🇪', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Brussels' },
  { code: 'NL', name: 'Netherlands',  flag: '🇳🇱', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'ES', name: 'Spain',        flag: '🇪🇸', region: 'Southern Europe', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'IT', name: 'Italy',        flag: '🇮🇹', region: 'Southern Europe', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'CA', name: 'Canada',       flag: '🇨🇦', region: 'North America',   currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'BR', name: 'Brazil',       flag: '🇧🇷', region: 'South America',   currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'PL', name: 'Poland',       flag: '🇵🇱', region: 'Central Europe',  currency: 'PLN', timezone: 'Europe/Warsaw' },
  { code: 'CH', name: 'Switzerland',  flag: '🇨🇭', region: 'Central Europe',  currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'AT', name: 'Austria',      flag: '🇦🇹', region: 'Central Europe',  currency: 'EUR', timezone: 'Europe/Vienna' },
  { code: 'LU', name: 'Luxembourg',   flag: '🇱🇺', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Luxembourg' },
  { code: 'IE', name: 'Ireland',      flag: '🇮🇪', region: 'Western Europe',  currency: 'EUR', timezone: 'Europe/Dublin' },
];

export const getCountryByCode = (code: string): OperationalCountry | undefined =>
  OPERATIONAL_COUNTRIES.find(c => c.code === code);
