import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { updateAbsence } from '../../api';
import type { Rdv } from '../../types';
import { ABSENCE_STATUS } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/ToastProvider';

interface AbsenceModalProps {
  rdv: Rdv | null;
  onClose: () => void;
  /** Query key(s) à invalider après mise à jour */
  invalidateKeys?: unknown[][];
}

export function AbsenceModal({ rdv, onClose, invalidateKeys }: AbsenceModalProps) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [abs, setAbs] = useState<number>(rdv?.abs ?? 0);
  // Ref pour détecter quand le rdv change et resynchroniser le state
  const [prevRdvId, setPrevRdvId] = useState<number | undefined>(rdv?.id);
  if (rdv?.id !== prevRdvId) {
    setPrevRdvId(rdv?.id);
    setAbs(rdv?.abs ?? 0);
  }

  const mutation = useMutation({
    mutationFn: (newAbs: number) => updateAbsence(rdv!.id, newAbs),
    onSuccess: () => {
      pushToast({ title: 'Présence mise à jour', variant: 'success' });
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      onClose();
    },
    onError: () => pushToast({ title: 'Erreur lors de la mise à jour', variant: 'error' }),
  });

  if (!rdv) return null;

  const start = parseISO(rdv.date);

  return (
    <Modal open={Boolean(rdv)} title="Renseigner la présence" onClose={onClose}>
      <div className="space-y-5">
        {/* Infos du RDV */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: rdv.couleur }} />
            <span className="font-semibold text-slate-900">{rdv.nom}</span>
          </div>
          <p className="text-slate-600 capitalize">{format(start, 'EEEE dd MMMM yyyy', { locale: fr })}</p>
          <p className="text-slate-600">{format(start, 'HH:mm')} · {rdv.durre} min · {rdv.lieu}</p>
          {rdv.eleves && (
            <p className="text-slate-700 font-medium">
              Élève : {rdv.eleves.prenom} {rdv.eleves.nom}
              {rdv.eleves.classe ? ` (${rdv.eleves.classe})` : ''}
            </p>
          )}
        </div>

        {/* Sélection du statut */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Statut de présence</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ABSENCE_STATUS.map((status) => {
              const isSelected = abs === status.value;
              const colorClass =
                status.value === 1 ? 'border-emerald-400 bg-emerald-50 text-emerald-700' :
                status.value === -1 ? 'border-red-400 bg-red-50 text-red-700' :
                status.value === 2 ? 'border-orange-400 bg-orange-50 text-orange-700' :
                status.value === 4 ? 'border-red-300 bg-red-50 text-red-600' :
                'border-slate-300 bg-slate-50 text-slate-600';
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setAbs(status.value)}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-medium transition ${
                    isSelected ? colorClass + ' ring-2 ring-offset-1' :
                    'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            loading={mutation.isPending}
            onClick={() => mutation.mutate(abs)}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
