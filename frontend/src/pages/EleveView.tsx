import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getRdvEleve } from '../api';
import { WeekCalendar } from '../components/calendar/WeekCalendar';
import { useWeek } from '../hooks/useWeek';

export default function EleveView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { week, year, nextWeek, prevWeek, canGoNext } = useWeek({ maxCurrentWeek: true });

  const eleveId = Number(id);
  const storageKey = `edt-eleve-key-${eleveId}`;

  // Le token personnel de l'élève arrive via ?key= (lien / QR code individuel) et est ensuite
  // mémorisé par élève : un même appareil peut servir à plusieurs élèves (fratrie, tablette
  // commune) sans mélanger leurs accès.
  const [accessKey] = useState<string | undefined>(() => {
    const urlKey = searchParams.get('key');
    if (urlKey) {
      localStorage.setItem(storageKey, urlKey);
      return urlKey;
    }
    return localStorage.getItem(storageKey) ?? undefined;
  });

  useEffect(() => {
    if (searchParams.has('key')) {
      const next = new URLSearchParams(searchParams);
      next.delete('key');
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rdvQuery = useQuery({
    queryKey: ['rdv-eleve', eleveId, week, year, accessKey],
    queryFn: () => getRdvEleve(eleveId, week, year, accessKey),
    enabled: Boolean(eleveId),
  });

  return (
    <div className="flex h-full flex-col gap-4">
      {rdvQuery.isLoading && (
        <div className="flex-shrink-0 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chargement de l'emploi du temps…
        </div>
      )}
      {rdvQuery.isError && (
        <div className="flex-shrink-0 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-rose-700">
          Accès non autorisé. Utilisez le lien (QR code) fourni par l'administrateur pour consulter cet emploi du temps.
        </div>
      )}
      <div className="min-h-0 flex-1">
        <WeekCalendar
          rdv={rdvQuery.data ?? []}
          week={week}
          year={year}
          onNextWeek={nextWeek}
          onPrevWeek={prevWeek}
          canGoNext={canGoNext}
          className="h-full"
          // Pas de onRdvClick → vue lecture seule
        />
      </div>
    </div>
  );
}
