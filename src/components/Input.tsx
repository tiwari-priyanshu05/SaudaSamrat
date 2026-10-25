import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
          {label}
          {rest.required && <span className="ml-1 text-[#E86D5A]">*</span>}
        </label>
      )}
      <input
        id={inputId}
        {...rest}
        className={`w-full rounded-2xl border px-4 py-3 text-base text-[#20352C] placeholder-[#6B7C72]/40 min-h-[48px]
          transition-all duration-150 outline-none
          border-[#E5EAE3] bg-white
          focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8]
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${error ? 'border-[#E86D5A] focus:border-[#E86D5A] focus:ring-[#FDF2F0]' : ''}
          ${className}`}
      />
      {error && <p className="text-xs font-semibold text-[#E86D5A] mt-0.5">{error}</p>}
      {hint && !error && <p className="text-xs text-[#6B7C72] mt-0.5">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', id, ...rest }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
          {label}
          {rest.required && <span className="ml-1 text-[#E86D5A]">*</span>}
        </label>
      )}
      <select
        id={selectId}
        {...rest}
        className={`w-full rounded-2xl border px-4 py-3 text-base text-[#20352C] min-h-[48px]
          transition-all duration-150 outline-none
          border-[#E5EAE3] bg-white
          focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8]
          ${error ? 'border-[#E86D5A]' : ''}
          ${className}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs font-semibold text-[#E86D5A] mt-0.5">{error}</p>}
    </div>
  );
}
