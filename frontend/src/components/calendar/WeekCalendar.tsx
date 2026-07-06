import { addDays, addMinutes, format, getISOWeek, parseISO, startOfISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { Rdv } from '../../types';
import { AppointmentCard, absenceLabels, absenceStyles } from './AppointmentCard';

interface WeekCalendarProps {
  rdv: Rdv[];
  onRdvClick?: (rdv: Rdv) => void;
  week: number;
  year: number;
  showWeekNav?: boolean;
  onNextWeek?: () => void;
  onPrevWeek?: () => void;
  /** Désactive le bouton "semaine suivante" (ex. élève ne pouvant pas voir les semaines futures) */
  canGoNext?: boolean;
  /** Nombre d'élèves par rdv.id, pour afficher un badge de groupe */
  groupSizes?: Map<number, number>;
  /** rdv.id des créneaux à mettre en valeur comme "Nouveau" (aperçu non encore enregistré) */
  previewIds?: Set<number>;
  /** Classes additionnelles sur le conteneur racine (ex. "h-full" pour occuper la hauteur disponible) */
  className?: string;
}

interface PositionedAppointment {
  rdv: Rdv;
  top: number;
  height: number;
  left: number;
  width: number;
}

const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const hourSlots = Array.from({ length: 12 }, (_, index) => 8 + index);
const dayStartMinutes = 8 * 60;
const dayEndMinutes = 19 * 60;
const minuteHeight = 1;
const gridHeight = (dayEndMinutes - dayStartMinutes) * minuteHeight;

function getWeekStart(week: number, year: number) {
  return startOfISOWeek(addDays(new Date(year, 0, 4), (week - 1) * 7));
}

function getMinutesFromStart(date: Date) {
  return date.getHours() * 60 + date.getMinutes() - dayStartMinutes;
}

function layoutAppointments(items: Rdv[]): PositionedAppointment[] {
  const sorted = [...items].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  const positioned: PositionedAppointment[] = [];
  let cluster: Rdv[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (!cluster.length) {
      return;
    }

    const columns: number[] = [];
    const allocations = cluster.map((appointment) => {
      const start = getMinutesFromStart(parseISO(appointment.date));
      const end = start + appointment.durre;
      let columnIndex = columns.findIndex((value) => value <= start);
      if (columnIndex === -1) {
        columnIndex = columns.length;
        columns.push(end);
      } else {
        columns[columnIndex] = end;
      }
      return { appointment, start, end, columnIndex };
    });

    const totalColumns = Math.max(columns.length, 1);
    allocations.forEach(({ appointment, start, end, columnIndex }) => {
      positioned.push({
        rdv: appointment,
        top: Math.max(start, 0) * minuteHeight,
        height: Math.max(end - start, 24) * minuteHeight,
        left: (columnIndex / totalColumns) * 100,
        width: 100 / totalColumns,
      });
    });

    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((appointment) => {
    const start = getMinutesFromStart(parseISO(appointment.date));
    const end = start + appointment.durre;

    if (!cluster.length || start < clusterEnd) {
      cluster.push(appointment);
      clusterEnd = Math.max(clusterEnd, end);
      return;
    }

    flushCluster();
    cluster.push(appointment);
    clusterEnd = end;
  });

  flushCluster();
  return positioned;
}

export function WeekCalendar({ rdv, onRdvClick, week, year, showWeekNav = true, onNextWeek, onPrevWeek, canGoNext = true, groupSizes, previewIds, className }: WeekCalendarProps) {
  const weekStart = useMemo(() => getWeekStart(week, year), [week, year]);
  const days = useMemo(() => Array.from({ length: 5 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const today = new Date();
  const isCurrentWeek = getISOWeek(today) === week && today.getFullYear() === year;

  const rdvByDay = useMemo(
    () =>
      days.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        return rdv
          .filter((item) => format(parseISO(item.date), 'yyyy-MM-dd') === dayKey)
          .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      }),
    [days, rdv],
  );

  const appointmentsByDay = useMemo(() => rdvByDay.map(layoutAppointments), [rdvByDay]);

  return (
    <div className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-soft ${className ?? ''}`}>
      {showWeekNav ? (
        <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:gap-3 sm:px-5 sm:py-4">
          <div>
            <h3 className="hidden text-lg font-semibold text-slate-900 sm:block">Planning hebdomadaire</h3>
            <p className="text-sm font-semibold text-slate-900 sm:font-normal sm:text-slate-500">
              Semaine {week} <span className="hidden sm:inline">· {format(days[0], 'dd/MM')} au {format(days[4], 'dd/MM/yyyy')}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button className="rounded-full border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 sm:p-2" onClick={onPrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-full border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:p-2"
              onClick={onNextWeek}
              disabled={!canGoNext}
              title={canGoNext ? undefined : "Vous ne pouvez pas consulter les semaines futures"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Agenda mobile : liste verticale par jour, sans grille ni défilement horizontal */}
      <div className="divide-y divide-slate-100 md:hidden">
        {days.map((day, dayIndex) => {
          const isToday = isCurrentWeek && format(today, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          const dayAppointments = rdvByDay[dayIndex];

          return (
            <div key={day.toISOString()} className={`px-4 py-3 ${isToday ? 'bg-blue-50/50' : ''}`}>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>
                  {dayNames[dayIndex]} {format(day, 'dd/MM')}
                </p>
                {isToday ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-gray-50">Aujourd’hui</span>
                ) : null}
              </div>

              {dayAppointments.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">Aucun rendez-vous.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {dayAppointments.map((rdvItem) => {
                    const start = parseISO(rdvItem.date);
                    const end = addMinutes(start, rdvItem.durre);
                    const count = groupSizes?.get(rdvItem.id) ?? 1;
                    const isPreview = previewIds?.has(rdvItem.id) ?? false;
                    const absStyle = absenceStyles[rdvItem.abs];
                    const absLabel = absenceLabels[rdvItem.abs];
                    const teacherLabel = rdvItem.prof ? `${rdvItem.prof.prenom} ${rdvItem.prof.nom}` : null;

                    return (
                      <button
                        key={rdvItem.id}
                        type="button"
                        onClick={() => onRdvClick?.(rdvItem)}
                        className={`flex w-full items-stretch gap-3 rounded-2xl border bg-white px-3 py-2 text-left shadow-sm transition active:scale-[0.99] ${
                          isPreview ? 'border-2 border-blue-500 ring-2 ring-blue-300' : 'border-slate-100'
                        }`}
                      >
                        <div className="w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: rdvItem.couleur }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                            </p>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              {count > 1 && (
                                <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-gray-50">{count} élèves</span>
                              )}
                              {absStyle && absLabel && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${absStyle}`}>{absLabel}</span>
                              )}
                            </div>
                          </div>
                          <p className="truncate text-xs text-slate-600">{rdvItem.lieu}</p>
                          <p className="truncate text-xs font-medium text-slate-800">{rdvItem.nom}</p>
                          {teacherLabel && <p className="truncate text-xs text-slate-500">{teacherLabel}</p>}
                          {rdvItem.eleves && (
                            <p className="truncate text-xs text-slate-500">
                              {rdvItem.eleves.prenom} {rdvItem.eleves.nom}
                              {rdvItem.eleves.classe ? ` · ${rdvItem.eleves.classe}` : ''}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grille hebdomadaire desktop : masquée sur mobile pour éviter le zoom / scroll horizontal forcé */}
      <div className="hidden flex-1 overflow-x-auto md:block">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[72px_repeat(5,minmax(0,1fr))] border-b border-slate-100 bg-slate-50/80">
            <div />
            {days.map((day, index) => {
              const isToday = isCurrentWeek && format(today, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
              return (
                <div key={day.toISOString()} className={`border-l border-slate-100 px-3 py-4 ${isToday ? 'bg-blue-50' : ''}`}>
                  <p className="text-sm font-semibold text-slate-900">{dayNames[index]}</p>
                  <p className="text-xs text-slate-500">{format(day, 'dd/MM')}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[72px_repeat(5,minmax(0,1fr))]">
            <div className="relative border-r border-slate-100 bg-slate-50/70">
              {hourSlots.map((hour, index) => (
                <div key={hour} className="absolute inset-x-0 flex items-start justify-center border-t border-dashed border-slate-200 text-xs text-slate-400" style={{ top: `${index * 60}px`, height: '60px' }}>
                  <span className="-translate-y-1/2 rounded-full bg-slate-50 px-2">{hour}h</span>
                </div>
              ))}
            </div>

            {appointmentsByDay.map((appointments, dayIndex) => {
              const day = days[dayIndex];
              const isToday = isCurrentWeek && format(today, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
              const currentMinutes = today.getHours() * 60 + today.getMinutes() - dayStartMinutes;

              return (
                <div key={day.toISOString()} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-blue-50/40' : ''}`}>
                  <div className="relative" style={{ height: `${gridHeight}px` }}>
                    {hourSlots.map((hour, index) => (
                      <div key={hour} className="absolute inset-x-0 border-t border-slate-100" style={{ top: `${index * 60}px` }} />
                    ))}

                    {isToday && currentMinutes > 0 && currentMinutes < dayEndMinutes - dayStartMinutes ? (
                      <div className="absolute inset-x-2 z-10 flex items-center gap-2" style={{ top: `${currentMinutes}px` }}>
                        <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                        <div className="h-px flex-1 bg-red-500" />
                      </div>
                    ) : null}

                    {appointments.map((appointment) => {
                      const count = groupSizes?.get(appointment.rdv.id) ?? 1;
                      const isPreview = previewIds?.has(appointment.rdv.id) ?? false;
                      return (
                        <button
                          key={appointment.rdv.id}
                          type="button"
                          className={`absolute px-1 text-left ${isPreview ? 'z-20' : ''}`}
                          style={{ top: `${appointment.top}px`, height: `${appointment.height}px`, left: `${appointment.left}%`, width: `${appointment.width}%` }}
                          onClick={() => onRdvClick?.(appointment.rdv)}
                        >
                          {/* Badge nombre d'élèves — couleurs fixes (gray-*), posé sur le fond coloré du rdv */}
                          {count > 1 && (
                            <span className="absolute right-2 top-1 z-10 rounded-full bg-gray-900/80 px-1.5 py-0.5 text-[9px] font-bold text-gray-50 leading-none">
                              {count} élèves
                            </span>
                          )}
                          <AppointmentCard rdv={appointment.rdv} isPreview={isPreview} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
