import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, LogOut, Mail, Moon, Send, Sun } from 'lucide-react';
import {
  getEleves,
  getErrorMessage,
  getProfs,
  sendAllElevesMail,
  sendAllProfsMail,
  sendEleveMail,
  sendProfMail,
  type SendMailResult,
} from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/ToastProvider';
import { useTheme } from '../context/ThemeContext';
import { mailResultToastTitle } from '../utils/mail';

export default function Settings() {
  const { pushToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [adminKey, setAdminKey] = useState('');
  const [sendingEleveId, setSendingEleveId] = useState<number | null>(null);
  const [sendingProfId, setSendingProfId] = useState<number | null>(null);
  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });

  const onMailSuccess = (result: SendMailResult) =>
    pushToast({ title: mailResultToastTitle(result), variant: result.failed.length ? 'error' : 'success' });
  const onMailError = (error: unknown) =>
    pushToast({ title: 'Envoi impossible', description: getErrorMessage(error), variant: 'error' });

  const sendEleveMailMutation = useMutation({
    mutationFn: sendEleveMail,
    onSuccess: onMailSuccess,
    onError: onMailError,
    onSettled: () => setSendingEleveId(null),
  });
  const sendAllElevesMailMutation = useMutation({
    mutationFn: sendAllElevesMail,
    onSuccess: onMailSuccess,
    onError: onMailError,
  });
  const sendProfMailMutation = useMutation({
    mutationFn: sendProfMail,
    onSuccess: onMailSuccess,
    onError: onMailError,
    onSettled: () => setSendingProfId(null),
  });
  const sendAllProfsMailMutation = useMutation({
    mutationFn: sendAllProfsMail,
    onSuccess: onMailSuccess,
    onError: onMailError,
  });

  useEffect(() => {
    setAdminKey(window.localStorage.getItem('edt-admin-key') ?? '');
  }, []);

  const origin = window.location.origin;
  const adminLink = adminKey ? `${origin}/?key=${encodeURIComponent(adminKey)}` : null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      pushToast({ title: `${label} copié`, variant: 'success' });
    });
  };

  const handleLogout = () => {
    if (!window.confirm('Supprimer la clé admin de ce navigateur ? Vous serez redirigé vers la page d\'accès.')) return;
    window.localStorage.removeItem('edt-admin-key');
    window.location.href = '/';
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        {/* Apparence */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Apparence</h3>
          <p className="mt-1 text-sm text-slate-500">
            Choisissez le thème d'affichage. Ce réglage est mémorisé sur ce navigateur.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-4 w-4" />
              Clair
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Moon className="h-4 w-4" />
              Sombre
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Clé administrateur</h3>
            <Button variant="danger" onClick={handleLogout} icon={<LogOut className="h-4 w-4" />}>
              Se déconnecter
            </Button>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            La clé est stockée dans ce navigateur. Sans elle, le panel admin est inaccessible.
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              window.localStorage.setItem('edt-admin-key', adminKey);
              window.dispatchEvent(new Event('storage'));
              pushToast({ title: 'Clé enregistrée', variant: 'success' });
            }}
          >
            <Input
              label="x-admin-key"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="consecteturadipiscingelit"
            />
            <div className="flex justify-end">
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>

          {/* Lien admin avec clé */}
          {adminLink && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="mb-2 text-xs font-semibold text-blue-700 uppercase tracking-wide dark:text-blue-300">Lien d'accès admin</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl bg-white px-3 py-2 text-xs text-slate-700 border border-blue-200 dark:border-blue-800">
                  {adminLink}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(adminLink, 'Lien admin')}
                  className="flex-shrink-0 rounded-xl bg-blue-600 p-2 text-gray-50 transition hover:bg-blue-700"
                  title="Copier le lien"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                Partagez ce lien pour accéder au panel admin depuis n'importe quel navigateur.
              </p>
            </div>
          )}
        </section>

        {/* Vue Vie Scolaire */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">Vue Vie Scolaire</h3>
          <p className="mt-1 text-sm text-slate-500">
            EDT général. Avec la clé VS, la vie scolaire peut déclarer les absences.
          </p>
          <a
            href="/vie-scolaire"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 transition hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            <ExternalLink className="h-4 w-4" />
            {origin}/vie-scolaire — lecture seule
          </a>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-orange-300 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
            <code className="flex-1 truncate text-xs text-slate-700">
              {origin}/vie-scolaire?key=<span className="font-semibold text-orange-700 dark:text-orange-300">VS_KEY</span>
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(`${origin}/vie-scolaire?key=viescolaire`, 'Lien vie scolaire')}
              className="flex-shrink-0 rounded-xl bg-orange-600 p-2 text-gray-50 transition hover:bg-orange-700"
              title="Copier le lien avec clé"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Remplacez <code>VS_KEY</code> par la valeur de <code>VS_KEY</code> dans votre fichier <code>.env</code>.
          </p>
        </section>
      </div>

      <div className="space-y-6">
        {/* Liens élèves */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Liens élèves</h3>
              <p className="mt-1 text-sm text-slate-500">
                Chaque élève accède à son EDT personnel via ce lien (lecture seule).
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={sendAllElevesMailMutation.isPending}
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => sendAllElevesMailMutation.mutate(undefined)}
            >
              Envoyer à tous par mail
            </Button>
          </div>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {(elevesQuery.data ?? []).map((eleve) => (
              <div key={eleve.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-sm font-medium text-slate-800">
                  {eleve.nom} {eleve.prenom}
                  {eleve.classe ? <span className="ml-1.5 text-xs text-slate-500">({eleve.classe})</span> : null}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!eleve.mail || sendingEleveId === eleve.id}
                    onClick={() => {
                      setSendingEleveId(eleve.id);
                      sendEleveMailMutation.mutate(eleve.id);
                    }}
                    title={eleve.mail ? `Envoyer par mail à ${eleve.mail}` : "Aucune adresse mail renseignée"}
                    className="flex items-center gap-1 rounded-xl bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                  >
                    <Mail className="h-3 w-3" />
                  </button>
                  <a
                    href={`/eleve/${eleve.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir
                  </a>
                </div>
              </div>
            ))}
            {elevesQuery.isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
          </div>
        </section>

        {/* Liens profs */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Liens formateurs</h3>
              <p className="mt-1 text-sm text-slate-500">
                Chaque formateur reçoit un lien unique avec sa clé pour déclarer les absences.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={sendAllProfsMailMutation.isPending}
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => sendAllProfsMailMutation.mutate(undefined)}
            >
              Envoyer à tous par mail
            </Button>
          </div>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {(profsQuery.data ?? []).map((prof) => {
              const profLink = prof.token ? `${origin}/prof/${prof.id}?key=${prof.token}` : `${origin}/prof/${prof.id}`;
              return (
                <div key={prof.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      {prof.nom} {prof.prenom}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!prof.mail || sendingProfId === prof.id}
                        onClick={() => {
                          setSendingProfId(prof.id);
                          sendProfMailMutation.mutate(prof.id);
                        }}
                        title={prof.mail ? `Envoyer par mail à ${prof.mail}` : "Aucune adresse mail renseignée"}
                        className="flex items-center gap-1 rounded-xl bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                      >
                        <Mail className="h-3 w-3" />
                      </button>
                      <a
                        href={profLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-900 dark:text-violet-300 dark:hover:bg-violet-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ouvrir
                      </a>
                      {prof.token && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(profLink, `Lien ${prof.prenom} ${prof.nom}`)}
                          className="flex items-center gap-1 rounded-xl bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                          title="Copier le lien avec clé"
                        >
                          <Copy className="h-3 w-3" />
                          Copier le lien
                        </button>
                      )}
                    </div>
                  </div>
                  {prof.token && (
                    <code className="mt-1.5 block truncate rounded-xl bg-white px-2.5 py-1.5 text-xs text-slate-500 border border-slate-200">
                      {profLink}
                    </code>
                  )}
                </div>
              );
            })}
            {profsQuery.isLoading && <p className="text-sm text-slate-400">Chargement…</p>}
          </div>
        </section>
      </div>

      <p className="xl:col-span-2 text-center text-xs text-slate-400">
        Ce site a été développé par Paul Giroux (<a href="mailto:paul.giroux87@gmail.com" className="underline hover:text-slate-600">paul.giroux87@gmail.com</a>) sous licence OpenSource <a href="https://www.gnu.org/licenses/old-licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">GPL-V3</a> pour le service individualisation de l'école de ROVILLE.
      </p>
    </div>
  );
}
