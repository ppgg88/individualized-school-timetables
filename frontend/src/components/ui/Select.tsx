import type { SelectHTMLAttributes } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = '', id, multiple, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-700" htmlFor={selectId}>
      {label ? <span className="font-medium">{label}</span> : null}
      <select
        id={selectId}
        multiple={multiple}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${multiple ? 'min-h-32' : ''} ${error ? 'border-rose-300' : 'border-slate-200'} ${className}`}
        {...props}
      >
        {!multiple && placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}
