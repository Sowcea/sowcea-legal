/**
 * LegalHubShell — le cadre du module : en-tête (chip pays + sino universel), menu (source de vérité
 * legalHubNav) avec le Validation Mode en bas, contenu, et le dock de l'agent du module.
 * Pré-requis universels A·B·C·E.
 */
import { NavLink, Outlet } from 'react-router-dom';
import { CountryHeaderChip } from '@/components/CountryHeaderChip';
import { SowceaBell } from '@/components/SowceaBell';
import { ValidationModeToggle } from '@/components/validation/ValidationModeToggle';
import { AgentChatDock } from '@/components/AgentChatDock';
import { cn } from '@/lib/utils';
import { ACCENT_DEEP, ACCENT_SOFT, MODULE_SLUG, MODULE_TITLE, NAV, navHref } from '@/layouts/legalHubNav';

export { MODULE_SLUG, ROOT } from '@/layouts/legalHubNav';

export function LegalHubShell() {
  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2 text-[13px]"
        style={{ background: ACCENT_SOFT, borderColor: '#d0f0f0' }}
      >
        <div className="flex items-center gap-2 font-semibold" style={{ color: ACCENT_DEEP }}>
          <span aria-hidden>⚖️</span>
          <span>{MODULE_TITLE}</span>
          <span className="font-normal text-slate-700">· la conformité, mesurée</span>
        </div>
        <div className="flex items-center gap-3">
          <CountryHeaderChip />
          <SowceaBell moduleSlug={MODULE_SLUG} />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-60 shrink-0 border-r border-[#effafa] md:flex md:flex-col" aria-label="Navigation du module">
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-0.5">
              {NAV.map((m) => (
                <NavLink
                  key={m.id}
                  to={navHref(m)}
                  end={m.path === ''}
                  title={m.description}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isActive ? 'bg-[#effafa] font-semibold text-[#006e6c]' : 'text-slate-700 hover:bg-[#effafa]/60'
                    )
                  }
                >
                  <span aria-hidden>{m.icon}</span>
                  <span>{m.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
          {/* Pré-requis C : Validation Mode — éteint par défaut, seul Marino l'allume */}
          <ValidationModeToggle />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
          <nav className="mb-4 flex gap-1 overflow-x-auto md:hidden" aria-label="Navigation mobile">
            {NAV.map((m) => (
              <NavLink
                key={m.id}
                to={navHref(m)}
                end={m.path === ''}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-full border px-3 py-1 text-xs',
                    isActive ? 'border-[#a8e6e5] bg-[#effafa] text-[#006e6c]' : 'border-slate-200 text-slate-700'
                  )
                }
              >
                {m.icon} {m.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>

      <AgentChatDock moduleSlug={MODULE_SLUG} accent={ACCENT_DEEP} />
    </div>
  );
}
