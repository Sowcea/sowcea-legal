import { useCountry } from '@/context/CountryContext';
import { GATE_TAB_KEY } from '@/layouts/CountryDrilldown/CountryDrilldownGate';

export function CountryHeaderChip() {
  const { currentCountry, clearCountry } = useCountry();
  if (!currentCountry) return null;

  const back = (tab: 'global' | 'choose') => {
    sessionStorage.setItem(GATE_TAB_KEY, tab);
    clearCountry();
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => back('choose')}
        className="flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent/70"
        title="Trocar de país"
      >
        <span>{currentCountry.flagEmoji}</span>
        <span>{currentCountry.code}</span>
      </button>
      <button
        onClick={() => back('global')}
        className="hidden rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:text-foreground sm:block"
      >
        Vue globale
      </button>
    </div>
  );
}
