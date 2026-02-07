export interface User {
  id: number;
  username: string;
  display_name: string;
  xp: number;
  level: number;
  streak: number;
  longest_streak: number;
  quests_completed: number;
  created_at: string;
}

export interface Quest {
  id: number;
  title: string;
  description: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xp_reward: number;
  estimated_minutes: number;
  icon: string;
  is_completed?: boolean;
  best_score?: number;
}

export interface QuestSession {
  session_id: string;
  quest_id: number;
  messages: ConversationMessage[];
  current_question: number;
  total_questions: number;
  score: number;
  status: 'active' | 'completed';
}

export interface ConversationMessage {
  role: 'tutor' | 'user';
  content: string;
  timestamp: string;
  is_correct?: boolean;
  feedback?: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
  category: 'streak' | 'quest' | 'xp' | 'special';
}

export interface UserStats {
  xp: number;
  level: number;
  xp_to_next_level: number;
  streak: number;
  longest_streak: number;
  quests_completed: number;
  total_quests: number;
  achievements_unlocked: number;
  total_achievements: number;
  weekly_xp: number[];
  topics_progress: TopicProgress[];
}

export interface TopicProgress {
  topic: string;
  quests_completed: number;
  total_quests: number;
  average_score: number;
}

export interface TTSRequest {
  text: string;
  voice_id?: string;
}

export interface QuestResponse {
  tutor_message: string;
  is_correct?: boolean;
  feedback?: string;
  score_delta: number;
  current_question: number;
  total_questions: number;
  quest_complete: boolean;
  xp_earned?: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  autoPlayTTS: boolean;
  speechRate: number;
}