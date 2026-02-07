import React from 'react';
import { Card, CardContent } from './ui/Card';
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  color?: 'indigo' | 'amber' | 'emerald' | 'rose';
}
export function StatsCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  color = 'indigo'
}: StatsCardProps) {
  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600'
  };
  return (
    <Card className="border-2">
      <CardContent className="p-6 flex items-center space-x-4">
        <div className={`p-3 rounded-xl ${colorStyles[color]}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {trend &&
          <p
            className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>

              {trend}
            </p>
          }
        </div>
      </CardContent>
    </Card>);

}