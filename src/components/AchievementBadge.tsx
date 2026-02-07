import React from 'react';
import { Achievement } from '../types';
import { Lock, Trophy } from 'lucide-react';
interface AchievementBadgeProps {
  achievement: Achievement;
  isUnlocked: boolean;
  className?: string;
}
export function AchievementBadge({
  achievement,
  isUnlocked,
  className = ''
}: AchievementBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center text-center p-4 rounded-xl transition-all ${isUnlocked ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 border shadow-sm' : 'bg-slate-50 border-slate-200 border opacity-70 grayscale'} ${className}`}
      title={
      isUnlocked ?
      `Unlocked: ${achievement.name}` :
      `Locked: ${achievement.name}`
      }>

      <div
        className={`h-16 w-16 rounded-full flex items-center justify-center mb-3 ${isUnlocked ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>

        {isUnlocked ?
        <span className="text-3xl" role="img" aria-label={achievement.name}>
            {achievement.icon}
          </span> :

        <Lock className="h-6 w-6" />
        }
      </div>

      <h4 className="font-bold text-sm text-slate-900 mb-1">
        {achievement.name}
      </h4>
      <p className="text-xs text-slate-500 line-clamp-2">
        {achievement.description}
      </p>

      {isUnlocked &&
      <span className="mt-2 inline-flex items-center text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
          <Trophy className="h-3 w-3 mr-1" />
          Unlocked
        </span>
      }
    </div>);

}