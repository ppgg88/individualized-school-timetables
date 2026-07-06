import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DateInputProps {
  label?: string;
  /** Valeur au format yyyy-mm-dd (chaîne vide si incomplète) */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  className?: string;
  name?: string;
  id?: string;
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function isoToDigits(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}${match[2]}${match[1]}` : '';
}

/** Convertit 8 chiffres jjmmaaaa en yyyy-mm-dd si la date est valide, sinon null. */
function digitsToIso(digits: string): string | null {
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12) return null;
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d < 1 || d > daysInMonth) return null;
  return `${year}-${month}-${day}`;
}

function formatDigits(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('-');
}

/**
 * Champ date jj-mm-aaaa : saisie clavier masquée + calendrier déroulant pour la sélection à la souris.
 * Pas de <input type="date"> natif : son rendu (séparateurs, ordre jour/mois/année, zone de
 * surbrillance du segment actif) dépend de la locale du navigateur/OS et ne peut pas être
 * fiablement recouvert par un affichage personnalisé.
 */
export function DateInput({ label, value, onChange, error, helperText, className = '', name, id }: DateInputProps) {
  const inputId = id ?? name;
  const [digits, setDigits] = useState(() => isoToDigits(value));
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => (value ? parseISO(value) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  // Resynchronise si la valeur change depuis l'extérieur (sélection d'un autre rdv, reset…)
  useEffect(() => {
    if (digitsToIso(digits) !== value && !(value === '' && digits === '')) {
      setDigits(isoToDigits(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Ferme le calendrier au clic extérieur ou à la touche Échap
  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 8);
    setDigits(next);
    const iso = digitsToIso(next);
    if (iso) onChange(iso);
    else if (next.length === 0) onChange('');
  };

  const openPicker = () => {
    setViewDate(value ? parseISO(value) : new Date());
    setOpen(true);
  };

  const selectDay = (day: Date) => {
    const iso = format(day, 'yyyy-MM-dd');
    setDigits(isoToDigits(iso));
    onChange(iso);
    setOpen(false);
  };

  const selected = value ? parseISO(value) : null;
  const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const field = (
    <div className="relative" ref={containerRef}>
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="jj-mm-aaaa"
        value={formatDigits(digits)}
        onChange={handleChange}
        onFocus={openPicker}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 pr-10 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${error ? 'border-rose-300' : 'border-slate-200'} ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600"
        aria-label="Ouvrir le calendrier"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate((current) => subMonths(current, 1))}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold capitalize text-slate-900">
              {format(viewDate, 'MMMM yyyy', { locale: fr })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate((current) => addMonths(current, 1))}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-slate-400">
            {WEEKDAY_LABELS.map((label, index) => (
              <div key={index}>{label}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewDate);
              const isSelected = Boolean(selected && isSameDay(day, selected));
              const dayIsToday = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`rounded-lg py-1 text-xs transition ${
                    isSelected
                      ? 'bg-blue-600 font-semibold text-gray-50'
                      : dayIsToday
                        ? 'border border-blue-400 text-blue-700'
                        : inMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (!label) {
    return (
      <div className="flex w-full flex-col gap-2">
        {field}
        {error ? <span className="text-xs text-rose-500">{error}</span> : helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {field}
      {error ? <span className="text-xs text-rose-500">{error}</span> : helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
    </div>
  );
}
