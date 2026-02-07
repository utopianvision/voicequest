import React from 'react';
interface XPBarProps {
  currentXP: number;
  nextLevelXP: number;
  level: number;
  className?: string;
  showLabel?: boolean;
}
export function XPBar({
  currentXP,
  nextLevelXP,
  level,
  className = '',
  showLabel = true
}: XPBarProps) {
  const percentage = Math.min(100, Math.max(0, currentXP / nextLevelXP * 100));
  return (
    <div className={`w-full ${className}`}>
      {showLabel &&
      <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            Level {level}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {currentXP} / {nextLevelXP} XP
          </span>
        </div>
      }
      <div
        className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
        role="progressbar"
        aria-valuenow={currentXP}
        aria-valuemin={0}
        aria-valuemax={nextLevelXP}
        aria-label={`Level ${level} progress`}>

        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out rounded-full relative"
          style={{
            width: `${percentage}%`
          }}>

          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-full bg-white/20 transform -skew-x-12" />
        </div>
      </div>
    </div>);

}