import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useApi';
import { api } from '../lib/api';
import { useVoiceCommand } from '../components/VoiceCommandProvider';
import { Quest } from '../types';
import { QuestCard } from '../components/QuestCard';
import { Button } from '../components/ui/Button';
import { Loader2, Mic, Sparkles, Plus } from 'lucide-react';
export function QuestMap() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { user } = useUser();
  const navigate = useNavigate();
  const { setPageContext, isListening, toggleListening } = useVoiceCommand();
  useEffect(() => {
    const fetchQuests = async () => {
      if (!user) return;
      try {
        const res = await api.getQuests(user.id);
        setQuests(res.quests);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuests();
  }, [user]);
  const filteredQuests =
  filter === 'all' ?
  quests :
  quests.filter((q) => q.topic.toLowerCase() === filter.toLowerCase());
  // Register voice context
  useEffect(() => {
    setPageContext({
      quests: filteredQuests,
      onFilter: (topic) => setFilter(topic),
      onStartQuest: (id) => navigate(`/session/${id}`)
    });
    return () => setPageContext({});
  }, [filteredQuests, navigate, setPageContext]);
  const handleStartQuest = (questId: string) => {
    navigate(`/session/${questId}`);
  };
  const topics = [
  {
    id: 'all',
    label: 'All'
  },
  {
    id: 'science',
    label: 'Science'
  },
  {
    id: 'history',
    label: 'History'
  },
  {
    id: 'math',
    label: 'Math'
  },
  {
    id: 'literature',
    label: 'Literature'
  },
  {
    id: 'geography',
    label: 'Geography'
  },
  {
    id: 'technology',
    label: 'Tech'
  },
  {
    id: 'language',
    label: 'Language'
  },
  {
    id: 'music',
    label: 'Music'
  }];

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quest Map</h1>
          <p className="text-slate-500 mt-1">Choose your next adventure</p>
        </div>

        {/* Voice Prompt Banner */}
        <div
          onClick={toggleListening}
          className={`cursor-pointer px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${isListening ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>

          <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium">
            {isListening ?
            'Listening...' :
            'Say "Show Science" or "Number One"'}
          </span>
        </div>
      </div>

      {/* Custom Quest Banner */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/20 blur-2xl group-hover:bg-white/30 transition-colors" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Create a Custom Quest</h3>
              <p className="text-indigo-100 text-sm max-w-md">
                Need help with a specific topic? Just ask Jarvis to create a
                personalized study session for you.
              </p>
            </div>
          </div>

          <Button
            onClick={toggleListening}
            className="bg-white text-indigo-600 hover:bg-indigo-50 border-none shadow-md whitespace-nowrap">

            <Mic className="mr-2 h-4 w-4" />
            "Help me prep for Calculus"
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {topics.map((topic) =>
        <Button
          key={topic.id}
          variant={filter === topic.id ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter(topic.id)}
          className={`whitespace-nowrap rounded-full px-4 ${filter === topic.id ? 'shadow-md' : 'border-slate-200 text-slate-600'}`}>

            {topic.label}
          </Button>
        )}
      </div>

      {/* Quest Grid */}
      {isLoading ?
      <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div> :

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuests.map((quest, index) =>
        <div key={quest.id} className="relative group h-full">
              {/* Voice Number Badge */}
              <div className="absolute -top-3 -left-3 z-10 h-8 w-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white group-hover:bg-indigo-600 transition-colors scale-90 group-hover:scale-100">
                {index + 1}
              </div>

              <div className="h-full">
                <QuestCard
              quest={quest}
              onStart={() => handleStartQuest(quest.id.toString())}
              isCompleted={quest.is_completed}
              bestScore={quest.best_score} />

              </div>
            </div>
        )}
        </div>
      }

      {!isLoading && filteredQuests.length === 0 &&
      <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Sparkles className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No quests found
          </h3>
          <p className="text-slate-500 mt-1 mb-6">
            Try selecting a different topic
          </p>
          <Button variant="outline" onClick={() => setFilter('all')}>
            Show All Quests
          </Button>
        </div>
      }
    </div>);

}