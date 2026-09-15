/**
 * HOW TO ADD A NEW MODULE WITH COUNTRY GATE:
 * 1. Create src/layouts/CountryDrilldown/configs/[module].config.ts
 * 2. Wrap your module root (after the login gate):
 *    <CountryDrilldownGate config={memoryHubConfig}>
 *      <MyModuleContent />
 *    </CountryDrilldownGate>
 * 3. Done.
 *
 * Contract (universal prerequisite): the door reads public.v_geo_country_door through CountryContext
 * (realtime on geo_countries), only unlocked countries can be selected, the choice lives in
 * sessionStorage.selectedCountry and the gate renders its children IN PLACE (no route change) —
 * every route that wraps itself in the gate keeps working after the choice.
 */
import { CountrySelectionPage } from './CountrySelectionPage';
import { useCountry } from '@/context/CountryContext';
import type { CountryDrilldownConfig } from './types';

interface Props {
  config: CountryDrilldownConfig;
  children: React.ReactNode;
}

export const GATE_TAB_KEY = 'countryGateTab';

export function CountryDrilldownGate({ config, children }: Props) {
  const { currentCountry, setCurrentCountry, availableCountries, allowedCodes, isGlobal, loading, error } = useCountry();

  if (currentCountry) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600" style={{ background: '#effafa' }}>
        Loading the country door…
      </div>
    );
  }

  // availableCountries already has the user's allowed codes applied (or all, for global admins).
  const allowedLabel = allowedCodes === 'all'
    ? 'Global'
    : (availableCountries.map((c) => c.code).join(' · ') || 'Sem país');

  const defaultTab = (sessionStorage.getItem(GATE_TAB_KEY) as 'global' | 'choose') || 'choose';

  return (
    <>
      {error && (
        <div role="alert" className="w-full px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-200">
          Country door unavailable: {error}
        </div>
      )}
      <CountrySelectionPage
        config={config}
        countries={availableCountries}
        isGlobal={isGlobal}
        allowedLabel={allowedLabel}
        defaultTab={defaultTab}
        onSelect={(code) => {
          const found = availableCountries.find((c) => c.code === code);
          if (found && found.unlocked) {
            setCurrentCountry(found);
            sessionStorage.removeItem(GATE_TAB_KEY);
          }
        }}
      />
    </>
  );
}
