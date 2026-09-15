import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Lock, ChevronDown } from 'lucide-react';
import { SowceaBell } from '@/components/SowceaBell';
import { GlobalOverviewTab } from './GlobalOverviewTab';
import type { CountryDrilldownConfig } from './types';
import type { Country } from '@/context/CountryContext';

interface Props {
  config: CountryDrilldownConfig;
  countries: Country[];
  isGlobal: boolean;
  allowedLabel: string;
  defaultTab?: 'global' | 'choose';
  onSelect: (countryCode: string) => void;
}

const COUNTRY_MAPS: Record<string, string> = {
  FR: 'https://staticmap.openstreetmap.de/staticmap.php?center=48.8566,2.3522&zoom=5&size=600x400&maptype=mapnik',
  PT: 'https://staticmap.openstreetmap.de/staticmap.php?center=39.3999,-8.2245&zoom=5&size=600x400&maptype=mapnik',
  DE: 'https://staticmap.openstreetmap.de/staticmap.php?center=51.1657,10.4515&zoom=5&size=600x400&maptype=mapnik',
  BE: 'https://staticmap.openstreetmap.de/staticmap.php?center=50.5039,4.4699&zoom=6&size=600x400&maptype=mapnik',
  NL: 'https://staticmap.openstreetmap.de/staticmap.php?center=52.3676,4.9041&zoom=6&size=600x400&maptype=mapnik',
  ES: 'https://staticmap.openstreetmap.de/staticmap.php?center=40.4168,-3.7038&zoom=5&size=600x400&maptype=mapnik',
  IT: 'https://staticmap.openstreetmap.de/staticmap.php?center=41.8719,12.5674&zoom=5&size=600x400&maptype=mapnik',
  CA: 'https://staticmap.openstreetmap.de/staticmap.php?center=56.1304,-106.3468&zoom=3&size=600x400&maptype=mapnik',
  BR: 'https://staticmap.openstreetmap.de/staticmap.php?center=-14.2350,-51.9253&zoom=3&size=600x400&maptype=mapnik',
  PL: 'https://staticmap.openstreetmap.de/staticmap.php?center=51.9194,19.1451&zoom=5&size=600x400&maptype=mapnik',
  CH: 'https://staticmap.openstreetmap.de/staticmap.php?center=46.8182,8.2275&zoom=6&size=600x400&maptype=mapnik',
  AT: 'https://staticmap.openstreetmap.de/staticmap.php?center=47.5162,14.5501&zoom=6&size=600x400&maptype=mapnik',
  LU: 'https://staticmap.openstreetmap.de/staticmap.php?center=49.8153,6.1296&zoom=8&size=600x400&maptype=mapnik',
  IE: 'https://staticmap.openstreetmap.de/staticmap.php?center=53.4129,-8.2439&zoom=6&size=600x400&maptype=mapnik',
};
const DEFAULT_MAP = 'https://staticmap.openstreetmap.de/staticmap.php?center=48.0,10.0&zoom=4&size=600x400&maptype=mapnik';
const getMapImage = (code: string) => COUNTRY_MAPS[code] ?? DEFAULT_MAP;

interface CardProps { country: Country; isActive: boolean; onClick: () => void; onSelect: () => void; accentColor: string; }

