import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const PageHeader = ({ title, subtitle, right }: { title: string; subtitle?: React.ReactNode; right?: React.ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-700">{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Panel = ({ title, children, className, right }: { title?: React.ReactNode; children: React.ReactNode; className?: string; right?: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className={cn('rounded-2xl border border-[#d0f0f0] bg-white p-4 shadow-sm', className)}
  >
    {(title || right) && (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-[#006e6c]">{title}</h2>}
        {right}
      </div>
    )}
    {children}
  </motion.section>
);

export const KpiTile = ({
  label,
  value,
  hint,
  tone = 'default',
  index = 0,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  index?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03, ease: 'easeOut' }}
    className={cn(
      'rounded-2xl border bg-white p-4 shadow-sm',
      tone === 'good' ? 'border-emerald-200' : tone === 'warn' ? 'border-amber-300' : tone === 'bad' ? 'border-red-300' : 'border-[#d0f0f0]'
    )}
  >
    <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-700">{label}</p>
    {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
  </motion.div>
);

export const Pill = ({ children, tone = 'neutral', title }: { children: React.ReactNode; tone?: 'neutral' | 'teal' | 'good' | 'warn' | 'bad' | 'muted'; title?: string }) => (
  <span
    title={title}
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
      tone === 'teal' && 'border-[#a8e6e5] bg-[#effafa] text-[#006e6c]',
      tone === 'good' && 'border-emerald-300 bg-emerald-50 text-emerald-800',
      tone === 'warn' && 'border-amber-300 bg-amber-50 text-amber-900',
      tone === 'bad' && 'border-red-300 bg-red-50 text-red-800',
      tone === 'muted' && 'border-slate-300 bg-slate-50 text-slate-700',
      tone === 'neutral' && 'border-slate-300 bg-white text-slate-800'
    )}
  >
    {children}
  </span>
);

/** Une vue vide n'est pas une erreur : on le dit, on n'invente rien. */
export const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-700">{children}</div>
);

export const NoData = ({ what }: { what?: string }) => (
  <EmptyState>
    Aucune donnée mesurée{what ? ` pour ${what}` : ''}. Rien n'est inventé ici : la vue ne renvoie aucune ligne.
  </EmptyState>
);

export const Loading = () => <div className="p-8 text-center text-sm text-slate-700">Chargement…</div>;

/**
 * Une vue absente de la base n'est pas la même chose qu'une vue vide : on le dit explicitement,
 * pour qu'un environnement où la migration n'est pas encore passée ne passe pas pour « zéro donnée ».
 */
const isMissingRelation = (msg: string) =>
  /PGRST205|Could not find the table|does not exist|schema cache/i.test(msg);

export const ErrorBox = ({ error }: { error: unknown }) => {
  const msg = String((error as Error)?.message ?? error);
  if (isMissingRelation(msg)) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Cette vue n'existe pas dans la base actuellement connectée.</strong> Rien n'est affiché à la place : ce n'est pas un zéro
        mesuré, c'est une mesure impossible. Détail technique : {msg}
      </div>
    );
  }
  return <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">Lecture impossible : {msg}</div>;
};

export const Table = ({ head, children, className }: { head: React.ReactNode[]; children: React.ReactNode; className?: string }) => (
  <div className={cn('overflow-x-auto rounded-xl border border-slate-200', className)}>
    <table className="w-full text-sm">
      <thead className="bg-[#effafa] text-left text-[11px] uppercase tracking-wide text-[#006e6c]">
        <tr>
          {head.map((h, i) => (
            <th key={i} scope="col" className="px-3 py-2 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">{children}</tbody>
    </table>
  </div>
);

export const Td = ({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) => (
  <td colSpan={colSpan} className={cn('px-3 py-2 align-top text-slate-800', className)}>
    {children}
  </td>
);

export const Btn = ({
  children,
  onClick,
  disabled,
  tone = 'primary',
  small,
  title,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
  small?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) => (
  <button
    type={type}
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'inline-flex items-center justify-center gap-1 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
      tone === 'primary' && 'bg-[#007a79] text-white hover:bg-[#00615f]',
      tone === 'ghost' && 'border border-[#a8e6e5] bg-white text-[#006e6c] hover:bg-[#effafa]',
      tone === 'danger' && 'border border-red-300 bg-white text-red-800 hover:bg-red-50'
    )}
  >
    {children}
  </button>
);

export const Select = ({
  value,
  onChange,
  options,
  small,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  small?: boolean;
  ariaLabel?: string;
}) => (
  <select
    aria-label={ariaLabel}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      'rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007a79]',
      small ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
    )}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input
    type="search"
    aria-label={placeholder ?? 'Rechercher'}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder ?? 'Rechercher…'}
    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#007a79]"
  />
);

export const Bar = ({ value, max = 100, tone = '#00b6b4' }: { value: number | null; max?: number; tone?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden>
    <motion.div
      className="h-full rounded-full"
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, ((value ?? 0) / (max || 1)) * 100))}%` }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ background: tone }}
    />
  </div>
);

/** Ni zéro ni vide : la mesure n'existe pas. */
export const NonMesure = () => <span className="italic text-slate-600">Non mesuré</span>;
export const NonClasse = () => <span className="italic text-slate-600">Non classé</span>;

export const SourceLink = ({ url, label }: { url: string | null | undefined; label?: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noreferrer" className="break-all font-medium text-[#006e6c] underline underline-offset-2 hover:text-[#00514f]">
      {label ?? 'Source officielle ↗'}
    </a>
  ) : (
    <span className="italic text-slate-600">Sans source publiée</span>
  );

export const Chips = ({ items, tone = 'muted' }: { items: string[] | null | undefined; tone?: 'muted' | 'teal' }) => {
  if (!items || items.length === 0) return <NonMesure />;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((it) => (
        <Pill key={it} tone={tone}>
          {it}
        </Pill>
      ))}
    </span>
  );
};

export const FLAGS: Record<string, string> = {
  FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹', PT: '🇵🇹', NL: '🇳🇱', BE: '🇧🇪', LU: '🇱🇺', IE: '🇮🇪',
  AT: '🇦🇹', PL: '🇵🇱', SE: '🇸🇪', DK: '🇩🇰', FI: '🇫🇮', GR: '🇬🇷', CZ: '🇨🇿', RO: '🇷🇴', HU: '🇭🇺',
  BG: '🇧🇬', HR: '🇭🇷', SK: '🇸🇰', SI: '🇸🇮', LT: '🇱🇹', LV: '🇱🇻', EE: '🇪🇪', CY: '🇨🇾', MT: '🇲🇹',
  GB: '🇬🇧', CH: '🇨🇭', NO: '🇳🇴', US: '🇺🇸', CA: '🇨🇦', BR: '🇧🇷', MX: '🇲🇽', AU: '🇦🇺', JP: '🇯🇵',
  EU: '🇪🇺',
};

export const Country = ({ code, name }: { code: string | null; name?: string | null }) =>
  code ? (
    <span className="whitespace-nowrap">
      {FLAGS[code] ?? '🏳️'} {name ?? code}
    </span>
  ) : (
    <NonClasse />
  );
