import { useEffect, useMemo, useState } from 'react';
import { ABSENCE_STATUS, COULEURS, type Eleve, type Prof, type Rdv, type RdvFormValues, type RdvPayload } from '../../types';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TimeInput } from '../ui/TimeInput';
import { EleveMultiSelect } from './EleveMultiSelect';

interface RdvFormProps {
  initialValues?: Partial<Rdv>;
  /** Liste fixe d'élèves à préremplir (ex. tous les membres d'un créneau groupé) */
  initialElevesIds?: number[];
  eleves: Eleve[];
  profs: Prof[];
  onSubmit: (data: RdvPayload) => Promise<void> | void;
  onValuesChange?: (data: RdvPayload) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  /** Masque le sélecteur d'élèves (ex. édition groupée où la liste est fixe) */
  showElevesField?: boolean;
  /** Masque le statut de présence (non pertinent lors d'une édition groupée : chaque élève garde le sien) */
  showAbsenceField?: boolean;
  /** Masque la répétition sur plusieurs semaines (non pertinent lors d'une édition) */
  showRepeatField?: boolean;
}

interface FormErrors {
  elevesIds?: string;
  id_proph?: string;
  date?: string;
  time?: string;
  durre?: string;
  lieu?: string;
}

function buildInitialState(initialValues?: Partial<Rdv>, initialElevesIds?: number[]): RdvFormValues {
  const startDate = initialValues?.date ? new Date(initialValues.date) : new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return {
    nom: initialValues?.nom ?? '',
    date: `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`,
    time: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
    durre: initialValues?.durre ?? 60,
    couleur: initialValues?.couleur ?? COULEURS[3].value,
    elevesIds: initialElevesIds ?? (initialValues?.id_eleves ? [initialValues.id_eleves] : []),
    id_proph: initialValues?.id_proph,
    lieu: initialValues?.lieu ?? '',
    abs: initialValues?.abs ?? 0,
    repeatWeeks: '',
  };
}

function validate(values: RdvFormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.elevesIds.length === 0) errors.elevesIds = 'Sélectionnez au moins un élève.';
  if (!values.id_proph) errors.id_proph = 'Le professeur est obligatoire.';
  if (!values.date) errors.date = 'La date est obligatoire.';
  if (!values.time) errors.time = "L'heure est obligatoire.";
  if (!values.durre || Number(values.durre) < 5) errors.durre = 'Durée minimale : 5 minutes.';
  if (!values.lieu.trim()) errors.lieu = 'Le lieu est obligatoire.';
  return errors;
}

