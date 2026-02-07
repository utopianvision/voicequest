import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, JarvisChatResponse } from '../lib/api';
import { Quest } from '../types';

// Configurable assistant name — change this to rename the assistant
const ASSISTANT_NAME = 'Jarvis';
const WAKE_WORD = ASSISTANT_NAME.toLowerCase();

export interface CommandResult {
  type:
  'navigation' |
  'action' |
  'error' |
  'feedback' |
  'login' |
  'create_quest';
  message: string;
  action?: () => void;
  loginName?: string;
  questTopic?: string;
}

export interface PageContext {
  quests?: Quest[];
  onFilter?: (topic: string) => void;
  onStartQuest?: (questId: number) => void;
  canvasCourses?: {id: number;name: string;}[];
  canvasAssignments?: {
    id: number;
    name: string;
    course_name?: string;
    due_at?: string;
  }[];
}

export function useVoiceCommands(
transcript: string,
interimTranscript: string,
pageContext: PageContext | null,
speechEnded: boolean,
pauseListening: () => void,
resumeListening: () => void,
userLoggedIn: boolean,
userName: string)
{
  const navigate = useNavigate();
  const location = useLocation();
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedTranscriptRef = useRef<string>('');
  const isProcessingRef = useRef(false);
  const lastCommandResultRef = useRef<CommandResult | null>(null);
  const sessionIdRef = useRef<string>(
    `jarvis_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  // Clear old results when new speech starts, but preserve lastCommand if processing
  // Only clear if we're not currently processing to avoid clearing while TTS is playing
  useEffect(() => {
    if (interimTranscript && !isProcessingRef.current) {
      // Only clear if we have new interim text (user is speaking again)
      setCommandResult(null);
      // Don't clear lastCommand here - let it persist until new command is processed
    }
  }, [interimTranscript]);

  const handleAIResponse = useCallback(
    (response: JarvisChatResponse): CommandResult => {
      switch (response.intent) {
        case 'login':
          return {
            type: 'login',
            message: response.message,
            loginName: response.target
          };

        case 'navigate':
          return {
            type: 'navigation',
            message: response.message,
            action: () => navigate(response.target)
          };

        case 'logout':
          return {
            type: 'navigation',
            message: response.message,
            action: () => navigate('/')
          };

        case 'create_quest':
          return {
            type: 'create_quest',
            message: response.message,
            questTopic: response.target
          };

        case 'start_quest':{
            const questId = parseInt(response.target, 10);
            if (!isNaN(questId)) {
              return {
                type: 'action',
                message: response.message,
                action: () =>
                pageContext?.onStartQuest ?
                pageContext.onStartQuest(questId) :
                navigate(`/session/${questId}`)
              };
            }
            // Try matching by name
            const match = pageContext?.quests?.find((q) =>
            q.title.toLowerCase().includes(response.target.toLowerCase())
            );
            if (match) {
              return {
                type: 'action',
                message: response.message,
                action: () =>
                pageContext?.onStartQuest ?
                pageContext.onStartQuest(match.id) :
                navigate(`/session/${match.id}`)
              };
            }
            return {
              type: 'navigation',
              message: response.message || 'Taking you to quests.',
              action: () => navigate('/quests')
            };
          }

        case 'filter':
          if (pageContext?.onFilter) {
            return {
              type: 'action',
              message: response.message,
              action: () => pageContext.onFilter?.(response.target)
            };
          }
          return {
            type: 'navigation',
            message: response.message || 'Taking you to quests.',
            action: () => navigate('/quests')
          };

        case 'help':
          return { type: 'feedback', message: response.message };

        case 'greeting':
        case 'chat':
        default:
          return { type: 'feedback', message: response.message };
      }
    },
    [navigate, pageContext]
  );

  const executeCommand = useCallback(
    async (text: string) => {
      const trimmed = text.
      trim().
      replace(/[.,!?;:]+$/g, '').
      trim();
      if (!trimmed || trimmed.length < 2) return;
      if (isProcessingRef.current) return;

      // --- Wake word gate ---
      const lowerTrimmed = trimmed.toLowerCase();
      const wakeWordIndex = lowerTrimmed.indexOf(WAKE_WORD);

      if (wakeWordIndex === -1) {
        // No wake word → ignore silently
        return;
      }

      // Extract the part after the wake word
      const afterWake = trimmed.
      substring(wakeWordIndex + WAKE_WORD.length).
      replace(/^[,\s]+/, '').
      trim();

      // Display what the user said (the full command after wake word, or just the name if nothing after)
      const displayText = afterWake || ASSISTANT_NAME;
      // Set lastCommand and isProcessing immediately to avoid delay showing base message
      setLastCommand(displayText);
      setCommandResult(null);
      isProcessingRef.current = true;
      setIsProcessing(true);
      pauseListening();

      // If they just said "Jarvis" with nothing after, still send to AI (it'll respond with a greeting)
      const messageToSend = afterWake || 'hello';

      // --- Send to Jarvis AI ---

      try {
        const questContext =
        pageContext?.quests?.map((q) => ({
          id: q.id,
          title: q.title,
          topic: q.topic
        })) || [];

        // Build Canvas context if available
        const canvasContext: {
          courses?: Array<{id: number; name: string}>;
          assignments?: Array<{id: number; name: string; course_name?: string; due_at?: string}>;
        } = {};
        if (pageContext?.canvasCourses?.length) {
          canvasContext.courses = pageContext.canvasCourses;
        }
        if (pageContext?.canvasAssignments?.length) {
          canvasContext.assignments = pageContext.canvasAssignments;
        }

        const response = await Promise.race([
        api.jarvisChat({
          session_id: sessionIdRef.current,
          message: messageToSend,
          context: {
            current_page: location.pathname,
            user_logged_in: userLoggedIn,
            user_name: userName,
            available_quests: questContext,
            canvas_data:
            Object.keys(canvasContext).length > 0 ?
            canvasContext :
            undefined
          }
        }),
        new Promise<JarvisChatResponse>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
        )]
        );

        const result = handleAIResponse(response);
        
        // Only set commandResult if it's different from the last one
        const resultKey = JSON.stringify({
          type: result.type,
          message: result.message,
          loginName: result.loginName,
          questTopic: result.questTopic
        });
        const lastKey = lastCommandResultRef.current ? JSON.stringify({
          type: lastCommandResultRef.current.type,
          message: lastCommandResultRef.current.message,
          loginName: lastCommandResultRef.current.loginName,
          questTopic: lastCommandResultRef.current.questTopic
        }) : null;
        
        if (resultKey !== lastKey) {
          lastCommandResultRef.current = result;
          setCommandResult(result);
        }

        // Execute action (navigate, etc.) — but NOT login, that's handled by the provider
        if (result.action) result.action();
      } catch (err: any) {
        const msg = err?.message || '';
        let errorMsg: string;
        if (msg === 'timeout') {
          errorMsg = 'Jarvis timed out. Make sure Flask is running.';
        } else if (
        msg.includes('Cannot reach') ||
        msg.includes('Load failed') ||
        msg.includes('Failed to fetch'))
        {
          errorMsg = msg;
        } else {
          errorMsg = `Jarvis error: ${msg}`;
        }
        console.error('[Jarvis]', errorMsg);
        const errorResult: CommandResult = { type: 'error', message: errorMsg };
        // Only set if different from last error
        if (lastCommandResultRef.current?.type !== 'error' || 
            lastCommandResultRef.current?.message !== errorMsg) {
          lastCommandResultRef.current = errorResult;
          setCommandResult(errorResult);
        }
      }

      isProcessingRef.current = false;
      setIsProcessing(false);
      // Don't resume here - let the VoiceCommandProvider handle it after TTS
      // The provider will restart the mic after TTS completes or fails
    },
    [
    handleAIResponse,
    pauseListening,
    resumeListening,
    location.pathname,
    pageContext,
    userLoggedIn,
    userName]

  );

  // Trigger when speech ends
  useEffect(() => {
    if (
    speechEnded &&
    transcript &&
    transcript !== processedTranscriptRef.current)
    {
      processedTranscriptRef.current = transcript;
      executeCommand(transcript);
    }
  }, [speechEnded, transcript, executeCommand]);

  // Reset processed ref when transcript clears
  useEffect(() => {
    if (!transcript) {
      processedTranscriptRef.current = '';
    }
  }, [transcript]);

  return {
    lastCommand,
    commandResult,
    isProcessing,
    executeCommand,
    assistantName: ASSISTANT_NAME
  };
}