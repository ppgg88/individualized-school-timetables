import { useQuery } from '@tanstack/react-query';
import { addMinutes, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Printer } from 'lucide-react';
import { useState } from 'react';
import { getEleves, getProfs, getRdvGeneral } from '../api';
import { AbsenceModal } from '../components/calendar/AbsenceModal';
import { GroupRdvEditModal } from '../components/calendar/GroupRdvEditModal';
import { Button } from '../components/ui/Button';
import { useWeek } from '../hooks/useWeek';
import { rdvSlotKey } from '../utils/rdvGroup';
import type { Rdv } from '../types';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function AbsenceBadge({ abs }: { abs: number }) {
  if (abs === 1)  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Présent</span>;
  if (abs === -1) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Absent</span>;
  if (abs === 2)  return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Annulé</span>;
  if (abs === 4)  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Formateur absent</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Non renseigné</span>;
}

function groupBySlot(rdvList: Rdv[]): Map<string, Rdv[]> {
  // Sort all RDV chronologically
  const sorted = [...rdvList].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  // Group by exact datetime slot (same day + same hour:minute)
  const map = new Map<string, Rdv[]>();
  for (const rdv of sorted) {
    const key = format(parseISO(rdv.date), 'yyyy-MM-dd HH:mm');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(rdv);
  }
  return map;
}

interface CourseRow {
  rdv: Rdv;
  isFirstOfCourse: boolean;
  courseSize: number;
  /** Tous les rdv (un par élève) du même cours, utile pour une édition groupée */
  groupMembers: Rdv[];
}

/** Regroupe les rdv d'un même créneau horaire par cours (même prof + même lieu) pour un affichage joint. */
function buildCourseRows(items: Rdv[]): CourseRow[] {
  const groups = new Map<string, Rdv[]>();
  for (const rdv of items) {
    const key = rdvSlotKey(rdv);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rdv);
  }

  const rows: CourseRow[] = [];
  for (const group of groups.values()) {
    group.forEach((rdv, idx) => {
      rows.push({ rdv, isFirstOfCourse: idx === 0, courseSize: group.length, groupMembers: group });
    });
  }
  return rows;
}

interface GeneralScheduleTableProps {
  rdvList: Rdv[];
  readonly?: boolean;
  onAbsenceClick?: (rdv: Rdv) => void;
  /** Édite en une fois tous les rdv du cours (tous les élèves du créneau) */
  onEditClick?: (group: Rdv[]) => void;
  /** Classes additionnelles sur le conteneur racine (ex. "h-full" pour occuper la hauteur disponible) */
  className?: string;
}

