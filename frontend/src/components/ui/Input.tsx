import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-700" htmlFor={inputId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <input
        id={inputId}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${error ? 'border-rose-300' : 'border-slate-200'} ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-rose-500">{error}</span> : helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
    </label>
  );
}