export function RdvForm({
  initialValues,
  initialElevesIds,
  eleves,
  profs,
  onSubmit,
  onValuesChange,
  onCancel,
  isLoading = false,
  showElevesField = true,
  showAbsenceField = true,
  showRepeatField = true,
}: RdvFormProps) {
  const [values, setValues] = useState<RdvFormValues>(() => buildInitialState(initialValues, initialElevesIds));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setValues(buildInitialState(initialValues, initialElevesIds));
    setErrors({});
    setSubmitted(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues, initialElevesIds]);

  // Revalider en temps réel après le premier essai de soumission
  useEffect(() => {
    if (submitted) setErrors(validate(values));
  }, [values, submitted]);

  useEffect(() => {
    if (!values.date || !values.time) return;
    const repeatWeeks = values.repeatWeeks
      .split(';')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item) && item > 0);
    onValuesChange?.({
      nom: values.nom || 'Rendez-vous',
      date: `${values.date}T${values.time}:00`,
      durre: Number(values.durre),
      couleur: values.couleur,
      elevesIds: values.elevesIds,
      id_eleves: values.elevesIds[0],
      id_proph: values.id_proph,
      lieu: values.lieu,
      abs: Number(values.abs),
      repeatWeeks,
    });
  }, [onValuesChange, values]);

  const selectedStudents = useMemo(
    () => eleves.filter((eleve) => values.elevesIds.includes(eleve.id)),
    [eleves, values.elevesIds],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const formErrors = validate(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    const repeatWeeks = values.repeatWeeks
      .split(';')
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item) && item > 0);

    await onSubmit({
      nom: values.nom || 'Rendez-vous',
      date: `${values.date}T${values.time}:00`,
      durre: Number(values.durre),
      couleur: values.couleur,
      elevesIds: values.elevesIds,
      id_eleves: values.elevesIds[0],
      id_proph: values.id_proph,
      lieu: values.lieu,
      abs: Number(values.abs),
      repeatWeeks,
    });
  };

  const err = (field: keyof FormErrors) =>
    errors[field] ? (
      <p className="mt-1 text-xs font-medium text-red-600">{errors[field]}</p>
    ) : null;

  const fieldCls = (field: keyof FormErrors) =>
    errors[field] ? 'ring-2 ring-red-300 border-red-400' : '';

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Élèves ── */}
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          {showElevesField ? (
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">Élèves *</span>
              <EleveMultiSelect
                eleves={eleves}
                selectedIds={values.elevesIds}
                onChange={(ids) => setValues((current) => ({ ...current, elevesIds: ids }))}
                error={errors.elevesIds}
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                Élève{selectedStudents.length > 1 ? 's' : ''} concerné{selectedStudents.length > 1 ? 's' : ''}
              </p>
              {selectedStudents.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((eleve) => (
                    <span key={eleve.id} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {eleve.prenom} {eleve.nom}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ── Autres champs ── */}
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <div>
            <DateInput
              label="Date *"
              value={values.date}
              onChange={(value) => setValues((current) => ({ ...current, date: value }))}
              className={fieldCls('date')}
            />
            {err('date')}
          </div>
          <div>
            <TimeInput
              label="Heure *"
              value={values.time}
              onChange={(value) => setValues((current) => ({ ...current, time: value }))}
              className={fieldCls('time')}
            />
            {err('time')}
          </div>
          <div>
            <Input
              label="Durée (minutes) *"
              type="number"
              min={5}
              step={5}
              value={values.durre}
              onChange={(event) => setValues((current) => ({ ...current, durre: Number(event.target.value) }))}
              className={fieldCls('durre')}
            />
            {err('durre')}
          </div>
          <div>
            <Select
              label="Professeur *"
              value={values.id_proph ?? ''}
              onChange={(event) => setValues((current) => ({ ...current, id_proph: event.target.value ? Number(event.target.value) : undefined }))}
              placeholder="Choisir un professeur"
              options={profs.map((prof) => ({ value: prof.id, label: `${prof.nom} ${prof.prenom}` }))}
              className={fieldCls('id_proph')}
            />
            {err('id_proph')}
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Lieu *"
              value={values.lieu}
              onChange={(event) => setValues((current) => ({ ...current, lieu: event.target.value }))}
              className={fieldCls('lieu')}
            />
            {err('lieu')}
          </div>
          <div className="sm:col-span-2">
            <label className="flex w-full flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Observation / détail</span>
              <textarea
                className="min-h-28 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={values.nom}
                onChange={(event) => setValues((current) => ({ ...current, nom: event.target.value }))}
                placeholder="Ex. Individualisation horticulture"
              />
            </label>
          </div>
          {showAbsenceField && (
            <Select
              label="Statut de présence"
              value={values.abs}
              onChange={(event) => setValues((current) => ({ ...current, abs: Number(event.target.value) }))}
              options={ABSENCE_STATUS.map((status) => ({ value: status.value, label: status.label }))}
            />
          )}
          {showRepeatField && (
            <Input
              label="Répéter sur les semaines"
              value={values.repeatWeeks}
              onChange={(event) => setValues((current) => ({ ...current, repeatWeeks: event.target.value }))}
              helperText="Numéros de semaine séparés par des ; (ex : 28;29;30)"
              placeholder="28;29;30"
            />
          )}
        </div>
      </div>

      {/* ── Couleur ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Couleur du rendez-vous</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {COULEURS.map((couleur) => (
            <button
              key={couleur.value}
              type="button"
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${values.couleur === couleur.value ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200 hover:border-slate-300'}`}
              onClick={() => setValues((current) => ({ ...current, couleur: couleur.value }))}
            >
              <span className="h-6 w-6 rounded-full border border-white shadow" style={{ backgroundColor: couleur.value }} />
              <span className="text-sm font-medium text-slate-700">{couleur.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Boutons ── */}
      {submitted && Object.keys(errors).length > 0 && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Veuillez corriger les champs marqués * avant d'enregistrer.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button> : null}
        <Button type="submit" loading={isLoading}>Enregistrer le rendez-vous</Button>
      </div>
    </form>
  );
}
