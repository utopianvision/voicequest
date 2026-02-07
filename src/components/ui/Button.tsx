import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
export interface ButtonProps extends
  React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
  {
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading,
    children,
    disabled,
    ...props
  },
  ref) =>
  {
    const baseStyles =
    'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95';
    const variants = {
      primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 border border-transparent',
      secondary:
      'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/30 border border-transparent',
      outline:
      'border-2 border-slate-200 bg-transparent hover:bg-slate-50 text-slate-900 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800',
      ghost:
      'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300',
      danger:
      'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/30 border border-transparent',
      success:
      'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 border border-transparent'
    };
    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-6 text-sm',
      lg: 'h-14 px-8 text-base',
      icon: 'h-11 w-11'
    };
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}>

        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>);

  }
);
Button.displayName = 'Button';