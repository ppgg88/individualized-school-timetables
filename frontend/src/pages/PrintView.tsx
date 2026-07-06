import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, GraduationCap, Printer, QrCode, Users } from 'lucide-react';
import { useState } from 'react';
import { getEleves, getProfs, getRdvEleve, getRdvProf } from '../api';
import { PrintFicheSuivi } from '../components/print/PrintFicheSuivi';
import { PrintSchedule } from '../components/print/PrintSchedule';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { useWeek } from '../hooks/useWeek';
import type { Eleve, Prof } from '../types';

type PrintFor = 'eleve' | 'prof';

export default function PrintView() {
  const { week, year, weekLabel, nextWeek, prevWeek } = useWeek();
  const [showQR, setShowQR] = useState(true);
  const [printFor, setPrintFor] = useState<PrintFor>('eleve');
  const [printMode, setPrintMode] = useState<'edt' | 'fiche' | 'both'>('both');
  const [selectedId, setSelectedId] = useState<number | 'all'>('all');

  const elevesQuery = useQuery({ queryKey: ['eleves'], queryFn: getEleves });
  const profsQuery = useQuery({ queryKey: ['profs'], queryFn: getProfs });
  const entities: (Eleve | Prof)[] = printFor === 'eleve' ? elevesQuery.data ?? [] : profsQuery.data ?? [];

  // La fiche de suivi n'a de sens que pour les élèves
  const effectivePrintMode = printFor === 'prof' ? 'edt' : printMode;

  const selectPrintFor = (next: PrintFor) => {
    setPrintFor(next);
    setSelectedId('all');
  };

  // Charger les RDV de tous les élèves/formateurs en parallèle
  const rdvQueries = useQueries({
    queries: entities.map((entity) => ({
      queryKey: [printFor === 'eleve' ? 'rdv-eleve' : 'rdv-prof', entity.id, week, year],
      queryFn: () => (printFor === 'eleve' ? getRdvEleve(entity.id, week, year) : getRdvProf(entity.id, week, year)),
      enabled: entities.length > 0,
    })),
  });

  const isLoading = (printFor === 'eleve' ? elevesQuery.isLoading : profsQuery.isLoading) || rdvQueries.some((q) => q.isLoading);

  // Élèves/formateurs ayant des RDV cette semaine
  const entitiesWithRdv = entities
    .map((entity, idx) => ({ entity, rdvList: rdvQueries[idx]?.data ?? [] }))
    .filter(({ rdvList }) => rdvList.length > 0)
    .filter(({ entity }) => selectedId === 'all' || entity.id === selectedId);

  const entityWord = printFor === 'eleve' ? 'élève' : 'formateur';

  return (
    <>
      {/* Barre de contrôle — masquée à l'impression */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Impression — Semaine {week}</h3>
            <p className="text-sm text-slate-500">
              {isLoading ? 'Chargement…' : `${entitiesWithRdv.length} ${entityWord}(s) avec des RDV cette semaine`}
            </p>
          </div>

          {/* Navigation semaine */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <button
              type="button"
              onClick={prevWeek}
              className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              title="Semaine précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-semibold text-slate-700">
              S{week} · {weekLabel}
            </span>
            <button
              type="button"
              onClick={nextWeek}
              className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              title="Semaine suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={showQR ? 'primary' : 'secondary'}
              onClick={() => setShowQR(!showQR)}
              icon={<QrCode className="h-4 w-4" />}
            >
              QR codes {showQR ? 'activés' : 'désactivés'}
            </Button>
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              Imprimer
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          {/* Élèves vs Formateurs */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Imprimer l'EDT de</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectPrintFor('eleve')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  printFor === 'eleve'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                Élèves
              </button>
              <button
                type="button"
                onClick={() => selectPrintFor('prof')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  printFor === 'prof'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="h-4 w-4" />
                Formateurs
              </button>
            </div>
          </div>

          {/* Sélection de l'élève / du formateur */}
          <div className="min-w-[220px]">
            <Select
              label={printFor === 'eleve' ? 'Élève' : 'Formateur'}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              options={[
                { value: 'all', label: printFor === 'eleve' ? 'Tous les élèves' : 'Tous les formateurs' },
                ...entities.map((entity) => ({
                  value: entity.id,
                  label:
                    printFor === 'eleve'
                      ? `${entity.nom} ${entity.prenom}${(entity as Eleve).classe ? ` · ${(entity as Eleve).classe}` : ''}`
                      : `${entity.nom} ${entity.prenom}`,
                })),
              ]}
            />
          </div>

          {/* Mode d'impression (élèves uniquement : la fiche de suivi n'existe pas pour les formateurs) */}
          {printFor === 'eleve' && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">Contenu à imprimer</span>
              <div className="flex gap-2">
                {([
                  { value: 'both', label: 'EDT + Fiche de suivi' },
                  { value: 'edt', label: 'EDT uniquement' },
                  { value: 'fiche', label: 'Fiche de suivi uniquement' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPrintMode(opt.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      printMode === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Légende des couleurs */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="mb-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Légende</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'CDR', color: '#9BD9EE' },
              { label: 'Pépinière', color: '#7CCB06' },
              { label: 'Serres', color: '#ADFF2F' },
              { label: 'Individualisation', color: '#DF9FDF' },
              { label: 'Cours prof', color: '#DBE2D0' },
              { label: 'Arexhor', color: '#F3E768' },
              { label: 'À confirmer', color: '#FD9BAA' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 rounded-xl border border-slate-100 px-2.5 py-1.5">
                <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-xs font-medium text-slate-700">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone d'impression */}
      <div id="print-area">
        {isLoading ? (
          <div className="no-print rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            Chargement des emplois du temps…
          </div>
        ) : entitiesWithRdv.length === 0 ? (
          <div className="no-print rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            Aucun {entityWord} avec des rendez-vous pour la semaine {week}.
          </div>
        ) : (
          entitiesWithRdv.map(({ entity, rdvList }, idx) => (
            <div key={entity.id}>
              {/* Page EDT */}
              {(effectivePrintMode === 'edt' || effectivePrintMode === 'both') && (
                <PrintSchedule
                  entity={entity}
                  entityType={printFor}
                  rdvList={rdvList}
                  week={week}
                  year={year}
                  showQR={showQR}
                  isFirst={idx === 0}
                />
              )}
              {/* Page fiche de suivi (élèves uniquement) */}
              {printFor === 'eleve' && (effectivePrintMode === 'fiche' || effectivePrintMode === 'both') && (
                <PrintFicheSuivi
                  eleve={entity as Eleve}
                  rdvList={rdvList}
                  week={week}
                  year={year}
                  isFirst={idx === 0 && effectivePrintMode === 'fiche'}
                />
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
