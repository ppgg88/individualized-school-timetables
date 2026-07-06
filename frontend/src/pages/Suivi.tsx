import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { History, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteSuivi, getErrorMessage, getSuiviSemaine, saveSuivi } from '../api';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';
import { RESSENTI_OPTIONS } from '../types';
import type { EleveSemaineSuivi } from '../types';

export default function Suivi() {
  const { week, year } = useWeek();

  const suiviQuery = useQuery({ queryKey: ['suivi-semaine', week, year], queryFn: () => getSuiviSemaine(week, year) });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-slate-900">Suivi hebdomadaire — Semaine {week}</h3>
        <p className="text-sm text-slate-500">
          Saisissez un point de suivi pour chaque élève ayant eu un rendez-vous cette semaine.
        </p>
      </div>

      {suiviQuery.isLoading ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-soft">Chargement…</p>
      ) : (suiviQuery.data ?? []).length === 0 ? (
        <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-soft">
          Aucun élève n’a eu de rendez-vous cette semaine.
        </p>
      ) : (
        <div className="space-y-4">
          {(suiviQuery.data ?? []).map((item) => (
            <SuiviCard key={`${item.id}-${week}-${year}`} eleve={item} week={week} year={year} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SuiviCardProps {
  eleve: EleveSemaineSuivi;
  week: number;
  year: number;
}

function SuiviCard({ eleve, week, year }: SuiviCardProps) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [contenu, setContenu] = useState(eleve.suivi?.contenu ?? '');
  const [ressenti, setRessenti] = useState<number | null>(eleve.suivi?.ressenti ?? null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['suivi-semaine', week, year] });

  const saveMutation = useMutation({
    mutationFn: () => saveSuivi({ id_eleves: eleve.id, semaine: week, annee: year, contenu, ressenti }),
    onSuccess: () => {
      pushToast({ title: 'Suivi enregistré', variant: 'success' });
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Enregistrement impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSuivi(eleve.suivi!.id),
    onSuccess: () => {
      pushToast({ title: 'Suivi supprimé', variant: 'success' });
      setContenu('');
      setRessenti(null);
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Suppression impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const dirty = contenu !== (eleve.suivi?.contenu ?? '') || ressenti !== (eleve.suivi?.ressenti ?? null);

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900">{eleve.nom} {eleve.prenom}</p>
          {eleve.classe ? <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{eleve.classe}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {eleve.suivi ? (
            <span className="text-xs text-slate-400">Modifié le {format(parseISO(eleve.suivi.updatedAt), 'dd/MM/yyyy à HH:mm')}</span>
          ) : null}
          <Link
            to={`/suivi/historique?eleve=${eleve.id}`}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Voir l’historique"
          >
            <History className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        value={contenu}
        onChange={(event) => setContenu(event.target.value)}
        placeholder="Points abordés, travail réalisé, ressenti de l’élève..."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {RESSENTI_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRessenti(ressenti === option.value ? null : option.value)}
              title={option.label}
              className={`rounded-xl px-2.5 py-1.5 text-lg transition ${ressenti === option.value ? 'bg-blue-100 ring-2 ring-blue-300' : 'hover:bg-slate-100'}`}
            >
              {option.emoji}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {eleve.suivi ? (
            <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Supprimer
            </Button>
          ) : null}
          <Button
            size="sm"
            icon={<Save className="h-4 w-4" />}
            loading={saveMutation.isPending}
            disabled={!contenu.trim() || !dirty}
            onClick={() => saveMutation.mutate()}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
