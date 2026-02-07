import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  createContext,
  useContext } from
'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVoice } from '../hooks/useVoice';
import { useUser } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  useVoiceCommands,
  PageContext,
  CommandResult } from
'../hooks/useVoiceCommands';
import { useAccessibility } from './AccessibilityProvider';
interface VoiceCommandContextType {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  interimTranscript: string;
  lastCommand: string | null;
  commandResult: CommandResult | null;
  assistantName: string;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  setPageContext: (context: PageContext) => void;
  toggleListening: () => void;
  executeDirectCommand: (text: string) => void;
}
const VoiceCommandContext = createContext<VoiceCommandContextType | undefined>(
  undefined
);
export function VoiceCommandProvider({
  children


}: {children: React.ReactNode;}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useUser();
  const loginHandledRef = useRef<string | null>(null);
  const questCreatedRef = useRef<string | null>(null);
  // Detect if we're on a quest session page — if so, don't run always-on voice
  const isOnSessionPage = location.pathname.includes('/session');
  const {
    voiceState,
    transcript,
    interimTranscript,
    speechEnded,
    startListening: startVoice,
    stopListening: stopVoice,
    pauseListening: pauseVoice,
    resumeListening: resumeVoice,
    speak
  } = useVoice({
    // Disable always-on when on session pages to avoid mic conflict
    alwaysOn: !isOnSessionPage,
    silenceTimeout: 1500
  });
  const { settings } = useAccessibility();
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [canvasData, setCanvasData] = useState<{
    courses?: {
      id: number;
      name: string;
    }[];
    assignments?: {
      id: number;
      name: string;
      course_name?: string;
      due_at?: string;
    }[];
  }>({});
  const isListening = voiceState === 'listening';
  const autoRestartRef = useRef(!isOnSessionPage);
  // Pause/resume voice when entering/leaving session pages
  // Use a ref to track previous state to avoid unnecessary pauses
  const prevIsOnSessionPageRef = useRef(isOnSessionPage);
  useEffect(() => {
    autoRestartRef.current = !isOnSessionPage;
    if (isOnSessionPage && !prevIsOnSessionPageRef.current) {
      // Only pause when entering session page
      pauseVoice();
    } else if (!isOnSessionPage && prevIsOnSessionPageRef.current) {
      // Only resume when leaving session page (if always-on is enabled)
      setTimeout(() => resumeVoice(), 300);
    }
    prevIsOnSessionPageRef.current = isOnSessionPage;
  }, [isOnSessionPage, pauseVoice, resumeVoice]);
  // Load Canvas data if connected
  useEffect(() => {
    const canvasSession = localStorage.getItem('voicequest_canvas_session');
    if (!canvasSession || !user) return;
    const loadCanvasData = async () => {
      try {
        const [coursesRes, assignmentsRes] = await Promise.all([
        api.getCanvasCourses(canvasSession),
        api.getCanvasAssignments(canvasSession)]
        );
        setCanvasData({
          courses: coursesRes.courses.map((c) => ({
            id: c.id,
            name: c.name
          })),
          assignments: assignmentsRes.assignments.map((a) => ({
            id: a.id,
            name: a.name,
            course_name: (a as any).course_name,
            due_at: a.due_at,
            description: (a as any).description || ''
          }))
        });
      } catch (err) {
        console.warn('[Canvas] Failed to load data for Jarvis:', err);
        setCanvasData({});
      }
    };
    loadCanvasData();
  }, [user]);
  // Merge page context with Canvas data
  const mergedContext = useMemo<PageContext | null>(() => {
    if (
    !pageContext &&
    !canvasData.courses?.length &&
    !canvasData.assignments?.length)

    return null;
    return {
      ...pageContext,
      canvasCourses: canvasData.courses,
      canvasAssignments: canvasData.assignments
    };
  }, [pageContext, canvasData]);
  const {
    lastCommand,
    commandResult,
    isProcessing,
    executeCommand,
    assistantName
  } = useVoiceCommands(
    transcript,
    interimTranscript,
    mergedContext,
    speechEnded,
    pauseVoice,
    resumeVoice,
    !!user,
    user?.display_name || ''
  );
  // Handle login intent from Jarvis
  useEffect(() => {
    if (commandResult?.type === 'login' && commandResult.loginName) {
      const name = commandResult.loginName;
      if (loginHandledRef.current === name) return;
      loginHandledRef.current = name;
      login(name).
      then(() => {
        navigate('/dashboard');
      }).
      catch((err) => {
        console.error('Login failed:', err);
        loginHandledRef.current = null;
      });
    }
  }, [commandResult, login, navigate]);
  // Handle create_quest intent from Jarvis
  useEffect(() => {
    if (
    commandResult?.type === 'create_quest' &&
    commandResult.questTopic &&
    user)
    {
      const topic = commandResult.questTopic;
      if (questCreatedRef.current === topic) return;
      questCreatedRef.current = topic;
      // Pass Canvas assignments if available
      const canvasAssignments = canvasData.assignments?.map(a => ({
        id: a.id,
        name: a.name,
        course_name: a.course_name,
        due_at: a.due_at,
        description: a.description || ''
      })) || [];
      api.
      createCustomQuest(user.id, topic, 5, canvasAssignments).
      then((res) => {
        navigate(`/session/${res.quest.id}`);
        // Reset after navigation
        setTimeout(() => {
          questCreatedRef.current = null;
        }, 2000);
      }).
      catch((err) => {
        console.error('Failed to create quest:', err);
        questCreatedRef.current = null;
      });
    }
  }, [commandResult, user, navigate, canvasData.assignments]);
  // Handle TTS feedback - but don't block mic if TTS fails
  // Use refs to track if we've already handled this command result
  const lastTTSCommandRef = useRef<string | null>(null);
  const lastCommandResultRef = useRef<CommandResult | null>(null);
  const isTTSPlayingRef = useRef(false);
  const micRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Create a stable key from commandResult
  const commandResultKey = useMemo(() => {
    if (!commandResult) return null;
    return JSON.stringify({
      type: commandResult.type,
      message: commandResult.message,
      loginName: commandResult.loginName,
      questTopic: commandResult.questTopic
    });
  }, [commandResult]);
  
  useEffect(() => {
    // Skip if no command result or if it's the same as the last one we processed
    if (!commandResult || !commandResult.message) {
      return;
    }
    
    // Check if this is the exact same commandResult object we already processed
    if (commandResult === lastCommandResultRef.current) {
      return;
    }
    
    // Check if we've already processed this command (by key)
    if (commandResultKey && lastTTSCommandRef.current === commandResultKey) {
      return;
    }
    
    // Skip if TTS is already playing
    if (isTTSPlayingRef.current) {
      return;
    }
    
    // Mark this commandResult as processed
    lastCommandResultRef.current = commandResult;
    if (commandResultKey) {
      lastTTSCommandRef.current = commandResultKey;
    }
    
    // Clear any pending mic restart
    if (micRestartTimeoutRef.current) {
      clearTimeout(micRestartTimeoutRef.current);
      micRestartTimeoutRef.current = null;
    }
    
    if (settings.autoPlayTTS) {
      isTTSPlayingRef.current = true;
      
      speak(commandResult.message).then(() => {
        // TTS completed successfully, restart mic
        console.log('[TTS] Speech completed, restarting mic...');
        isTTSPlayingRef.current = false;
        
        if (!isOnSessionPage && autoRestartRef.current) {
          // Wait a bit longer to ensure audio finished playing
          micRestartTimeoutRef.current = setTimeout(() => {
            console.log('[TTS] Resuming voice after TTS');
            resumeVoice();
            micRestartTimeoutRef.current = null;
          }, 500);
        }
      }).catch((err) => {
        console.error('[TTS] Failed to speak:', err);
        isTTSPlayingRef.current = false;
        // Ensure mic restarts even if TTS fails (only if always-on is enabled)
        if (!isOnSessionPage && autoRestartRef.current) {
          micRestartTimeoutRef.current = setTimeout(() => {
            console.log('[TTS] Resuming voice after TTS error');
            resumeVoice();
            micRestartTimeoutRef.current = null;
          }, 500);
        }
      });
    } else {
      // If TTS is disabled, just restart the mic immediately (only once)
      if (!isOnSessionPage && autoRestartRef.current && !isListening && !micRestartTimeoutRef.current) {
        micRestartTimeoutRef.current = setTimeout(() => {
          resumeVoice();
          micRestartTimeoutRef.current = null;
        }, 300);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (micRestartTimeoutRef.current) {
        clearTimeout(micRestartTimeoutRef.current);
        micRestartTimeoutRef.current = null;
      }
    };
  }, [commandResultKey, commandResult, settings.autoPlayTTS, speak, isOnSessionPage, resumeVoice, isListening]);
  // Keyboard shortcut (Space) to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))
      return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isListening) pauseVoice();else
        resumeVoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, pauseVoice, resumeVoice]);
  const executeDirectCommand = (text: string) => {
    executeCommand(`${assistantName} ${text}`);
  };
  return (
    <VoiceCommandContext.Provider
      value={{
        isListening,
        isProcessing,
        transcript,
        interimTranscript,
        lastCommand,
        commandResult,
        assistantName,
        startListening: startVoice,
        stopListening: stopVoice,
        pauseListening: pauseVoice,
        resumeListening: resumeVoice,
        setPageContext,
        toggleListening: isListening ? pauseVoice : resumeVoice,
        executeDirectCommand
      }}>

      {children}
    </VoiceCommandContext.Provider>);

}
export function useVoiceCommand() {
  const context = useContext(VoiceCommandContext);
  if (context === undefined) {
    throw new Error(
      'useVoiceCommand must be used within a VoiceCommandProvider'
    );
  }
  return context;
}