function CountryCard({ country, isActive, onClick, onSelect, accentColor }: CardProps) {
  const locked = !country.unlocked;
  return (
    <div
      onClick={!isActive ? onClick : undefined}
      className={`rounded-2xl overflow-hidden bg-white transition-all duration-500 cursor-pointer flex-shrink-0 ${isActive ? 'w-80 z-10 scale-100 opacity-100 shadow-[0_20px_40px_rgba(0,0,0,0.12)]' : 'w-64 scale-90 opacity-90 shadow-lg hover:opacity-100'}`}
      style={isActive ? { borderTop: `4px solid ${locked ? '#dc2626' : accentColor}` } : {}}
    >
      <div
        className={`relative bg-cover bg-center bg-gray-100 ${isActive ? 'h-48' : 'h-36'}`}
        style={{ backgroundImage: `url(${getMapImage(country.code)})`, filter: locked ? 'grayscale(1)' : 'none' }}
      >
        {locked && <div className='absolute inset-0 bg-white/60' />}
        {isActive && !locked && <div className='absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent' />}
        <span
          className='absolute right-3 top-3 rounded-full px-2 py-1 text-[11px] font-bold shadow-sm'
          style={locked
            ? { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }
            : { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}
        >
          {locked ? '🔒 Bientôt' : '🔓 Actif'}
        </span>
      </div>
      {isActive ? (
        <div className='px-8 pb-8 pt-2 text-center relative'>
          <div className='w-14 h-14 mx-auto bg-white rounded-full flex items-center justify-center text-3xl shadow-md -mt-7 mb-3 border border-gray-100'>{country.flagEmoji}</div>
          <h3 className='text-2xl font-bold mb-1 text-gray-800'>{country.name}</h3>
          <p className='text-xs text-gray-600 mb-5 font-medium tracking-wide uppercase'>{country.region}</p>
          {locked ? (
            <p className='text-xs font-medium text-gray-600'>Activation en attente de la Governance</p>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className='w-full py-3 px-6 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95' style={{ background: accentColor, boxShadow: `0 4px 14px ${accentColor}55` }}>
              Select Country <ChevronRight size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className='p-5 text-center border-t border-gray-100'>
          <div className='text-3xl mb-1'>{country.flagEmoji}</div>
          <h3 className='font-bold text-base text-gray-700'>{country.name}</h3>
          <p className='text-xs text-gray-600 mt-0.5'>{country.region}</p>
        </div>
      )}
    </div>
  );
}

export function CountrySelectionPage({ config, countries, isGlobal, allowedLabel, defaultTab = 'choose', onSelect }: Props) {
  const [tab, setTab] = useState<'global' | 'choose'>(defaultTab);
  const [activeIndex, setActiveIndex] = useState(0);
  const accentColor = config.accentColor || '#007a79';
  const prev = useCallback(() => setActiveIndex(i => (i - 1 + countries.length) % countries.length), [countries.length]);
  const next = useCallback(() => setActiveIndex(i => (i + 1) % countries.length), [countries.length]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  const leftIndex = (activeIndex - 1 + countries.length) % countries.length;
  const rightIndex = (activeIndex + 1) % countries.length;

  return (
    <div className='min-h-screen flex flex-col' style={{ background: '#effafa', fontFamily: 'Manrope, sans-serif' }}>
      <header className='bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-50 px-8 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='rounded-xl p-2 text-white flex items-center justify-center text-xl' style={{ background: accentColor, boxShadow: `0 0 15px ${accentColor}66` }}>{config.icon}</div>
          <div><h1 className='text-lg font-bold tracking-tight text-gray-800'>Sowcea</h1><p className='text-xs text-gray-600 font-medium'>{config.title}</p></div>
        </div>
        <div className='flex items-center gap-3'>
          <span className='px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5' style={{ background: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}33` }}>
            {isGlobal ? '🛡️ Global Admin' : `🌍 ${allowedLabel}`}
          </span>
          <SowceaBell moduleSlug={config.moduleId} />
          <div className='relative cursor-pointer'><div className='w-9 h-9 rounded-full border-2 border-white shadow' style={{ background: `linear-gradient(135deg, ${accentColor}, #2c3e50)` }} /><div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white' /></div>
          <ChevronDown size={14} className='text-gray-600' />
        </div>
      </header>

      <div className='flex justify-center gap-2 pt-6'>
        {([['choose', 'Choisir un pays'], ['global', 'Vue globale']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className='rounded-full px-5 py-2 text-sm font-semibold transition-all border'
            style={tab === key
              ? { background: accentColor, color: '#fff', borderColor: accentColor, boxShadow: `0 4px 14px ${accentColor}44` }
              : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}
          >
            {label}
          </button>
        ))}
      </div>

      <main className='flex-1 flex flex-col overflow-hidden relative'>
        <div className='absolute inset-0 pointer-events-none' style={{ background: `radial-gradient(ellipse at 50% 40%, ${accentColor}0d 0%, transparent 65%)` }} />

        {tab === 'global' ? (
          <div className='z-10 relative flex-1 overflow-y-auto pt-8'>
            {config.globalDashboard
              ? <GlobalOverviewTab config={config.globalDashboard} accentColor={accentColor} />
              : <p className='text-center text-sm text-gray-600'>Sem dados ainda</p>}
          </div>
        ) : (
          <>
            <p className='text-center text-sm text-gray-600 font-medium mt-8 mb-2 z-10 relative'>{config.subtitle}</p>
            {countries.length === 0 ? (
              <p className='text-center text-sm text-gray-600 mt-10 z-10 relative'>Sem país atribuído — pede acesso ao administrador global.</p>
            ) : (
              <>
                <div className='flex-1 flex items-center justify-center relative px-8 z-10'>
                  <button onClick={prev} className='absolute left-10 w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-md z-20 hover:shadow-lg' style={{ color: accentColor }} aria-label='Previous'><ChevronLeft size={24} /></button>
                  <div className='flex items-center justify-center gap-4 max-w-5xl w-full'>
                    <CountryCard country={countries[leftIndex]}   isActive={false} onClick={() => setActiveIndex(leftIndex)}   onSelect={() => {}} accentColor={accentColor} />
                    <CountryCard country={countries[activeIndex]} isActive={true}  onClick={() => {}}                          onSelect={() => onSelect(countries[activeIndex].code)} accentColor={accentColor} />
                    <CountryCard country={countries[rightIndex]}  isActive={false} onClick={() => setActiveIndex(rightIndex)}  onSelect={() => {}} accentColor={accentColor} />
                  </div>
                  <button onClick={next} className='absolute right-10 w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-md z-20 hover:shadow-lg' style={{ color: accentColor }} aria-label='Next'><ChevronRight size={24} /></button>
                </div>
                <div className='pb-8 pt-4 flex flex-col items-center gap-2 z-10 relative'>
                  <div className='flex items-center gap-1.5'>{countries.map((c, i) => (<button key={i} onClick={() => setActiveIndex(i)} aria-label={`${c.name}${i === activeIndex ? ' (selected)' : ''}`} aria-current={i === activeIndex ? 'true' : undefined} className='rounded-full transition-all duration-300' style={{ width: i === activeIndex ? '1.75rem' : '0.5rem', height: '0.5rem', background: i === activeIndex ? accentColor : '#e2e8f0', boxShadow: i === activeIndex ? `0 0 6px ${accentColor}99` : 'none' }} />))}</div>
                  <p className='text-xs font-medium text-gray-600'>{activeIndex + 1} / {countries.length}</p>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className='py-3 border-t border-gray-100 bg-white/50 backdrop-blur-sm z-10'>
        <div className='flex items-center justify-center gap-2 text-xs font-medium text-gray-600'><Lock size={12} />Managed by Triple-Triad Governance</div>
      </footer>
    </div>
  );
}
