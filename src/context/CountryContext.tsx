/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCountryByCode } from '@/layouts/CountryDrilldown/countries';

/** Country contract shared by every Sowcea module (sessionStorage key + JSON shape). */
export interface Country {
  code: string;
  name: string;
  currency: string;
  flagEmoji: string;
  region: string;
  unlocked: boolean;
}

interface CountryContextType {
  currentCountry: Country | null;
  setCurrentCountry: (country: Country) => void;
  clearCountry: () => void;
  /** countries visible to this user (allowed codes applied), unlocked first */
  availableCountries: Country[];
  allowedCodes: string[] | 'all';
  isGlobal: boolean;
  loading: boolean;
  error: string | null;
  /** last time the door list was (re)loaded — changes on every Governance update (realtime) */
  syncedAt: Date | null;
}

const STORAGE_KEY = 'selectedCountry';
/** The DOOR contract view (public.v_geo_country_door): one rule, read by every module. */
export const DOOR_VIEW = 'v_geo_country_door';

const CountryContext = createContext<CountryContextType | undefined>(undefined);

// Loosely-typed accessor: geo/profile columns are not all in generated types.
const sb = supabase as any;

const iso2ToFlag = (code: string) =>
  code.length === 2
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🏳️';

function normalize(row: any): Country {
  const code = String(row.code ?? row.iso_code_2 ?? '');
  const fallback = getCountryByCode(code);
  return {
    code,
    name: String(row.name ?? row.name_en ?? fallback?.name ?? code),
    currency: String(row.currency ?? fallback?.currency ?? 'EUR'),
    flagEmoji: row.flag_emoji ?? fallback?.flag ?? iso2ToFlag(code),
    region: String(row.region && row.region !== '—' ? row.region : fallback?.region ?? '—'),
    unlocked: row.unlocked === true,
  };
}

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [rows, setRows] = useState<Country[] | null>(null);
  const [allowedCodes, setAllowedCodes] = useState<string[] | 'all'>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);

  const [currentCountry, setCurrentCountryState] = useState<Country | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.code) return { ...parsed, flagEmoji: parsed.flagEmoji ?? iso2ToFlag(parsed.code), unlocked: true };
      }
    } catch { /* ignore malformed */ }
    return null;
  });

  const clearCountry = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setCurrentCountryState(null);
  }, []);

  // Track the session. Sign-out drops the country of this tab. A sign-in does NOT clear it: a human
  // arriving from the login form has no country in this tab anyway (door shows), while the validation
  // runner seeds sessionStorage.selectedCountry before signing in through the same form (contract).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUid(session?.user?.id ?? null);
      if (event === 'SIGNED_OUT') clearCountry();
    });
    return () => sub.subscription.unsubscribe();
  }, [clearCountry]);

  const load = useCallback(async () => {
    if (uid === undefined) return; // session not resolved yet
    if (!uid) {
      setRows([]);
      setAllowedCodes([]);
      setIsGlobal(false);
      setLoading(false);
      return;
    }
    const [countries, profile] = await Promise.all([
      sb.from(DOOR_VIEW).select('code,name,currency,flag_emoji,region,unlocked,global_display_order').order('global_display_order'),
      sb.from('profiles').select('is_global,country,managed_countries').eq('id', uid).maybeSingle(),
    ]);
    setError(countries.error ? countries.error.message : null);
    setRows(countries.error ? [] : (countries.data ?? []).map(normalize));
    const p = profile?.data as any;
    const global = p?.is_global === true;
    setIsGlobal(global);
    setAllowedCodes(
      global
        ? 'all'
        : Array.from(new Set([p?.country, ...((p?.managed_countries as string[] | null) ?? [])].filter((c): c is string => Boolean(c)))),
    );
    setSyncedAt(new Date());
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (uid === undefined) return;
    setLoading(true);
    load();
  }, [uid, load]);

  // Total sync with the Geo Hub: any Governance change in geo_countries (unlock/lock/visibility)
  // reloads the door in every open tab, without a refresh.
  useEffect(() => {
    if (!uid) return;
    const ch = sb
      .channel('geo-country-door')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'geo_countries' }, () => load())
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [uid, load]);

  // If the country in session got locked again by Governance, drop it (the door decides).
  useEffect(() => {
    if (!currentCountry || !rows || rows.length === 0) return;
    const row = rows.find((c) => c.code === currentCountry.code);
    if (row && !row.unlocked) clearCountry();
  }, [rows, currentCountry, clearCountry]);

  const availableCountries = useMemo(() => {
    const list = rows ?? [];
    const filtered = allowedCodes === 'all' ? list : list.filter((c) => allowedCodes.includes(c.code));
    // unlocked first, DB order preserved inside each group
    return [...filtered].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  }, [rows, allowedCodes]);

  const setCurrentCountry = useCallback((country: Country) => {
    const payload = { code: country.code, name: country.name, currency: country.currency, flagEmoji: country.flagEmoji, region: country.region };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
    setCurrentCountryState({ ...payload, unlocked: true });
  }, []);

  return (
    <CountryContext.Provider value={{
      currentCountry,
      setCurrentCountry,
      clearCountry,
      availableCountries,
      allowedCodes,
      isGlobal,
      loading,
      error,
      syncedAt,
    }}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) throw new Error('useCountry must be used within CountryProvider');
  return context;
};
