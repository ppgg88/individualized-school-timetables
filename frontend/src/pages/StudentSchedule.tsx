import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { createRdv, getEleves, getProfs, getRdvEleve, getErrorMessage } from '../api';
import { GroupRdvEditModal } from '../components/calendar/GroupRdvEditModal';
import { RdvForm } from '../components/calendar/RdvForm';
import { WeekCalendar } from '../components/calendar/WeekCalendar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';
import type { Rdv, RdvPayload } from '../types';

export default function StudentSchedule() {
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

  const selectedStudentId = useMemo(() => Number(id ?? elevesQuery.data?.[0]?.id ?? 0), [id, elevesQuery.data]);
  const rdvQuery = useQuery({
    queryKey: ['rdv-eleve', selectedStudentId, week, year],
    queryFn: () => getRdvEleve(selectedStudentId, week, year),
    enabled: Boolean(selectedStudentId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rdv-eleve', selectedStudentId, week, year] });
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

  const selectedStudent = elevesQuery.data?.find((eleve) => eleve.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-4 lg:min-w-[340px] lg:grid-cols-1">
          <Select
            label="Choisir un élève"
            value={selectedStudentId || ''}
            onChange={(event) => navigate(`/edt/eleve/${event.target.value}${location.search}`)}
            options={(elevesQuery.data ?? []).map((eleve) => ({ value: eleve.id, label: `${eleve.nom} ${eleve.prenom}${eleve.classe ? ` · ${eleve.classe}` : ''}` }))}
          />
          {selectedStudent ? <p className="text-sm text-slate-500">Classe : {selectedStudent.classe ?? 'Non renseignée'}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedStudentId ? (
            <a href={`/eleve/${selectedStudentId}`} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>
                Vue élève
              </Button>
            </a>
          ) : null}
          <Button variant="secondary" onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>Nouveau RDV</Button>
          <Link to="/rdv/nouveau"><Button>Planification avancée</Button></Link>
        </div>
      </div>

      <WeekCalendar
        rdv={rdvQuery.data ?? []}
        onRdvClick={(rdv) => setSelectedGroup([rdv])}
        week={week}
        year={year}
        onNextWeek={nextWeek}
        onPrevWeek={prevWeek}
      />

      <Modal open={createOpen} title="Créer un rendez-vous" onClose={() => setCreateOpen(false)}>
        <RdvForm
          eleves={elevesQuery.data ?? []}
          profs={profsQuery.data ?? []}
          isLoading={createMutation.isPending}
          initialValues={selectedStudentId ? { id_eleves: selectedStudentId } : undefined}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (payload) => {
            await createMutation.mutateAsync({ ...payload, elevesIds: payload.elevesIds?.length ? payload.elevesIds : [selectedStudentId] });
          }}
        />
      </Modal>

      <GroupRdvEditModal
        group={selectedGroup}
        eleves={elevesQuery.data ?? []}
        profs={profsQuery.data ?? []}
        onClose={() => setSelectedGroup(null)}
        invalidateKeys={[['rdv-eleve', selectedStudentId, week, year], ['rdv-general'], ['rdv-prof']]}
      />
    </div>
  );
}
