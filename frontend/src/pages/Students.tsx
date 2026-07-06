import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Link2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createEleve, deleteEleve, getEleves, regenerateEleveToken, updateEleve, getErrorMessage } from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/ToastProvider';
import type { Eleve } from '../types';

const emptyStudent: Partial<Eleve> = { nom: '', prenom: '', mail: '', classe: '' };

export default function Students() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Eleve> | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Eleve | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<Eleve | null>(null);

  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const origin = window.location.origin;

  const filtered = useMemo(
    () =>
      (elevesQuery.data ?? []).filter((eleve) =>
        `${eleve.nom} ${eleve.prenom} ${eleve.classe ?? ''} ${eleve.mail ?? ''}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [elevesQuery.data, search],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['eleves'] });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Eleve>) => (payload.id ? updateEleve(payload.id, payload) : createEleve(payload)),
    onSuccess: () => {
      pushToast({ title: 'Élève enregistré', variant: 'success' });
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Enregistrement impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEleve,
    onSuccess: () => {
      pushToast({ title: 'Élève supprimé', variant: 'success' });
      setConfirmDelete(null);
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Suppression impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateEleveToken,
    onSuccess: (updated) => {
      pushToast({
        title: 'Clé régénérée',
        description: `${updated.prenom} ${updated.nom} — l'ancien lien/QR code ne fonctionne plus.`,
        variant: 'success',
      });
      setConfirmRegenerate(null);
      setEditing((current) => (current?.id === updated.id ? updated : current));
      invalidate();
    },
    onError: (error) => pushToast({ title: 'Régénération impossible', description: getErrorMessage(error), variant: 'error' }),
  });

  const copyLink = (eleve: Eleve) => {
    const url = eleve.token
      ? `${origin}/eleve/${eleve.id}?key=${eleve.token}`
      : `${origin}/eleve/${eleve.id}`;
    navigator.clipboard.writeText(url).then(() =>
      pushToast({
        title: 'Lien copié',
        description: `${eleve.prenom} ${eleve.nom}${eleve.token ? ' (avec clé)' : ''}`,
        variant: 'success',
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre de recherche + ajout */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <Input label="Rechercher un élève" placeholder="Nom, prénom, classe, mail..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtered.length} élève{filtered.length !== 1 ? 's' : ''}</span>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditing({ ...emptyStudent }); setOpen(true); }}
          >
            Ajouter un élève
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
                <th className="px-5 py-3 font-semibold">Classe</th>
                <th className="px-5 py-3 font-semibold">Mail</th>
                <th className="px-5 py-3 font-semibold">Clé d'accès</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    {search ? 'Aucun élève ne correspond à la recherche.' : 'Aucun élève enregistré.'}
                  </td>
                </tr>
              )}
              {filtered.map((eleve) => (
                <tr key={eleve.id} className="group hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{eleve.nom}</td>
                  <td className="px-5 py-3.5 text-slate-700">{eleve.prenom}</td>
                  <td className="px-5 py-3.5">
                    {eleve.classe
                      ? <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{eleve.classe}</span>
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{eleve.mail ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {eleve.token ? (
                      <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 font-mono">
                        {eleve.token.slice(0, 12)}…
                      </code>
                    ) : (
                      <span className="text-xs text-amber-600">Aucune clé</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      {/* Copier le lien */}
                      <button
                        type="button"
                        onClick={() => copyLink(eleve)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title={`Copier le lien de ${eleve.prenom} ${eleve.nom}`}
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      {/* Ouvrir la vue élève */}
                      <a
                        href={eleve.token ? `/eleve/${eleve.id}?key=${eleve.token}` : `/eleve/${eleve.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                        title="Ouvrir la vue élève"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {/* Régénérer la clé d'accès */}
                      <button
                        type="button"
                        onClick={() => setConfirmRegenerate(eleve)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                        title="Régénérer la clé d'accès"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      {/* Modifier */}
                      <button
                        type="button"
                        onClick={() => { setEditing(eleve); setOpen(true); }}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(eleve)}
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
      <Modal open={open} title={editing?.id ? 'Modifier un élève' : 'Ajouter un élève'} onClose={() => setOpen(false)}>
        {editing ? (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(editing); }}
          >
            <Input label="Nom *" value={editing.nom ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, nom: e.target.value }))} required />
            <Input label="Prénom *" value={editing.prenom ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, prenom: e.target.value }))} required />
            <Input label="Classe" value={editing.classe ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, classe: e.target.value }))} placeholder="BTS APV 1" />
            <Input label="Mail" type="email" value={editing.mail ?? ''} onChange={(e) => setEditing((c) => ({ ...c!, mail: e.target.value }))} />
            {editing.id && editing.token && (
              <div className="sm:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Lien d'accès personnalisé</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-xl bg-white px-2.5 py-1.5 text-xs text-slate-600 border border-emerald-200">
                    {origin}/eleve/{editing.id}?key={editing.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyLink(editing as Eleve)}
                    className="flex-shrink-0 rounded-xl bg-emerald-600 p-2 text-gray-50 hover:bg-emerald-700"
                    title="Copier le lien"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRegenerate(editing as Eleve)}
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
              Tous ses rendez-vous seront également supprimés.
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
              L'ancien lien/QR code cessera de fonctionner immédiatement ; un nouveau lien devra lui être communiqué.
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
