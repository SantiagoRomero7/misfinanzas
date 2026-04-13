import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`flex h-12 w-full rounded-xl border bg-white px-3 py-2 text-sm transition-colors
              file:border-0 file:bg-transparent file:text-sm file:font-medium 
              placeholder:text-slate-400 focus-visible:outline-none focus:border-primary focus:ring-1 focus:ring-primary
              disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-expense focus:border-expense focus:ring-expense' : 'border-slate-200'}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <span className="text-sm text-expense">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
