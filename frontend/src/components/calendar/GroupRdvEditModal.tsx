import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { createRdv, deleteRdv, notifyRdvChange, updateRdv, getErrorMessage } from '../../api';
import { ABSENCE_STATUS, type Eleve, type Prof, type Rdv, type RdvPayload } from '../../types';
import { mailResultToastTitle } from '../../utils/mail';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { useToast } from '../ui/ToastProvider';
import { RdvForm } from './RdvForm';

interface Props {
  /** Tous les rdv (un par élève) partageant le même créneau */
  group: Rdv[] | null;
  eleves: Eleve[];
  profs: Prof[];
  onClose: () => void;
  invalidateKeys?: unknown[][];
}

/**
 * Édite en une seule fois les champs partagés (date, heure, durée, lieu, professeur, couleur, nom)
 * de tous les rdv d'un créneau groupé. Le statut de présence de chaque élève est préservé
 * individuellement, sauf si tout le groupe partage déjà le même statut : dans ce cas il peut
 * aussi être modifié en une fois pour l'ensemble du groupe.
 */
export function GroupRdvEditModal({ group, eleves, profs, onClose, invalidateKeys }: Props) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifyByEmail, setNotifyByEmail] = useState(false);

  // Si tous les élèves du groupe ont actuellement le même statut de présence, on permet de
  // le modifier pour l'ensemble du groupe en une fois plutôt que de le préserver individuellement.
  const uniformAbs = useMemo(() => {
    if (!group?.length) return null;
    return group.every((rdv) => rdv.abs === group[0].abs) ? group[0].abs : null;
  }, [group]);

  const groupKey = (group ?? []).map((rdv) => rdv.id).join(',');
  const [bulkAbs, setBulkAbs] = useState<number>(uniformAbs ?? 0);
  const [prevGroupKey, setPrevGroupKey] = useState(groupKey);
  if (groupKey !== prevGroupKey) {
    setPrevGroupKey(groupKey);
    setBulkAbs(uniformAbs ?? 0);
  }

  const refresh = () => {
    invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: RdvPayload) => {
      const original = group ?? [];
      const originalByStudent = new Map(original.map((rdv) => [rdv.id_eleves, rdv]));
      const nextStudentIds = Array.from(new Set(payload.elevesIds ?? []));

      const toUpdate = nextStudentIds.filter((studentId) => originalByStudent.has(studentId));
      const toCreate = nextStudentIds.filter((studentId) => !originalByStudent.has(studentId));
      const toDelete = original.filter((rdv) => !nextStudentIds.includes(rdv.id_eleves));

      // Le groupe partait d'un statut uniforme : on applique la valeur choisie (éventuellement
      // inchangée) à tout le monde plutôt que de préserver le statut individuel de chacun.
      const applyBulkAbs = uniformAbs !== null;

      await Promise.all([
        ...toUpdate.map((studentId) => {
          const existing = originalByStudent.get(studentId)!;
          return updateRdv(existing.id, { ...payload, id_eleves: studentId, abs: applyBulkAbs ? bulkAbs : existing.abs });
        }),
        ...toDelete.map((rdv) => deleteRdv(rdv.id)),
        toCreate.length ? createRdv({ ...payload, elevesIds: toCreate, abs: applyBulkAbs ? bulkAbs : 0 }) : Promise.resolve(),
      ]);
    },
    onSuccess: async (_data, payload) => {
      const original = group ?? [];
      const originalStudentIds = new Set(original.map((rdv) => rdv.id_eleves));
      const nextStudentIds = Array.from(new Set(payload.elevesIds ?? []));
      const added = nextStudentIds.filter((id) => !originalStudentIds.has(id)).length;
      const removed = [...originalStudentIds].filter((id) => !nextStudentIds.includes(id)).length;
      const detail = added || removed
        ? ` (${[added ? `+${added}` : null, removed ? `-${removed}` : null].filter(Boolean).join(' / ')} élève${added + removed > 1 ? 's' : ''})`
        : '';
      pushToast({ title: `Rendez-vous mis à jour${detail}`, variant: 'success' });

      if (notifyByEmail) {
        try {
          const notifyResult = await notifyRdvChange({ eleveIds: nextStudentIds, profId: payload.id_proph });
          pushToast({
            title: `Notification envoyée : ${mailResultToastTitle(notifyResult)}`,
            variant: notifyResult.failed.length ? 'error' : 'success',
          });
        } catch (error) {
          pushToast({ title: 'Notification impossible', description: getErrorMessage(error), variant: 'error' });
        }
      }

      refresh();
      onClose();
    },
    onError: (error) => pushToast({ title: 'Mise à jour impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all((group ?? []).map((rdv) => deleteRdv(rdv.id)));
    },
    onSuccess: () => {
      pushToast({ title: 'Rendez-vous supprimé', variant: 'success' });
      setConfirmDelete(false);
      refresh();
      onClose();
    },
    onError: (error) => pushToast({ title: 'Suppression impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const initialValues = useMemo<Partial<Rdv> | undefined>(() => (group?.length ? group[0] : undefined), [group]);
  const initialElevesIds = useMemo(() => group?.map((rdv) => rdv.id_eleves) ?? [], [group]);

  if (!group?.length) return null;

  const count = group.length;

  return (
    <Modal
      open={Boolean(group?.length)}
      title={count > 1 ? `Modifier le rendez-vous (${count} élèves)` : 'Modifier le rendez-vous'}
      onClose={onClose}
    >
      <div className="space-y-6">
        {count > 1 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            Ce créneau est partagé par {count} élèves. Les modifications ci-dessous s'appliquent en une seule fois à
            l'ensemble du groupe. Décochez un élève pour supprimer son rendez-vous, ou ajoutez-en un pour lui créer
            ce même rendez-vous. {uniformAbs !== null
              ? "Comme ils ont tous actuellement le même statut de présence, vous pouvez aussi le modifier pour tout le groupe ci-dessous."
              : "Ils n'ont pas tous le même statut de présence actuellement : celui de chaque élève est donc préservé."}
          </div>
        )}

        {uniformAbs !== null && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <Select
              label={count > 1 ? 'Statut de présence (tout le groupe)' : 'Statut de présence'}
              value={bulkAbs}
              onChange={(event) => setBulkAbs(Number(event.target.value))}
              options={ABSENCE_STATUS.map((status) => ({ value: status.value, label: status.label }))}
            />
          </div>
        )}

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={notifyByEmail}
            onChange={(event) => setNotifyByEmail(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-400"
          />
          Prévenir par email les élèves et le formateur concernés de ce changement
        </label>

        <RdvForm
          initialValues={initialValues}
          initialElevesIds={initialElevesIds}
          eleves={eleves}
          profs={profs}
          isLoading={saveMutation.isPending}
          showElevesField
          showAbsenceField={false}
          showRepeatField={false}
          onCancel={onClose}
          onSubmit={async (payload) => {
            await saveMutation.mutateAsync(payload);
          }}
        />

        <div className="flex justify-end border-t border-slate-100 pt-4">
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">
                Supprimer ce rendez-vous pour {count > 1 ? `les ${count} élèves` : "l'élève"} ?
              </p>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Annuler</Button>
              <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                Confirmer la suppression
              </Button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              {count > 1 ? 'Supprimer le groupe' : 'Supprimer'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
