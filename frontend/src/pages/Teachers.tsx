import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Link2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createProf, deleteProf, getProfs, regenerateProfToken, updateProf, getErrorMessage } from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/ToastProvider';
import type { Prof } from '../types';

const emptyTeacher: Partial<Prof> = { nom: '', prenom: '', mail: '' };

export default function Teachers() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Prof> | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Prof | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<Prof | null>(null);

  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });
  const origin = window.location.origin;

  const filtered = useMemo(
    () =>
      (profsQuery.data ?? []).filter((prof) => `${prof.nom} ${prof.prenom} ${prof.mail ?? ''}`.toLowerCase().includes(search.toLowerCase())),
    [profsQuery.data, search],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['profs'] });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Prof>) => (payload.id ? updateProf(payload.id, payload) : createProf(payload)),
    onSuccess: () => {
      pushToast({ title: 'Professeur enregistré', variant: 'success' });
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Enregistrement impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProf,
    onSuccess: () => {
      pushToast({ title: 'Professeur supprimé', variant: 'success' });
      setConfirmDelete(null);
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Suppression impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateProfToken,
    onSuccess: (updated) => {
      pushToast({
        title: 'Clé régénérée',
        description: `${updated.prenom} ${updated.nom} — l'ancien lien ne fonctionne plus.`,
        variant: 'success',
      });
      setConfirmRegenerate(null);
      setEditing((current) => (current?.id === updated.id ? updated : current));
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Régénération impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const copyLink = (prof: Prof) => {
    const url = prof.token
      ? `${origin}/prof/${prof.id}?key=${prof.token}`
      : `${origin}/prof/${prof.id}`;
    navigator.clipboard.writeText(url).then(() =>
      pushToast({
        title: 'Lien copié',
        description: `${prof.prenom} ${prof.nom}${prof.token ? ' (avec clé)' : ''}`,
        variant: 'success',
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre de recherche + ajout */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <Input label="Rechercher un formateur" placeholder="Nom, prénom, mail..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtered.length} formateur{filtered.length !== 1 ? 's' : ''}</span>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditing({ ...emptyTeacher }); setOpen(true); }}
          >
            Ajouter un formateur
          </Button>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nom</th>
                <th className="px-5 py-3 font-semibold">Prénom</th>
                <th className="px-5 py-3 font-semibold">Mail</th>
                <th className="px-5 py-3 font-semibold">Clé d'accès</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    {search ? 'Aucun formateur ne correspond à la recherche.' : 'Aucun formateur enregistré.'}
                  </td>
                </tr>
              )}
              {filtered.map((prof) => (
                <tr key={prof.id} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{prof.nom}</td>
                  <td className="px-5 py-3.5 text-slate-700">{prof.prenom}</td>
                  <td className="px-5 py-3.5 text-slate-500">{prof.mail ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {prof.token ? (
                      <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 font-mono">
                        {prof.token.slice(0, 12)}…
                      </code>
                    ) : (
                      <span className="text-xs text-amber-600">Aucune clé</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      {/* Copier le lien avec token */}
                      <button
                        type="button"
                        onClick={() => copyLink(prof)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                        title={prof.token ? 'Copier le lien avec clé' : 'Copier le lien (sans clé)'}
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      {/* Ouvrir la vue prof */}
                      <a
                        href={prof.token ? `/prof/${prof.id}?key=${prof.token}` : `/prof/${prof.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600"
                        title="Ouvrir la vue formateur"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {/* Régénérer la clé d'accès */}
                      <button
                        type="button"
                        onClick={() => setConfirmRegenerate(prof)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                        title="Régénérer la clé d'accès"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      {/* Modifier */}
                      <button
                        type="button"
                        onClick={() => { setEditing(prof); setOpen(true); }}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(prof)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ajout / édition */}
      <Modal open={open} title={editing?.id ? 'Modifier un formateur' : 'Ajouter un formateur'} onClose={() => setOpen(false)}>
        {editing ? (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(editing); }}
          >
            <Input label="Nom *" value={editing.nom ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, nom: e.target.value }))} required />
            <Input label="Prénom *" value={editing.prenom ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, prenom: e.target.value }))} required />
            <div className="sm:col-span-2">
              <Input label="Mail" type="email" value={editing.mail ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, mail: e.target.value }))} />
            </div>
            {editing.id && editing.token && (
              <div className="sm:col-span-2 rounded-2xl border border-violet-100 bg-violet-50 p-3">
                <p className="text-xs font-semibold text-violet-700 mb-1">Lien d'accès personnalisé</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-white px-2.5 py-1.5 text-xs text-slate-600 border border-violet-200">
                    {origin}/prof/{editing.id}?key={editing.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyLink(editing as Prof)}
                    className="flex-shrink-0 rounded-xl bg-violet-600 p-2 text-gray-50 hover:bg-violet-700"
                    title="Copier le lien"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRegenerate(editing as Prof)}
                    className="flex-shrink-0 rounded-xl bg-amber-500 p-2 text-gray-50 hover:bg-amber-600"
                    title="Régénérer la clé d'accès"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal open={Boolean(confirmDelete)} title="Confirmer la suppression" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Supprimer <strong>{confirmDelete.prenom} {confirmDelete.nom}</strong> ?
              Ses rendez-vous garderont une référence orpheline.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Annuler</Button>
              <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirmDelete.id)}>
                Supprimer définitivement
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmation régénération de clé */}
      <Modal open={Boolean(confirmRegenerate)} title="Régénérer la clé d'accès" onClose={() => setConfirmRegenerate(null)}>
        {confirmRegenerate && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Régénérer la clé de <strong>{confirmRegenerate.prenom} {confirmRegenerate.nom}</strong> ?
              L'ancien lien cessera de fonctionner immédiatement ; un nouveau lien devra lui être communiqué.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmRegenerate(null)}>Annuler</Button>
              <Button variant="danger" loading={regenerateMutation.isPending} onClick={() => regenerateMutation.mutate(confirmRegenerate.id)}>
                Régénérer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
