import React, { forwardRef } from 'react';
export interface InputProps extends
  React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label &&
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 dark:text-slate-300">
            {label}
          </label>
        }
        <input
          type={type}
          className={`flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 ${error ? 'border-rose-500 focus-visible:ring-rose-500' : ''} ${className}`}
          ref={ref}
          {...props} />

        {error &&
        <p className="text-xs text-rose-500 font-medium animate-in slide-in-from-top-1">
            {error}
          </p>
        }
      </div>);

  }
);
Input.displayName = 'Input';