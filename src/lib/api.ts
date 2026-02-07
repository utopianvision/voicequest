// Dual-protocol: try HTTPS first (for SSL backend), fall back to HTTP
const HTTPS_BASE = 'https://localhost:5000/api';
const HTTP_BASE = 'http://localhost:5001/api';
const HTTP_SAME_PORT = 'http://localhost:5000/api';

// Cache which protocol works after first successful request
let workingBase: string | null = null;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  };

  // If we already know which protocol works, use it directly
  if (workingBase) {
    const url = `${workingBase}${endpoint}`;
    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.
      json().
      catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // First request: try HTTPS :5000, then HTTP :5001, then HTTP :5000
  for (const base of [HTTPS_BASE, HTTP_BASE, HTTP_SAME_PORT]) {
    const url = `${base}${endpoint}`;
    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error = await response.
        json().
        catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      // Success — cache this protocol for future requests
      workingBase = base;
      console.log(
        `[API] Connected via ${base.startsWith('https') ? 'HTTPS' : 'HTTP'}`
      );
      return response.json();
    } catch (err: any) {
      const msg = err?.message || '';
      // If it's a server error (not a network error), throw immediately
      if (
      !msg.includes('Load failed') &&
      !msg.includes('Failed to fetch') &&
      !msg.includes('NetworkError') &&
      !msg.includes('TypeError'))
      {
        throw err;
      }
      // Network error — try next protocol
      continue;
    }
  }

  // Both failed
  throw new Error(
    'Cannot connect to backend. Make sure Flask is running:\n' +
    '  cd backend && python app.py\n\n' +
    'If using HTTPS with self-signed certs, either:\n' +
    '  • Visit https://localhost:5000/api/health and accept the certificate, OR\n' +
    '  • On Mac: Add cert to Keychain — open Keychain Access, drag cert.pem in, set to "Always Trust"'
  );
}

export interface VoiceCommandRequest {
  transcript: string;
  current_page: string;
  available_quests?: {id: number;title: string;topic: string;}[];
}

export interface VoiceCommandResponse {
  intent: 'navigate' | 'start_quest' | 'filter' | 'help' | 'unknown';
  target: string;
  message: string;
  confidence: number;
}

export interface JarvisChatRequest {
  session_id: string;
  message: string;
  context: {
    current_page: string;
    user_logged_in: boolean;
    user_name?: string;
    available_quests?: {id: number;title: string;topic: string;}[];
    canvas_data?: {
      courses?: {id: number;name: string;}[];
      assignments?: {
        id: number;
        name: string;
        course_name?: string;
        due_at?: string;
      }[];
    };
  };
}

export interface JarvisChatResponse {
  intent:
  'login' |
  'navigate' |
  'start_quest' |
  'create_quest' |
  'filter' |
  'help' |
  'chat' |
  'greeting' |
  'logout';
  target: string;
  message: string;
}

export interface CanvasConnectResponse {
  success: boolean;
  session_id: string;
  user: {
    id: number;
    name: string;
  };
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at: string;
  course_id: number;
  course_name?: string;
}

export const api = {
  // Auth
  register: (username: string, displayName: string) =>
  request<{user: import('../types').User;}>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, display_name: displayName })
  }),

  login: (username: string) =>
  request<{user: import('../types').User;}>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username })
  }),

  // User
  getProfile: (userId: number) =>
  request<{user: import('../types').User;}>(`/user/${userId}/profile`),

  getStats: (userId: number) =>
  request<{stats: import('../types').UserStats;}>(`/user/${userId}/stats`),

  getAchievements: (userId: number) =>
  request<{achievements: import('../types').Achievement[];}>(
    `/user/${userId}/achievements`
  ),

  // Quests
  getQuests: (userId: number) =>
  request<{quests: import('../types').Quest[];}>(
    `/quests?user_id=${userId}`
  ),

  startQuest: (questId: number, userId: number) =>
  request<{session: import('../types').QuestSession;}>(
    `/quests/${questId}/start`,
    {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    }
  ),

  respondToQuest: (sessionId: string, userMessage: string) =>
  request<import('../types').QuestResponse>(
    `/quests/session/${sessionId}/respond`,
    {
      method: 'POST',
      body: JSON.stringify({ message: userMessage })
    }
  ),

  // Custom Quest Creation
  createCustomQuest: (userId: number, topic: string, numQuestions?: number, canvasAssignments?: Array<{id: number; name: string; course_name?: string; due_at?: string; description?: string}>) =>
  request<{
    quest: import('../types').Quest;
    session: import('../types').QuestSession;
  }>('/quests/custom', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      topic,
      num_questions: numQuestions || 5,
      canvas_assignments: canvasAssignments || []
    })
  }),

  // Canvas LMS
  canvasConnect: (canvasUrl: string, apiKey: string, userId?: number) =>
  request<CanvasConnectResponse>('/canvas/connect', {
    method: 'POST',
    body: JSON.stringify({ canvas_url: canvasUrl, api_key: apiKey, user_id: userId })
  }),

  canvasDisconnect: (sessionId: string) =>
  request<{success: boolean;}>('/canvas/disconnect', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId })
  }),

  getCanvasCourses: (sessionId: string) =>
  request<{courses: CanvasCourse[];}>(
    `/canvas/courses?session_id=${sessionId}`
  ),

  getCanvasAssignments: (sessionId: string) =>
  request<{assignments: CanvasAssignment[];}>(
    `/canvas/assignments?session_id=${sessionId}`
  ),

  // Jarvis AI Chat (persistent session)
  jarvisChat: (data: JarvisChatRequest) =>
  request<JarvisChatResponse>('/jarvis/chat', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  jarvisReset: (sessionId: string) =>
  request<{status: string;}>('/jarvis/reset', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId })
  }),

  // Legacy voice command
  interpretVoiceCommand: (data: VoiceCommandRequest) =>
  request<VoiceCommandResponse>('/voice/command', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // TTS
  textToSpeech: async (
  text: string,
  voiceId?: string)
  : Promise<ArrayBuffer> => {
    const base = workingBase || HTTPS_BASE;
    const response = await fetch(`${base.replace('/api', '')}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId })
    });

    if (!response.ok) {
      throw new Error('TTS request failed');
    }

    return response.arrayBuffer();
  }
};