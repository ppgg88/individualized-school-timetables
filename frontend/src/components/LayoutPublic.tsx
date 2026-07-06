import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { format } from 'date-fns';
import { useWeek } from '../hooks/useWeek';
import type { Role } from '../context/RoleContext';

const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  admin: { label: 'Administrateur', color: 'bg-blue-600 text-gray-50' },
  eleve: { label: 'Élève', color: 'bg-emerald-600 text-gray-50' },
  prof: { label: 'Formateur', color: 'bg-violet-600 text-gray-50' },
  'vie-scolaire': { label: 'Vie scolaire', color: 'bg-orange-600 text-gray-50' },
};

interface LayoutPublicProps {
  role: Role;
  title: string;
  showWeekNav?: boolean;
}

export function LayoutPublic({ role, title, showWeekNav = true }: LayoutPublicProps) {
  const { week, weekStart, weekEnd, nextWeek, prevWeek, canGoNext } = useWeek({ maxCurrentWeek: role === 'eleve' });
  const roleInfo = ROLE_LABELS[role];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-3 py-3 sm:px-4">
          {/* Logo + titre */}
          <div className="flex items-center gap-4">
            <img src="/roville-logo.png" alt="École de ROVILLE" className="h-14 w-auto flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">ROVILLE</p>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">EDT Individualisation</h1>
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              <p className="mt-1 text-sm font-medium text-slate-700">{title}</p>
            </div>
          </div>

          {/* Sélecteur de semaine */}
          {showWeekNav && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
              <button
                className="rounded-xl p-1.5 text-slate-600 transition hover:bg-white sm:p-2"
                onClick={prevWeek}
                aria-label="Semaine précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 px-1 sm:px-2">
                <div className="rounded-xl bg-white px-2.5 py-1 text-sm shadow-sm sm:px-3 sm:py-2">
                  <div className="font-semibold leading-tight text-slate-900">Semaine {week}</div>
                  <div className="hidden text-xs text-slate-500 sm:block">
                    {format(weekStart, 'dd/MM')} – {format(weekEnd, 'dd/MM/yyyy')}
                  </div>
                </div>
                <CalendarRange className="hidden h-5 w-5 text-blue-500 sm:block" />
              </div>
              <button
                className="rounded-xl p-1.5 text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:p-2"
                onClick={nextWeek}
                disabled={!canGoNext}
                aria-label="Semaine suivante"
                title={canGoNext ? undefined : "Vous ne pouvez pas consulter les semaines futures"}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col px-3 py-4 sm:px-4 lg:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 px-3 py-3 text-center sm:px-4">
        <a
          href="/mentions-legales"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
        >
          Mentions légales & protection des données (RGPD)
        </a>
      </footer>
    </div>
  );
}
