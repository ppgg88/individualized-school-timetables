import { useEffect, useState } from 'react';

interface TimeInputProps {
  label?: string;
  /** Valeur au format HH:mm 24h (chaîne vide si incomplète) */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  className?: string;
  name?: string;
  id?: string;
}

function isoToDigits(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return match ? `${match[1]}${match[2]}` : '';
}

/** Convertit 4 chiffres HHmm en HH:mm si l'heure est valide, sinon null. */
function digitsToTime(digits: string): string | null {
  if (digits.length !== 4) return null;
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  if (Number(hh) > 23 || Number(mm) > 59) return null;
  return `${hh}:${mm}`;
}

function formatDigits(digits: string): string {
  const hh = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  return [hh, mm].filter(Boolean).join(':');
}

/**
 * Champ heure texte avec masque HH:mm (24h), saisi au clavier uniquement.
 * On évite le <input type="time"> natif pour la même raison que DateInput : son affichage
 * (12h AM/PM ou 24h) dépend de la locale du navigateur/OS, pas seulement de l'attribut lang.
 */
export function TimeInput({ label, value, onChange, error, helperText, className = '', name, id }: TimeInputProps) {
  const inputId = id ?? name;
  const [digits, setDigits] = useState(() => isoToDigits(value));

  useEffect(() => {
    const expected = isoToDigits(value);
    if (digitsToTime(digits) !== value && !(value === '' && digits === '')) {
      setDigits(expected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/\D/g, '').slice(0, 4);
    setDigits(next);
    const time = digitsToTime(next);
    if (time) onChange(time);
    else if (next.length === 0) onChange('');
  };

  const field = (
    <input
      id={inputId}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="--:--"
      value={formatDigits(digits)}
      onChange={handleChange}
      className={`w-full rounded-xl border bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${error ? 'border-rose-300' : 'border-slate-200'} ${className}`}
    />
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
    <label className="flex w-full flex-col gap-2 text-sm text-slate-700" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      {field}
      {error ? <span className="text-xs text-rose-500">{error}</span> : helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
    </label>
  );
}
