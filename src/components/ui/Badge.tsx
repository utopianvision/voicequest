import React from 'react';
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
  'default' |
  'secondary' |
  'destructive' |
  'outline' |
  'success' |
  'warning';
}
export function Badge({
  className = '',
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default:
    'border-transparent bg-indigo-600 text-slate-50 hover:bg-indigo-600/80',
    secondary:
    'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50',
    destructive:
    'border-transparent bg-rose-500 text-slate-50 hover:bg-rose-500/80',
    outline: 'text-slate-950 dark:text-slate-50',
    success:
    'border-transparent bg-emerald-500 text-white hover:bg-emerald-600',
    warning: 'border-transparent bg-amber-500 text-white hover:bg-amber-600'
  };
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 dark:focus:ring-slate-300 ${variants[variant]} ${className}`}
      {...props} />);


}