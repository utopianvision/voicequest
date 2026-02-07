import React, { useEffect, useState } from 'react';
import { useUser } from '../hooks/useApi';
import { api } from '../lib/api';
import { Achievement, UserStats } from '../types';
import { XPBar } from '../components/XPBar';
import { AchievementBadge } from '../components/AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Loader2, Calendar } from 'lucide-react';
export function Profile() {
  const { user } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [achievementsRes, statsRes] = await Promise.all([
          api.getAchievements(user.id),
          api.getStats(user.id)]
          );
          setAchievements(achievementsRes.achievements);
          setStats(statsRes.stats);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [user]);
  if (!user) return null;
  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border-2 border-white">
            Lvl {user.level}
          </div>
        </div>

        <div className="flex-1 w-full">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {user.username}
          </h1>
          <p className="text-slate-500 mb-6">
            Member since {new Date().getFullYear()}
          </p>

          <XPBar
            currentXP={user.xp}
            nextLevelXP={user.level * 1000}
            level={user.level} />

        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
        {
          label: 'Total XP',
          value: user.xp
        },
        {
          label: 'Quests',
          value: stats?.quests_completed || 0
        },
        {
          label: 'Streak',
          value: `${user.streak} Days`
        },
        {
          label: 'Accuracy',
          value: '92%'
        }].
        map((stat, i) =>
        <Card key={i} className="text-center py-4">
            <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              {stat.label}
            </p>
          </Card>
        )}
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Trophy className="mr-2 h-5 w-5 text-amber-500" />
          Achievements
        </h2>

        {isLoading ?
        <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div> :

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement) =>
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            isUnlocked={achievement.unlocked} />

          )}
          </div>
        }
      </div>

      {/* Activity Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between space-x-2 px-4">
            {[40, 70, 35, 90, 60, 80, 50].map((h, i) =>
            <div
              key={i}
              className="w-full bg-slate-100 rounded-t-lg relative group">

                <div
                className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-lg transition-all duration-500 group-hover:bg-indigo-600"
                style={{
                  height: `${h}%`
                }} />

              </div>
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400 px-4">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </CardContent>
      </Card>
    </div>);

}
// Helper icon component
function Trophy({ className }: {className?: string;}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>

      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>);

}