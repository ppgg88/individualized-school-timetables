import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { updateAbsence } from '../../api';
import type { Rdv } from '../../types';
import { ABSENCE_STATUS } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/ToastProvider';

interface Props {
  rdvs: Rdv[] | null;
  onClose: () => void;
  invalidateKeys?: unknown[][];
}

const STATUS_COLORS: Record<number, string> = {
  [-1]: 'border-red-400 bg-red-50 text-red-700',
  0:    'border-slate-300 bg-slate-50 text-slate-600',
  1:    'border-emerald-400 bg-emerald-50 text-emerald-700',
  2:    'border-orange-400 bg-orange-50 text-orange-700',
  4:    'border-red-300 bg-red-50 text-red-600',
};

export function AbsenceGroupModal({ rdvs, onClose, invalidateKeys }: Props) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  // État local : { [rdvId]: abs }
  const [absMap, setAbsMap] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    (rdvs ?? []).forEach((r) => { map[r.id] = r.abs; });
    return map;
  });

  // Resync si les rdvs changent
  const rdvsKey = rdvs?.map((r) => r.id).join(',') ?? '';
  const [prevKey, setPrevKey] = useState(rdvsKey);
  if (rdvsKey !== prevKey) {
    setPrevKey(rdvsKey);
    const map: Record<number, number> = {};
    (rdvs ?? []).forEach((r) => { map[r.id] = r.abs; });
    setAbsMap(map);
  }

  const mutation = useMutation({
    mutationFn: async (updates: { id: number; abs: number }[]) => {
      await Promise.all(updates.map(({ id, abs }) => updateAbsence(id, abs)));
    },
    onSuccess: () => {
      pushToast({ title: 'Présences mises à jour', variant: 'success' });
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      onClose();
    },
    onError: () => pushToast({ title: 'Erreur lors de la mise à jour', variant: 'error' }),
  });

  if (!rdvs?.length) return null;

  const first = rdvs[0];
  const start = parseISO(first.date);

  const applyAll = (abs: number) => {
    const next: Record<number, number> = {};
    rdvs.forEach((r) => { next[r.id] = abs; });
    setAbsMap(next);
  };

  const handleSave = () => {
    const updates = rdvs.map((r) => ({ id: r.id, abs: absMap[r.id] ?? 0 }));
    mutation.mutate(updates);
  };

  return (
    <Modal open={Boolean(rdvs?.length)} title="Renseigner les présences" onClose={onClose}>
      <div className="space-y-5">
        {/* Infos du créneau */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: first.couleur }} />
            <span className="font-semibold text-slate-900">{first.nom}</span>
          </div>
          <p className="text-slate-600 capitalize">{format(start, 'EEEE dd MMMM yyyy', { locale: fr })}</p>
          <p className="text-slate-600">{format(start, 'HH:mm')} · {first.durre} min · {first.lieu}</p>
          <p className="text-xs text-slate-500">{rdvs.length} élève{rdvs.length > 1 ? 's' : ''}</p>
        </div>

        {/* Appliquer à tous */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CheckCheck className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appliquer à tous</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ABSENCE_STATUS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => applyAll(s.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${STATUS_COLORS[s.value]}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des élèves */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Par élève</p>
          {rdvs.map((rdv) => (
            <div key={rdv.id} className="rounded-2xl border border-slate-100 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-slate-900">
                {rdv.eleves
                  ? `${rdv.eleves.prenom} ${rdv.eleves.nom}${rdv.eleves.classe ? ` · ${rdv.eleves.classe}` : ''}`
                  : `Élève #${rdv.id_eleves}`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ABSENCE_STATUS.map((s) => {
                  const isSelected = (absMap[rdv.id] ?? 0) === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setAbsMap((prev) => ({ ...prev, [rdv.id]: s.value }))}
                      className={`rounded-xl border-2 px-3 py-1 text-xs font-medium transition ${
                        isSelected
                          ? STATUS_COLORS[s.value] + ' ring-1 ring-offset-1'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button loading={mutation.isPending} onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
