import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { exportSuivi, getEleves, getSuiviEleve } from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { RESSENTI_OPTIONS } from '../types';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function SuiviHistorique() {
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('eleve') ? Number(searchParams.get('eleve')) : null;

  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (elevesQuery.data ?? []).filter((eleve) =>
      `${eleve.nom} ${eleve.prenom} ${eleve.classe ?? ''}`.toLowerCase().includes(term),
    );
  }, [elevesQuery.data, search]);

  const selectEleve = (id: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('eleve', String(id));
    setSearchParams(params);
  };
  const clearEleveParam = () => {
    if (!searchParams.get('eleve')) return;
    const params = new URLSearchParams(searchParams);
    params.delete('eleve');
    setSearchParams(params);
  };

  const selectedEleve = elevesQuery.data?.find((eleve) => eleve.id === selectedId);
  const historyQuery = useQuery({
    queryKey: ['suivi-eleve', selectedId],
    queryFn: () => getSuiviEleve(selectedId!),
    enabled: Boolean(selectedId),
  });

  const exportAll = async () => downloadBlob(await exportSuivi(), 'suivi-historique.csv');
  const exportEleve = async () => {
    if (!selectedEleve) return;
    downloadBlob(await exportSuivi({ idEleve: selectedEleve.id }), `suivi-${selectedEleve.nom}-${selectedEleve.prenom}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <Input
            label="Rechercher un élève"
            placeholder="Nom, prénom, classe..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); clearEleveParam(); }}
          />
        </div>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportAll}>
          Exporter tout l’historique
        </Button>
      </div>

      {search.trim() && !selectedEleve ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-slate-400">Aucun élève ne correspond à la recherche.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((eleve) => (
                <li key={eleve.id}>
                  <button
                    type="button"
                    onClick={() => selectEleve(eleve.id)}
                    className="flex w-full items-center gap-2 px-5 py-3.5 text-left transition hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{eleve.nom} {eleve.prenom}</span>
                    {eleve.classe ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{eleve.classe}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {selectedEleve ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div>
              <p className="text-lg font-semibold text-slate-900">{selectedEleve.nom} {selectedEleve.prenom}</p>
              {selectedEleve.classe ? <p className="text-sm text-slate-500">{selectedEleve.classe}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportEleve}>
                Exporter cet élève
              </Button>
              <Button variant="ghost" onClick={() => { clearEleveParam(); setSearch(''); }}>Nouvelle recherche</Button>
            </div>
          </div>

          {historyQuery.isLoading ? (
            <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-soft">Chargement…</p>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <p className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-soft">
              Aucun suivi enregistré pour cet élève.
            </p>
          ) : (
            <div className="space-y-3">
              {(historyQuery.data ?? []).map((suivi) => {
                const ressentiOption = RESSENTI_OPTIONS.find((option) => option.value === suivi.ressenti);
                return (
                  <div key={suivi.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">Semaine {suivi.semaine} · {suivi.annee}</p>
                      {ressentiOption ? <span title={ressentiOption.label} className="text-lg">{ressentiOption.emoji}</span> : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{suivi.contenu}</p>
                    <p className="mt-2 text-xs text-slate-400">Modifié le {format(parseISO(suivi.updatedAt), 'dd/MM/yyyy à HH:mm')}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
