import React from 'react';
import { Quest } from '../types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Check, ChevronRight, Star } from 'lucide-react';
interface QuestCardProps {
  quest: Quest;
  isCompleted?: boolean;
  bestScore?: number;
  onStart: (questId: string) => void;
}
export function QuestCard({
  quest,
  isCompleted,
  bestScore,
  onStart
}: QuestCardProps) {
  const difficultyColor = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'destructive'
  } as const;
  return (
    <Card
      className={`group hover:shadow-md transition-all duration-300 border-2 ${isCompleted ? 'border-emerald-100 bg-emerald-50/30' : 'border-transparent hover:border-indigo-100'}`}>

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
            {quest.icon || '📚'}
          </div>
          <Badge variant={difficultyColor[quest.difficulty]}>
            {quest.difficulty}
          </Badge>
        </div>
        <CardTitle className="mt-4 text-lg">{quest.title}</CardTitle>
        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
          {quest.description}
        </p>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center text-sm text-slate-600 space-x-4">
          <span className="flex items-center">
            <Star className="h-4 w-4 text-amber-500 mr-1" />
            {quest.xp_reward} XP
          </span>
          <span className="text-slate-300">|</span>
          <span>{quest.estimated_minutes} min</span>
          <span className="text-slate-300">|</span>
          <span>{quest.topic}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        {isCompleted ?
        <div className="w-full flex items-center justify-between bg-emerald-100/50 rounded-lg p-3">
            <span className="text-sm font-medium text-emerald-700 flex items-center">
              <Check className="h-4 w-4 mr-1" /> Completed
            </span>
            {bestScore !== undefined &&
          <span className="text-sm font-bold text-emerald-800">
                {bestScore}%
              </span>
          }
          </div> :

        <Button
          className="w-full group-hover:bg-indigo-600 group-hover:text-white transition-colors"
          variant="secondary"
          onClick={() => onStart(quest.id)}>

            Start Quest
            <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        }
      </CardFooter>
    </Card>);

}