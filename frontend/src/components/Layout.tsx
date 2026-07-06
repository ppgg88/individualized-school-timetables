import { BookUser, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ClipboardList, GraduationCap, History, LayoutDashboard, Menu, Printer, PlusSquare, Settings, UploadCloud, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useWeek } from '../hooks/useWeek';

const navigation = [
  { section: 'Tableau de bord' },
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },

  { section: 'Emplois du temps' },
  { to: '/edt/general', label: 'EDT Général', icon: CalendarDays },
  { to: '/edt/eleve',   label: 'EDT par élève',      icon: GraduationCap },
  { to: '/edt/prof',    label: 'EDT par formateur',   icon: Users },

  { section: 'Suivi' },
  { to: '/suivi', label: 'Suivi hebdomadaire', icon: ClipboardList },
  { to: '/suivi/historique', label: 'Historique de suivi', icon: History },

  { section: 'Gestion' },
  { to: '/eleves',  label: 'Élèves',       icon: BookUser },
  { to: '/profs',   label: 'Formateurs',   icon: Users },

  { section: 'Outils' },
  { to: '/rdv/nouveau',  label: 'Nouveau RDV',     icon: PlusSquare },
  { to: '/imprimer',     label: 'Impression',       icon: Printer },
  { to: '/import-export', label: 'Import / Export', icon: UploadCloud },
  { to: '/parametres',   label: 'Paramètres',       icon: Settings },
];

const titleMap: Array<[RegExp, string]> = [
  [/^\/$/, 'Tableau de bord'],
  [/^\/edt\/general/, 'EDT général'],
  [/^\/edt\/eleve/, 'EDT élève'],
  [/^\/edt\/prof/, 'EDT professeur'],
  [/^\/rdv\/nouveau/, 'Nouveau rendez-vous'],
  [/^\/suivi\/historique/, 'Historique de suivi'],
  [/^\/suivi/, 'Suivi hebdomadaire'],
  [/^\/imprimer/, 'Impression'],
  [/^\/eleves/, 'Gestion des élèves'],
  [/^\/profs/, 'Gestion des professeurs'],
  [/^\/import-export/, 'Import / Export'],
  [/^\/parametres/, 'Paramètres'],
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { week, year, weekStart, weekEnd, nextWeek, prevWeek } = useWeek();

  const pageTitle = useMemo(
    () => titleMap.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'EDT Individualisation',
    [location.pathname],
  );
  const showWeekSelector =
    location.pathname === '/' ||
    location.pathname.startsWith('/edt') ||
    location.pathname.startsWith('/import-export') ||
    location.pathname.startsWith('/rdv') ||
    location.pathname === '/suivi';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[280px_1fr]">
      {open ? <button className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <aside id="app-sidebar" className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-soft transition-transform lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/roville-logo.png" alt="École de ROVILLE" className="h-14 w-auto flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">ROVILLE</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">EDT Individualisation</h1>
            </div>
          </div>
          <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-4 py-5">
          {navigation.map((item, idx) =>
            'section' in item ? (
              idx === 0 ? null : (
                <p key={item.section} className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {item.section}
                </p>
              )
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/suivi'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-gray-50 shadow-lg shadow-blue-200/70' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="border-t border-slate-100 px-6 py-5 text-sm text-slate-500">
          Gestion des emplois du temps individualisés des élèves et des professeurs.
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header id="app-header" className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button className="rounded-2xl border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{pageTitle}</h2>
                <p className="text-sm text-slate-500">Organisation hebdomadaire de l’individualisation</p>
              </div>
            </div>

            {showWeekSelector ? (
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
                <button className="rounded-xl p-1.5 text-slate-600 transition hover:bg-white sm:p-2" onClick={prevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 px-1 sm:px-2">
                  <div className="rounded-xl bg-white px-2.5 py-1 text-sm shadow-sm sm:px-3 sm:py-2">
                    <div className="font-semibold leading-tight text-slate-900">Semaine {week}</div>
                    <div className="hidden text-xs text-slate-500 sm:block">{format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}</div>
                  </div>
                  <CalendarRange className="hidden h-5 w-5 text-blue-500 sm:block" />
                </div>
                <button className="rounded-xl p-1.5 text-slate-600 transition hover:bg-white sm:p-2" onClick={nextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
