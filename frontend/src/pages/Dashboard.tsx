import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarPlus, CalendarRange, Mail, UploadCloud, Users2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { getEleves, getErrorMessage, getProfs, getRdvGeneral, sendAllElevesMail, sendAllProfsMail } from '../api';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';
import { mailResultToastTitle } from '../utils/mail';

export default function Dashboard() {
  const { week, year } = useWeek();
  const { pushToast } = useToast();
  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });
  const rdvQuery = useQuery({ queryKey: ['rdv-general', week, year], queryFn: () => getRdvGeneral(week, year) });

  const recentAppointments = (rdvQuery.data ?? []).slice(0, 5);

  const onMailSuccess = (result: Awaited<ReturnType<typeof sendAllElevesMail>>) =>
    pushToast({ title: mailResultToastTitle(result), variant: result.failed.length ? 'error' : 'success' });
  const onMailError = (error: unknown) =>
    pushToast({ title: 'Envoi impossible', description: getErrorMessage(error), variant: 'error' });

  const sendAllElevesMailMutation = useMutation({ mutationFn: sendAllElevesMail, onSuccess: onMailSuccess, onError: onMailError });
  const sendAllProfsMailMutation = useMutation({ mutationFn: sendAllProfsMail, onSuccess: onMailSuccess, onError: onMailError });

  return (
    <div className="space-y-6">
      {/* Couleurs fixes (gray-*) sur le dégradé : indépendant du thème */}
      <section className="rounded-3xl bg-gradient-to-r from-blue-600 to-sky-500 p-6 text-gray-50 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Semaine {week}</p>
            <h3 className="mt-2 text-3xl font-bold">Emploi du temps d'individualisation - Ecole de ROVILLE</h3>
            <p className="mt-3 max-w-2xl text-sm text-blue-50">
              Visualisez les rendez-vous, suivez les absences et centralisez les imports CSV dans une interface claire et réactive.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/rdv/nouveau"><Button size="lg" variant="secondary" icon={<CalendarPlus className="h-4 w-4" />}>Nouveau RDV</Button></Link>
            <Link to="/edt/general"><Button size="lg" variant="ghost" className="bg-gray-50/10 text-gray-50 hover:bg-gray-50/20" icon={<CalendarRange className="h-4 w-4" />}>Voir l’EDT</Button></Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Élèves', value: elevesQuery.data?.length ?? 0, icon: Users2, color: 'from-blue-500 to-cyan-500', to: '/eleves' },
          { label: 'Professeurs', value: profsQuery.data?.length ?? 0, icon: Users2, color: 'from-violet-500 to-fuchsia-500', to: '/profs' },
          { label: 'RDV cette semaine', value: rdvQuery.data?.length ?? 0, icon: CalendarRange, color: 'from-emerald-500 to-lime-500', to: undefined },
        ].map((item) => {
          const content = (
            <>
              <div className={`inline-flex rounded-2xl bg-gradient-to-r ${item.color} p-3 text-gray-50`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{item.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{item.value}</p>
            </>
          );

          return item.to ? (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-blue-200 hover:shadow-md"
            >
              {content}
            </Link>
          ) : (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
              {content}
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Rendez-vous récents</h3>
              <p className="text-sm text-slate-500">Vue rapide des prochaines séances de la semaine.</p>
            </div>
            <Link to="/edt/general" className="text-sm font-medium text-blue-600 hover:text-blue-700">Ouvrir l’EDT</Link>
          </div>

          <div className="mt-5 space-y-3">
            {recentAppointments.length ? recentAppointments.map((rdv) => (
              <div key={rdv.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4">
                <div className="h-12 w-2 rounded-full" style={{ backgroundColor: rdv.couleur }} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{rdv.nom}</p>
                  <p className="text-sm text-slate-500">{rdv.eleves?.prenom} {rdv.eleves?.nom} · {rdv.lieu}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{format(parseISO(rdv.date), 'dd/MM')}</p>
                  <p>{format(parseISO(rdv.date), 'HH:mm')}</p>
                </div>
              </div>
            )) : <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucun rendez-vous prévu cette semaine.</p>}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Actions rapides</h3>
          <p className="text-sm text-slate-500">Accédez directement aux opérations courantes.</p>
          <div className="mt-5 space-y-3">
            <Link to="/rdv/nouveau" className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50">
              <div>
                <p className="font-medium text-slate-900">Créer un nouveau RDV</p>
                <p className="text-sm text-slate-500">Planification manuelle d’une séance.</p>
              </div>
              <CalendarPlus className="h-5 w-5 text-blue-500" />
            </Link>
            <Link to="/edt/general" className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50">
              <div>
                <p className="font-medium text-slate-900">Consulter l’EDT général</p>
                <p className="text-sm text-slate-500">Vue globale des rendez-vous par élève.</p>
              </div>
              <CalendarRange className="h-5 w-5 text-blue-500" />
            </Link>
            <Link to="/import-export" className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50">
              <div>
                <p className="font-medium text-slate-900">Importer un CSV</p>
                <p className="text-sm text-slate-500">Injectez rapidement un planning existant.</p>
              </div>
              <UploadCloud className="h-5 w-5 text-blue-500" />
            </Link>
            <button
              type="button"
              disabled={sendAllElevesMailMutation.isPending}
              onClick={() => sendAllElevesMailMutation.mutate({ semaine: week, year })}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-medium text-slate-900">Envoyer l’EDT aux élèves de la semaine {week}</p>
                <p className="text-sm text-slate-500">Un email aux élèves ayant au moins un RDV cette semaine.</p>
              </div>
              <Mail className="h-5 w-5 text-blue-500" />
            </button>
            <button
              type="button"
              disabled={sendAllProfsMailMutation.isPending}
              onClick={() => sendAllProfsMailMutation.mutate({ semaine: week, year })}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-medium text-slate-900">Envoyer l’EDT aux formateurs de la semaine {week}</p>
                <p className="text-sm text-slate-500">Un email aux formateurs ayant au moins un RDV cette semaine.</p>
              </div>
              <Mail className="h-5 w-5 text-blue-500" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
