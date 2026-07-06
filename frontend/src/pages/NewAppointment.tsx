import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseISO, getISOWeek, getYear } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRdv, getEleves, getProfs, getRdvEleve, getRdvProf, getErrorMessage } from '../api';
import { RdvForm } from '../components/calendar/RdvForm';
import { WeekCalendar } from '../components/calendar/WeekCalendar';
import { useToast } from '../components/ui/ToastProvider';
import { groupRdvBySlot } from '../utils/rdvGroup';
import type { Rdv, RdvPayload } from '../types';

// Identifiants négatifs pour les rdv d'aperçu, afin de ne jamais entrer en collision avec de vrais id venant du backend
const PREVIEW_ID_OFFSET = -1_000_000;

export default function NewAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [preview, setPreview] = useState<Rdv[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<number | undefined>();

  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });

  const createMutation = useMutation({
    mutationFn: (payload: RdvPayload) => createRdv(payload),
    onSuccess: () => {
      pushToast({ title: 'Rendez-vous créé', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['rdv-general'] });
      navigate('/edt/general');
    },
    onError: (error) => pushToast({ title: 'Création impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const previewWeek = useMemo(() => (preview[0] ? getISOWeek(parseISO(preview[0].date)) : getISOWeek(new Date())), [preview]);
  const previewYear = useMemo(() => (preview[0] ? getYear(parseISO(preview[0].date)) : getYear(new Date())), [preview]);

  const buildPreview = useCallback((payload: RdvPayload) => {
    const selectedStudents = (payload.elevesIds ?? []).length ? payload.elevesIds ?? [] : payload.id_eleves ? [payload.id_eleves] : [];
    setSelectedStudentIds(selectedStudents);
    setSelectedProfId(payload.id_proph);
    setPreview(
      selectedStudents.map((studentId, index) => ({
        id: PREVIEW_ID_OFFSET - index,
        nom: payload.nom,
        date: payload.date,
        durre: payload.durre,
        couleur: payload.couleur,
        id_eleves: studentId,
        id_proph: payload.id_proph,
        lieu: payload.lieu,
        abs: payload.abs,
        eleves: elevesQuery.data?.find((eleve) => eleve.id === studentId),
        prof: profsQuery.data?.find((prof) => prof.id === payload.id_proph),
      })),
    );
  }, [elevesQuery.data, profsQuery.data]);

  // Rendez-vous déjà programmés des élèves sélectionnés, sur la semaine affichée
  const existingStudentQueries = useQueries({
    queries: selectedStudentIds.map((studentId) => ({
      queryKey: ['rdv-eleve', studentId, previewWeek, previewYear],
      queryFn: () => getRdvEleve(studentId, previewWeek, previewYear),
    })),
  });

  // Rendez-vous déjà programmés du professeur sélectionné, sur la semaine affichée
  const existingProfQuery = useQuery({
    queryKey: ['rdv-prof', selectedProfId, previewWeek, previewYear],
    queryFn: () => getRdvProf(selectedProfId!, previewWeek, previewYear),
    enabled: Boolean(selectedProfId),
  });

  // Fusionne les rdv existants (élèves + prof) avec l'aperçu du nouveau rendez-vous, avec affichage joint
  const { representativeRdvs: calendarRdvs, groupSizes: calendarGroupSizes, previewHighlightIds } = useMemo(() => {
    const existingById = new Map<number, Rdv>();
    existingStudentQueries.forEach((query) => (query.data ?? []).forEach((rdv) => existingById.set(rdv.id, rdv)));
    (existingProfQuery.data ?? []).forEach((rdv) => existingById.set(rdv.id, rdv));

    const previewIds = new Set(preview.map((rdv) => rdv.id));
    const combined = [...existingById.values(), ...preview];
    const { representativeRdvs, groupMap, groupSizes } = groupRdvBySlot(combined);

    const previewHighlightIds = new Set<number>();
    representativeRdvs.forEach((rep) => {
      const members = groupMap.get(rep.id) ?? [rep];
      if (members.some((member) => previewIds.has(member.id))) {
        previewHighlightIds.add(rep.id);
      }
    });

    return { representativeRdvs, groupSizes, previewHighlightIds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingStudentQueries, existingProfQuery.data, preview]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Planifier un nouveau rendez-vous</h3>
          <p className="text-sm text-slate-500">Créez une séance ponctuelle ou répétée sur plusieurs semaines.</p>
        </div>
        <RdvForm
          eleves={elevesQuery.data ?? []}
          profs={profsQuery.data ?? []}
          isLoading={createMutation.isPending}
          onValuesChange={buildPreview}
          onSubmit={async (payload) => {
            await createMutation.mutateAsync(payload);
          }}
          onCancel={() => navigate(-1)}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Aperçu visuel</h3>
          <p className="text-sm text-slate-500">
            Affiche les rendez-vous déjà programmés pour les élèves et le professeur sélectionnés, ainsi que le nouveau rendez-vous en aperçu (encadré en vert, « Nouveau »).
          </p>
        </div>
        <WeekCalendar
          rdv={calendarRdvs}
          week={previewWeek}
          year={previewYear}
          showWeekNav={false}
          groupSizes={calendarGroupSizes}
          previewIds={previewHighlightIds}
        />
      </div>
    </div>
  );
}
