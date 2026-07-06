import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { getRdvProf } from '../api';
import { AbsenceGroupModal } from '../components/calendar/AbsenceGroupModal';
import { WeekCalendar } from '../components/calendar/WeekCalendar';
import { useWeek } from '../hooks/useWeek';
import { groupRdvBySlot } from '../utils/rdvGroup';
import type { Rdv } from '../types';

const LS_PROF_KEY = 'edt-prof-key';

export default function ProfView() {
  const { id } = useParams<{ id: string }>();
  const { week, year, nextWeek, prevWeek } = useWeek();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState<Rdv[] | null>(null);

  const profId = Number(id);

  // Le token personnel du professeur arrive via ?key= (lien individuel) et est ensuite mémorisé
  // pour ne pas avoir à le repasser à chaque visite.
  const [accessKey] = useState<string | undefined>(() => {
    const urlKey = searchParams.get('key');
    if (urlKey) {
      localStorage.setItem(LS_PROF_KEY, urlKey);
      return urlKey;
    }
    return localStorage.getItem(LS_PROF_KEY) ?? undefined;
  });
  const hasKey = Boolean(accessKey);

  useEffect(() => {
    if (searchParams.has('key')) {
      const next = new URLSearchParams(searchParams);
      next.delete('key');
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rdvQuery = useQuery({
    queryKey: ['rdv-prof', profId, week, year, accessKey],
    queryFn: () => getRdvProf(profId, week, year, accessKey),
    enabled: Boolean(profId),
  });

  // Grouper les RDVs par créneau (affichage joint quand plusieurs élèves partagent le même cours)
  const { representativeRdvs, groupMap, groupSizes } = useMemo(() => groupRdvBySlot(rdvQuery.data ?? []), [rdvQuery.data]);

  const canEdit = hasKey && !rdvQuery.isError;

  const handleRdvClick = (rdv: Rdv) => {
    const group = groupMap.get(rdv.id) ?? [rdv];
    setSelectedGroup(group);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {rdvQuery.isError ? (
        <div className="flex-shrink-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          🔒 Accès non autorisé. Utilisez le lien fourni par l'administrateur pour consulter cet emploi du temps.
        </div>
      ) : canEdit ? (
        <div className="flex-shrink-0 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          💡 Cliquez sur un rendez-vous pour renseigner la présence des élèves.
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <WeekCalendar
          rdv={representativeRdvs}
          onRdvClick={canEdit ? handleRdvClick : undefined}
          week={week}
          year={year}
          onNextWeek={nextWeek}
          onPrevWeek={prevWeek}
          groupSizes={groupSizes}
          className="h-full"
        />
      </div>

      <AbsenceGroupModal
        rdvs={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        invalidateKeys={[['rdv-prof', profId, week, year]]}
      />
    </div>
  );
}
