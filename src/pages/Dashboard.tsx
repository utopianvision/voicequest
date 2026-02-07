import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useApi';
import { api } from '../lib/api';
import { useVoiceCommand } from '../components/VoiceCommandProvider';
import { XPBar } from '../components/XPBar';
import { StatsCard } from '../components/StatsCard';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Flame,
  Trophy,
  Target,
  ArrowRight,
  BookOpen,
  Mic,
  Sparkles } from
'lucide-react';
import { UserStats, Quest } from '../types';
export function Dashboard() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { setPageContext, toggleListening, isListening } = useVoiceCommand();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recommendedQuests, setRecommendedQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [statsRes, questsRes] = await Promise.all([
          api.getStats(user.id),
          api.getQuests(user.id)]
          );
          setStats(statsRes.stats);
          // Filter for incomplete quests, take top 3
          const incomplete = questsRes.quests.
          filter((q: Quest) => !q.is_completed).
          slice(0, 3);
          setRecommendedQuests(incomplete);
        } catch (err) {
          console.error('Dashboard fetch error:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [user]);
  // Register voice context
  useEffect(() => {
    setPageContext({
      quests: recommendedQuests,
      onStartQuest: (id) => navigate(`/session/${id}`)
    });
    return () => setPageContext({});
  }, [recommendedQuests, navigate, setPageContext]);
  if (!user) return null;
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };
  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500 overflow-visible">
      {/* Hero / Voice Onboarding Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-4 max-w-lg">
            <h1 className="text-3xl md:text-4xl font-bold">
              {getGreeting()}, {user.username}!
            </h1>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Ready for an adventure? Just say{' '}
              <span className="font-bold text-white">"Start a quest"</span> or
              pick one below.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <Button
                onClick={toggleListening}
                className="bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-lg"
                size="lg">

                {isListening ?
                <span className="flex items-center">
                    <Mic className="mr-2 h-5 w-5 animate-pulse" /> Listening...
                  </span> :

                <span className="flex items-center">
                    <Mic className="mr-2 h-5 w-5" /> Say "Start Quest"
                  </span>
                }
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate('/quests')}>

                View Map
              </Button>
            </div>
          </div>

          {/* Streak Badge */}
          <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <Flame className="h-8 w-8 text-orange-400 animate-pulse mb-2" />
            <span className="text-2xl font-bold">{user.streak}</span>
            <span className="text-xs font-medium text-indigo-200 uppercase tracking-wider">
              Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start / Recommended Quests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-amber-500" />
            Recommended for You
          </h2>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            Say "Number One" to start
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {isLoading ?
          [1, 2, 3].map((i) =>
          <div
            key={i}
            className="h-40 bg-slate-100 rounded-2xl animate-pulse" />

          ) :
          recommendedQuests.map((quest, index) =>
          <div
            key={quest.id}
            onClick={() => navigate(`/session/${quest.id}`)}
            className="group relative bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer overflow-visible">

                  {/* Number Badge for Voice */}
                  <div className="absolute -top-2 -left-2 h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white group-hover:bg-indigo-600 transition-colors z-10">
                    {index + 1}
                  </div>

                  <div className="flex justify-between items-start mb-3 mt-1">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                      {quest.icon}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {quest.difficulty}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">
                    {quest.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {quest.description}
                  </p>

                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span>{quest.xp_reward} XP</span>
                    <span className="flex items-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Start <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </div>
                </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 overflow-visible">
        <StatsCard
          icon={<Target className="h-6 w-6" />}
          label="Quests Completed"
          value={stats?.quests_completed || 0}
          color="indigo" />

        <StatsCard
          icon={<Trophy className="h-6 w-6" />}
          label="Achievements"
          value={stats?.achievements_unlocked || 0}
          color="amber" />

        <StatsCard
          icon={<BookOpen className="h-6 w-6" />}
          label="Topics Mastered"
          value={stats?.topics_progress?.filter(t => t.quests_completed > 0).length || 0}
          color="emerald" />

      </div>

      {/* XP Progress */}
      <Card className="border-2 border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Level {user.level} Progress
              </h2>
              <p className="text-sm text-slate-500">
                Keep learning to level up!
              </p>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <XPBar
            currentXP={user.xp}
            nextLevelXP={user.level * 1000}
            level={user.level}
            showLabel={false}
            className="mb-2" />

          <div className="flex justify-between text-xs font-medium text-slate-400">
            <span>{user.xp} XP</span>
            <span>{user.level * 1000} XP</span>
          </div>
        </CardContent>
      </Card>
    </div>);

}