import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Download, FileUp, History, UploadCloud } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { exportCsv, exportSuivi, getImportHistory, importCsv } from '../api';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/ToastProvider';
import { useWeek } from '../hooks/useWeek';

/** Année de fin de l'année scolaire en cours (l'année scolaire va d'août N-1 à août N) */
function currentSchoolYearEnd(date = new Date()) {
  return date.getMonth() + 1 >= 8 ? date.getFullYear() + 1 : date.getFullYear();
}

type ExportMode = 'semaine' | 'annee';

export default function ImportExport() {
  const { week, year } = useWeek();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [exportMode, setExportMode] = useState<ExportMode>('semaine');
  const [schoolYearEnd, setSchoolYearEnd] = useState(() => currentSchoolYearEnd());
  const [suiviYearEnd, setSuiviYearEnd] = useState(() => currentSchoolYearEnd());

  const schoolYearOptions = useMemo(() => {
    const base = currentSchoolYearEnd();
    return Array.from({ length: 5 }, (_, i) => base + 1 - i).map((end) => ({
      value: end,
      label: `${end - 1}-${end}`,
    }));
  }, []);

  const historyQuery = useQuery({ queryKey: ['imports-history'], queryFn: getImportHistory });

  const importMutation = useMutation({
    mutationFn: importCsv,
    onSuccess: () => {
      pushToast({ title: 'Import terminé', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['imports-history'] });
      queryClient.invalidateQueries({ queryKey: ['eleves'] });
      queryClient.invalidateQueries({ queryKey: ['profs'] });
      queryClient.invalidateQueries({ queryKey: ['rdv-general'] });
    },
    onError: () => pushToast({ title: 'Import impossible', description: 'Vérifiez le format CSV et la clé admin.', variant: 'error' }),
  });

  const exportMutation = useMutation({
    mutationFn: () => (exportMode === 'annee' ? exportCsv({ anneeScolaire: schoolYearEnd }) : exportCsv({ semaine: week, year })),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportMode === 'annee' ? `edt-annee-${schoolYearEnd - 1}-${schoolYearEnd}.csv` : `edt-semaine-${week}-${year}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      pushToast({ title: 'Export lancé', variant: 'success' });
    },
    onError: () => pushToast({ title: 'Export impossible', variant: 'error' }),
  });

  const exportSuiviMutation = useMutation({
    mutationFn: () => exportSuivi({ anneeScolaire: suiviYearEnd }),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `suivi-annee-${suiviYearEnd - 1}-${suiviYearEnd}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      pushToast({ title: 'Export lancé', variant: 'success' });
    },
    onError: () => pushToast({ title: 'Export impossible', variant: 'error' }),
  });

  const handleFile = (file?: File | null) => {
    if (!file) {
      return;
    }
    importMutation.mutate(file);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><UploadCloud className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Importer un fichier CSV</h3>
              <p className="text-sm text-slate-500">Glissez-déposez un export existant ou sélectionnez un fichier.</p>
            </div>
          </div>
          <div
            className={`mt-6 rounded-3xl border-2 border-dashed p-10 text-center transition ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <FileUp className="mx-auto h-10 w-10 text-blue-500" />
            <p className="mt-4 font-medium text-slate-900">Déposez votre CSV ici</p>
            <p className="mt-2 text-sm text-slate-500">Colonnes conseillées : élève, professeur, date, durée, lieu, couleur, absence.</p>
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="secondary" loading={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
                Sélectionner un fichier
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><Download className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Exporter l'emploi du temps</h3>
              <p className="text-sm text-slate-500">Téléchargez les rendez-vous au format CSV.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setExportMode('semaine')}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                exportMode === 'semaine'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Semaine en cours
            </button>
            <button
              type="button"
              onClick={() => setExportMode('annee')}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                exportMode === 'annee'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Année scolaire
            </button>
          </div>

          {exportMode === 'annee' && (
            <div className="mt-4">
              <Select
                label="Année scolaire"
                value={schoolYearEnd}
                onChange={(event) => setSchoolYearEnd(Number(event.target.value))}
                options={schoolYearOptions}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-medium text-slate-900">Période sélectionnée</p>
              <p className="text-sm text-slate-500">
                {exportMode === 'annee'
                  ? `Du 01-08-${schoolYearEnd - 1} au 01-08-${schoolYearEnd}`
                  : `Semaine ${week} · année ${year}`}
              </p>
            </div>
            <Button loading={exportMutation.isPending} icon={<Download className="h-4 w-4" />} onClick={() => exportMutation.mutate()}>
              Télécharger le CSV
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-600"><ClipboardList className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Exporter le suivi hebdomadaire</h3>
              <p className="text-sm text-slate-500">Téléchargez tout le suivi des élèves d’une année scolaire au format CSV.</p>
            </div>
          </div>

          <div className="mt-4">
            <Select
              label="Année scolaire"
              value={suiviYearEnd}
              onChange={(event) => setSuiviYearEnd(Number(event.target.value))}
              options={schoolYearOptions}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-medium text-slate-900">Période sélectionnée</p>
              <p className="text-sm text-slate-500">Du 01-08-{suiviYearEnd - 1} au 01-08-{suiviYearEnd}</p>
            </div>
            <Button loading={exportSuiviMutation.isPending} icon={<Download className="h-4 w-4" />} onClick={() => exportSuiviMutation.mutate()}>
              Télécharger le CSV
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-50 p-3 text-violet-600"><History className="h-5 w-5" /></div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Historique des imports</h3>
            <p className="text-sm text-slate-500">Retrouvez les derniers fichiers intégrés.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {(historyQuery.data ?? []).length ? (
            historyQuery.data?.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-medium text-slate-900">{item.nom}</p>
                <p className="mt-1 text-sm text-slate-500">{new Date(item.date).toLocaleString('fr-FR')}</p>
                <p className="mt-2 text-sm text-slate-600">{item.rdvCount ?? 0} rendez-vous associés</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucun import réalisé pour le moment.</div>
          )}
        </div>
      </section>
    </div>
  );
}