export function GeneralScheduleTable({ rdvList, readonly = false, onAbsenceClick, onEditClick, className }: GeneralScheduleTableProps) {
  const slots = groupBySlot(rdvList);

  if (slots.size === 0) {
    return (
      <div className={`rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 ${className ?? ''}`}>
        Aucun rendez-vous sur cette semaine.
      </div>
    );
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft ${className ?? ''}`}>
      <div className="flex-1 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Jour</th>
              <th className="px-5 py-3 font-semibold">Horaire</th>
              <th className="px-5 py-3 font-semibold">Élève</th>
              <th className="px-5 py-3 font-semibold">Classe</th>
              <th className="px-5 py-3 font-semibold">Présence</th>
              <th className="px-5 py-3 font-semibold">Activité</th>
              <th className="px-5 py-3 font-semibold">Formateur</th>
              <th className="px-5 py-3 font-semibold">Lieu</th>
              {onEditClick ? <th className="px-5 py-3 font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {Array.from(slots.entries()).map(([slot, items]) => {
              const start = parseISO(slot);
              const courseRows = buildCourseRows(items);
              return courseRows.map(({ rdv, isFirstOfCourse, courseSize, groupMembers }, idx) => (
                <tr key={rdv.id} className={idx === 0 ? 'border-t-2 border-slate-400' : ''}>
                  {idx === 0 ? (
                    <>
                      <td
                        rowSpan={items.length}
                        className="whitespace-nowrap px-5 py-3 align-top font-semibold capitalize text-slate-900"
                      >
                        {format(start, 'EEEE', { locale: fr })}
                        <span className="ml-1 text-xs font-normal text-slate-400">{format(start, 'dd/MM')}</span>
                      </td>
                      <td
                        rowSpan={items.length}
                        className="whitespace-nowrap px-5 py-3 align-top text-slate-600"
                      >
                        <span className="font-semibold text-slate-800">{format(start, 'HH:mm')}</span>
                        <span className="block text-xs text-slate-400">→ {format(addMinutes(start, rdv.durre), 'HH:mm')}</span>
                        <span className="block text-xs text-slate-400">{rdv.durre} min</span>
                      </td>
                    </>
                  ) : null}
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {rdv.eleves ? `${rdv.eleves.nom} ${rdv.eleves.prenom}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{rdv.eleves?.classe ?? '—'}</td>
                  <td className="px-5 py-3">
                    {onAbsenceClick ? (
                      <button
                        type="button"
                        onClick={() => onAbsenceClick(rdv)}
                        className="transition hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-full"
                        title="Modifier la présence"
                      >
                        <AbsenceBadge abs={rdv.abs} />
                      </button>
                    ) : (
                      <AbsenceBadge abs={rdv.abs} />
                    )}
                  </td>
                  {isFirstOfCourse ? (
                    <>
                      <td rowSpan={courseSize} className="px-5 py-3 align-top">
                        {/* Couleurs fixes (gray-*) : posé sur le fond coloré du rdv, indépendant du thème */}
                        <div
                          className="inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5"
                          style={{ backgroundColor: `${rdv.couleur}55` }}
                        >
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: rdv.couleur }} />
                          <span className="font-medium text-gray-800">{rdv.nom}</span>
                          {courseSize > 1 && (
                            <span className="rounded-full bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-bold text-gray-50 leading-none">
                              {courseSize} élèves
                            </span>
                          )}
                        </div>
                      </td>
                      <td rowSpan={courseSize} className="px-5 py-3 align-top text-slate-600">
                        {rdv.prof ? `${rdv.prof.prenom[0]}. ${rdv.prof.nom}` : '—'}
                      </td>
                      <td rowSpan={courseSize} className="px-5 py-3 align-top text-slate-600">{rdv.lieu}</td>
                    </>
                  ) : null}
                  {onEditClick && isFirstOfCourse ? (
                    <td rowSpan={courseSize} className="px-5 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => onEditClick(groupMembers)}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        title={courseSize > 1 ? 'Modifier le rendez-vous du groupe' : 'Modifier ce rendez-vous'}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function GeneralSchedule() {
  const { week, year, nextWeek, prevWeek } = useWeek();
  const rdvQuery = useQuery({ queryKey: ['rdv-general', week, year], queryFn: () => getRdvGeneral(week, year) });
  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });
  const [selectedGroup, setSelectedGroup] = useState<Rdv[] | null>(null);
  const [selectedRdv, setSelectedRdv] = useState<Rdv | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Vue générale des rendez-vous</h3>
          <p className="text-sm text-slate-500">
            Semaine {week} · {rdvQuery.data?.length ?? 0} rendez-vous · triés par créneau horaire
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={prevWeek}>← Semaine précédente</Button>
          <Button variant="secondary" onClick={nextWeek}>Semaine suivante →</Button>
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer</Button>
        </div>
      </div>

      {/* Légende des jours */}
      <div className="flex gap-2 flex-wrap">
        {JOURS.map((j) => (
          <span key={j} className="rounded-xl bg-white border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
            {j}
          </span>
        ))}
      </div>

      <GeneralScheduleTable
        rdvList={rdvQuery.data ?? []}
        onEditClick={setSelectedGroup}
        onAbsenceClick={setSelectedRdv}
      />

      <GroupRdvEditModal
        group={selectedGroup}
        eleves={elevesQuery.data ?? []}
        profs={profsQuery.data ?? []}
        onClose={() => setSelectedGroup(null)}
        invalidateKeys={[['rdv-general', week, year], ['rdv-eleve'], ['rdv-prof']]}
      />

      <AbsenceModal
        rdv={selectedRdv}
        onClose={() => setSelectedRdv(null)}
        invalidateKeys={[['rdv-general', week, year], ['rdv-eleve'], ['rdv-prof']]}
      />
    </div>
  );
}
