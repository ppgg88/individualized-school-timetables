import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Eleve } from '../../types';

interface Props {
  eleves: Eleve[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

function matches(eleve: Eleve, query: string) {
  const haystack = `${eleve.nom} ${eleve.prenom} ${eleve.classe ?? ''}`.toLowerCase();
  return haystack.includes(query);
}

/**
 * Sélecteur multiple d'élèves : coche/décoche au simple clic (pas de Ctrl/Cmd requis),
 * avec un champ de recherche pour rester utilisable quand la liste est longue.
 */
export function EleveMultiSelect({ eleves, selectedIds, onChange, error }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? eleves.filter((eleve) => matches(eleve, query)) : eleves;
  }, [eleves, search]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedStudents = useMemo(
    () => eleves.filter((eleve) => selectedSet.has(eleve.id)),
    [eleves, selectedSet],
  );

  const toggle = (id: number) => {
    onChange(selectedSet.has(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]);
  };

  const remove = (id: number) => onChange(selectedIds.filter((existing) => existing !== id));

  return (
    <div className="space-y-2">
      <div className={`overflow-hidden rounded-2xl border bg-white ${error ? 'border-rose-300' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un élève…"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex-shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 transition hover:text-slate-600"
            >
              Tout désélectionner
            </button>
          )}
        </div>

        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Aucun élève trouvé.</p>
          ) : (
            filtered.map((eleve) => {
              const isSelected = selectedSet.has(eleve.id);
              return (
                <button
                  key={eleve.id}
                  type="button"
                  onClick={() => toggle(eleve.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-gray-50" />}
                  </span>
                  <span className="truncate">
                    {eleve.nom} {eleve.prenom}
                    {eleve.classe ? <span className="text-slate-400"> · {eleve.classe}</span> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedStudents.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStudents.map((eleve) => (
            <span
              key={eleve.id}
              className="flex items-center gap-1 rounded-full bg-blue-100 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            >
              {eleve.prenom} {eleve.nom}
              <button
                type="button"
                onClick={() => remove(eleve.id)}
                className="rounded-full p-0.5 transition hover:bg-blue-200 dark:hover:bg-blue-800"
                aria-label={`Retirer ${eleve.prenom} ${eleve.nom}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
