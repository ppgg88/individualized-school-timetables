import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createRdv, getEleves, getProfs, getRdvProf, getErrorMessage } from '../api';
import { GroupRdvEditModal } from '../components/calendar/GroupRdvEditModal';
import { RdvForm } from '../components/calendar/RdvForm';
import { WeekCalendar } from '../components/calendar/WeekCalendar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';
import { groupRdvBySlot } from '../utils/rdvGroup';
import type { Rdv, RdvPayload } from '../types';

export default function TeacherSchedule() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { week, year, nextWeek, prevWeek } = useWeek();
  const [selectedGroup, setSelectedGroup] = useState<Rdv[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });

  const selectedProfId = useMemo(() => Number(id ?? profsQuery.data?.[0]?.id ?? 0), [id, profsQuery.data]);
  const rdvQuery = useQuery({
    queryKey: ['rdv-prof', selectedProfId, week, year],
    queryFn: () => getRdvProf(selectedProfId, week, year),
    enabled: Boolean(selectedProfId),
  });

  // Regrouper les RDVs par créneau (affichage joint quand plusieurs élèves partagent le même cours)
  const { representativeRdvs, groupMap, groupSizes } = useMemo(() => groupRdvBySlot(rdvQuery.data ?? []), [rdvQuery.data]);

  const handleRdvClick = (rdv: Rdv) => {
    setSelectedGroup(groupMap.get(rdv.id) ?? [rdv]);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rdv-prof', selectedProfId, week, year] });
    queryClient.invalidateQueries({ queryKey: ['rdv-general', week, year] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: RdvPayload) => createRdv(payload),
    onSuccess: () => {
      pushToast({ title: 'Rendez-vous créé', variant: 'success' });
      setCreateOpen(false);
      refresh();
    },
    onError: (error) => pushToast({ title: 'Création impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 lg:min-w-[340px] lg:grid-cols-1">
          <Select
            label="Choisir un professeur"
            value={selectedProfId || ''}
            onChange={(event) => navigate(`/edt/prof/${event.target.value}${location.search}`)}
            options={(profsQuery.data ?? []).map((prof) => ({ value: prof.id, label: `${prof.nom} ${prof.prenom}` }))}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedProfId ? (
            <a href={`/prof/${selectedProfId}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>
                Vue formateur
              </Button>
            </a>
          ) : null}
          <Button variant="secondary" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Nouveau RDV</Button>
          <Link to="/rdv/nouveau"><Button>Planification avancée</Button></Link>
        </div>
      </div>

      <WeekCalendar
        rdv={representativeRdvs}
        onRdvClick={handleRdvClick}
        week={week}
        year={year}
        onNextWeek={nextWeek}
        onPrevWeek={prevWeek}
        groupSizes={groupSizes}
      />

      <Modal open={createOpen} title="Créer un rendez-vous" onClose={() => setCreateOpen(false)}>
        <RdvForm
          eleves={elevesQuery.data ?? []}
          profs={profsQuery.data ?? []}
          isLoading={createMutation.isPending}
          initialValues={selectedProfId ? { id_proph: selectedProfId } : undefined}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (payload) => {
            await createMutation.mutateAsync({ ...payload, id_proph: payload.id_proph ?? selectedProfId });
          }}
        />
      </Modal>

      <GroupRdvEditModal
        group={selectedGroup}
        eleves={elevesQuery.data ?? []}
        profs={profsQuery.data ?? []}
        onClose={() => setSelectedGroup(null)}
        invalidateKeys={[['rdv-prof', selectedProfId, week, year], ['rdv-general']]}
      />
    </div>
  );
}
