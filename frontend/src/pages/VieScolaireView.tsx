import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Printer, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bulkAbsence, getEleves, getRdvGeneral } from '../api';
import { AbsenceModal } from '../components/calendar/AbsenceModal';
import { Button } from '../components/ui/Button';
import { DateInput } from '../components/ui/DateInput';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';
import type { Rdv } from '../types';
import { ABSENCE_STATUS } from '../types';
import { GeneralScheduleTable } from './GeneralSchedule';

const LS_VS_KEY = 'edt-vs-key';

export default function VieScolaireView() {
  const { week, year, weekLabel, nextWeek, prevWeek } = useWeek();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [hasVsKey, setHasVsKey] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlKey = params.get('key');
    if (urlKey) {
      localStorage.setItem(LS_VS_KEY, urlKey);
      params.delete('key');
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' }, { replace: true });
    }
    setHasVsKey(Boolean(localStorage.getItem(LS_VS_KEY)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rdvQuery = useQuery({ queryKey: ['rdv-general', week, year], queryFn: () => getRdvGeneral(week, year) });
  // La liste des élèves n'est utilisée que par le formulaire d'absence en masse (réservé vie-scolaire) :
  // /api/eleves exige désormais une clé admin ou vie-scolaire, inutile d'appeler sans hasVsKey.
  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves, enabled: hasVsKey });
  const [selectedRdv, setSelectedRdv] = useState<Rdv | null>(null);

  // ── Formulaire absence en masse ──────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const [bulkEleveId, setBulkEleveId] = useState<number | ''>('');
  const [bulkFrom, setBulkFrom] = useState(today);
  const [bulkTo, setBulkTo] = useState(today);
  const [bulkAbs, setBulkAbs] = useState<number>(-1);
  const [showBulk, setShowBulk] = useState(false);

  const bulkMutation = useMutation({
    mutationFn: () => bulkAbsence({ id_eleves: Number(bulkEleveId), dateFrom: bulkFrom, dateTo: bulkTo, abs: bulkAbs }),
    onSuccess: (data) => {
      pushToast({ title: `${data.updated} rendez-vous mis à jour`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['rdv-general'] });
      setShowBulk(false);
    },
    onError: () => pushToast({ title: 'Erreur lors de la mise à jour', variant: 'error' }),
  });

  const bulkValid = bulkEleveId && bulkFrom && bulkTo && bulkFrom <= bulkTo;

  return (
    <div className="flex h-full flex-col gap-6">
      {/* En-tête */}
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Emplois du temps — Semaine {week}</h3>
          <p className="text-sm text-slate-500">
            {rdvQuery.data?.length ?? 0} rendez-vous · triés par créneau horaire
            {hasVsKey && <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Vie scolaire</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation semaine */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <button type="button" onClick={prevWeek} className="rounded-xl p-1 text-slate-500 hover:bg-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-sm font-semibold text-slate-700">S{week} · {weekLabel}</span>
            <button type="button" onClick={nextWeek} className="rounded-xl p-1 text-slate-500 hover:bg-slate-200">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {hasVsKey && (
            <Button
              icon={<UserX className="h-4 w-4" />}
              variant={showBulk ? 'primary' : 'secondary'}
              onClick={() => setShowBulk((v) => !v)}
            >
              Absence sur période
            </Button>
          )}
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} variant="secondary">
            Imprimer
          </Button>
        </div>
      </div>

      {/* Panneau absence en masse */}
      {hasVsKey && showBulk && (
        <div className="flex-shrink-0 rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-soft">
          <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-orange-900">
            <UserX className="h-5 w-5" />
            Déclarer un élève absent sur une période
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Élève */}
            <div className="lg:col-span-1">
              <label className="mb-1 block text-xs font-semibold text-orange-800">Élève *</label>
              <select
                value={bulkEleveId}
                onChange={(e) => setBulkEleveId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">— Choisir un élève —</option>
                {(elevesQuery.data ?? []).map((el) => (
                  <option key={el.id} value={el.id}>
                    {el.nom} {el.prenom}{el.classe ? ` (${el.classe})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Date début */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-orange-800">Du *</label>
              <DateInput
                value={bulkFrom}
                onChange={setBulkFrom}
                className="rounded-2xl border-orange-200 focus:border-orange-400 focus:ring-orange-100"
              />
            </div>
            {/* Date fin */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-orange-800">Au *</label>
              <DateInput
                value={bulkTo}
                onChange={setBulkTo}
                className="rounded-2xl border-orange-200 focus:border-orange-400 focus:ring-orange-100"
              />
            </div>
            {/* Statut */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-orange-800">Statut</label>
              <select
                value={bulkAbs}
                onChange={(e) => setBulkAbs(Number(e.target.value))}
                className="w-full rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                {ABSENCE_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-orange-700">
              Tous les rendez-vous de l'élève entre les deux dates seront mis à jour.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBulk(false)}
                className="rounded-2xl border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!bulkValid || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate()}
                className="rounded-2xl bg-orange-600 px-4 py-2 text-sm font-semibold text-gray-50 transition hover:bg-orange-700 disabled:opacity-50"
              >
                {bulkMutation.isPending ? 'Mise à jour…' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau EDT */}
      <div className="min-h-0 flex-1">
        <GeneralScheduleTable
          rdvList={rdvQuery.data ?? []}
          onAbsenceClick={hasVsKey ? setSelectedRdv : undefined}
          className="h-full"
        />
      </div>

      <AbsenceModal
        rdv={selectedRdv}
        onClose={() => setSelectedRdv(null)}
        invalidateKeys={[['rdv-general', week, year]]}
      />
    </div>
  );
}
