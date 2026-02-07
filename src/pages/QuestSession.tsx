import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useUser } from '../hooks/useApi';
import { useVoice } from '../hooks/useVoice';
import { useAccessibility } from '../components/AccessibilityProvider';
import { VoiceOrb } from '../components/VoiceOrb';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Quest, ConversationMessage } from '../types';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Volume2,
  VolumeX,
  Trophy,
  Star } from
'lucide-react';
export function QuestSession() {
  const { questId } = useParams<{
    questId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { settings } = useAccessibility();
  // Voice hook - direct interaction, no wake word needed here
  // NOT alwaysOn — we manually start/stop to avoid mic glitching
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    speak,
    stopSpeaking,
    voiceState: rawVoiceState,
    isSupported,
    speechEnded
  } = useVoice({
    alwaysOn: false,
    silenceTimeout: 2500
  });
  // Session State
  const [quest, setQuest] = useState<Quest | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef<string>('');
  // Derived voice state for UI
  const voiceState = isProcessing ? 'processing' : rawVoiceState;
  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, interimTranscript]);
  // Initial setup - Start Quest
  useEffect(() => {
    const initSession = async () => {
      if (!questId || !user) return;
      try {
        // 1. Fetch Quest Details (for title/theme)
        const questsData = await api.getQuests(user.id);
        const questData = questsData.quests.find(
          (q) => q.id === Number(questId)
        );
        if (!questData) throw new Error('Quest not found');
        setQuest(questData);
        // 2. Start Session on Backend
        const sessionData = await api.startQuest(Number(questId), user.id);
        const session = sessionData.session;
        setSessionId(session.session_id);
        setMessages(session.messages);
        setCurrentQuestion(session.current_question);
        setTotalQuestions(session.total_questions);
        setScore(session.score);
        // Speak the first message (tutor greeting), then start listening
        if (session.messages.length > 0) {
          const firstMsg = session.messages[0].content;
          if (settings.autoPlayTTS) {
            // speak() pauses/resumes listening internally, and after speaking
            // the onended callback will resume. But since alwaysOn is false,
            // we need to manually start after speak completes.
            await speak(firstMsg);
            // Small delay then start listening for user's first answer
            setTimeout(() => startListening(), 500);
          } else {
            // No TTS — start listening right away
            setTimeout(() => startListening(), 800);
          }
        }
      } catch (err) {
        console.error('Failed to init session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [questId, user]);
  // Handle Voice Response (Auto-submit)
  useEffect(() => {
    const submitResponse = async () => {
      if (
      speechEnded &&
      transcript &&
      transcript !== processedRef.current &&
      !isProcessing &&
      !isComplete)
      {
        processedRef.current = transcript;
        await handleUserResponse(transcript);
      }
    };
    submitResponse();
  }, [speechEnded, transcript, isProcessing, isComplete]);
  const handleUserResponse = async (text: string) => {
    if (!sessionId || !text.trim()) return;
    // Optimistically add user message
    const userMsg: ConversationMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    stopListening();
    try {
      const response = await api.respondToQuest(sessionId, text);
      // Add tutor response
      const tutorMsg: ConversationMessage = {
        role: 'tutor',
        content: response.tutor_message,
        timestamp: new Date().toISOString(),
        is_correct: response.is_correct,
        feedback: response.feedback
      };
      setMessages((prev) => [...prev, tutorMsg]);
      // Update state
      setScore((prev) => prev + response.score_delta);
      setCurrentQuestion(response.current_question);
      // Check completion
      if (response.quest_complete) {
        setIsComplete(true);
        setXpEarned(response.xp_earned || 0);
        // Play completion TTS but don't restart listening
        if (settings.autoPlayTTS) {
          speak(response.tutor_message);
        }
      } else {
        // Play TTS then restart listening for next answer
        if (settings.autoPlayTTS) {
          await speak(response.tutor_message);
          setTimeout(() => startListening(), 500);
        } else {
          // No TTS — restart listening after a brief pause
          setTimeout(() => startListening(), 800);
        }
      }
    } catch (err) {
      console.error('Failed to respond:', err);
      setMessages((prev) => [
      ...prev,
      {
        role: 'tutor',
        content:
        "I'm having trouble connecting to the server. Please try again.",
        timestamp: new Date().toISOString()
      }]
      );
      // Restart listening so user can try again
      setTimeout(() => startListening(), 1000);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        processedRef.current = '';
      }, 1000);
    }
  };
  // Manual toggle for mic
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-indigo-200 animate-pulse">
            Preparing your adventure...
          </p>
        </div>
      </div>);

  }
  if (isComplete) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none" />

        <Card className="w-full max-w-md bg-slate-900/80 border-slate-800 backdrop-blur-xl p-8 text-center relative z-10 animate-in zoom-in duration-500">
          <div className="mx-auto h-24 w-24 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Trophy className="h-12 w-12 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Quest Complete!
          </h1>
          <p className="text-slate-400 mb-8">You've mastered {quest?.title}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Score
              </p>
              <p className="text-2xl font-bold text-emerald-400">{score}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                XP Earned
              </p>
              <p className="text-2xl font-bold text-amber-400">+{xpEarned}</p>
            </div>
          </div>

          <Button
            className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700"
            onClick={() => navigate('/dashboard')}>

            Return to Dashboard
          </Button>
        </Card>
      </div>);

  }
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10 bg-slate-900/50 backdrop-blur-md border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/quests')}
          className="text-slate-300 hover:text-white hover:bg-white/5">

          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit
        </Button>

        <div className="flex flex-col items-center">
          <h1 className="font-bold text-sm md:text-lg text-slate-200">
            {quest?.title}
          </h1>
          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-1.5" />Q
              {currentQuestion}/{totalQuestions}
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center text-emerald-400">
              <Star className="w-3 h-3 mr-1 fill-emerald-400" />
              {score} pts
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:text-white hover:bg-white/5"
          onClick={() =>
          settings.autoPlayTTS ?
          stopSpeaking() :
          speak(messages[messages.length - 1]?.content || '')
          }>

          {rawVoiceState === 'speaking' ?
          <Volume2 className="h-5 w-5 text-emerald-400 animate-pulse" /> :

          <VolumeX className="h-5 w-5" />
          }
        </Button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.map((msg, idx) =>
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>

            <div
            className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3.5 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'}`}>

              <p className="leading-relaxed">{msg.content}</p>

              {/* Feedback indicator for tutor messages */}
              {msg.role === 'tutor' && msg.is_correct !== undefined &&
            <div
              className={`mt-2 text-xs font-bold uppercase tracking-wider flex items-center ${msg.is_correct ? 'text-emerald-400' : 'text-amber-400'}`}>

                  {msg.is_correct ?
              <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
                      Correct Answer
                    </> :

              <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2" />
                      Needs Improvement
                    </>
              }
                </div>
            }
            </div>
          </div>
        )}

        {/* Live Transcript Bubble */}
        {isListening && (interimTranscript || transcript) &&
        <div className="flex justify-end animate-in fade-in duration-200">
            <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-indigo-600/40 text-white/80 rounded-br-sm border border-indigo-500/30 backdrop-blur-sm">
              <p>
                {interimTranscript || transcript}
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-300 align-middle animate-pulse rounded-full" />
              </p>
            </div>
          </div>
        }

        {/* Processing Indicator */}
        {isProcessing &&
        <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-slate-800/50 rounded-2xl px-4 py-3 rounded-bl-sm border border-slate-700/50 flex items-center space-x-2">
              <div className="flex space-x-1">
                <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{
                  animationDelay: '0ms'
                }} />

                <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{
                  animationDelay: '150ms'
                }} />

                <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{
                  animationDelay: '300ms'
                }} />

              </div>
            </div>
          </div>
        }

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Voice Interaction Area */}
      <div className="p-6 pb-12 flex flex-col items-center justify-center z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
        {/* Status Text */}
        <p className="text-slate-400 text-sm mb-6 h-6 text-center font-medium tracking-wide">
          {voiceState === 'listening' ?
          'Listening...' :
          voiceState === 'processing' ?
          'Thinking...' :
          voiceState === 'speaking' ?
          'Speaking...' :
          'Tap to speak'}
        </p>

        {/* Main Orb Button */}
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className="relative group focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          aria-label={isListening ? 'Stop listening' : 'Start listening'}>

          {/* Glow effect */}
          <div
            className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${isListening ? 'bg-indigo-500/40 opacity-100' : 'bg-indigo-500/0 opacity-0'}`} />


          <VoiceOrb
            state={voiceState}
            className="cursor-pointer transition-transform duration-200 group-active:scale-95" />


          {/* Icon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {isProcessing ?
            <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            isListening ?
            <Mic className="h-8 w-8 text-white animate-pulse" /> :

            <MicOff className="h-8 w-8 text-white/40 group-hover:text-white transition-colors" />
            }
          </div>
        </button>

        {!isSupported &&
        <p className="text-rose-400 text-xs mt-6 bg-rose-950/30 px-4 py-2 rounded-full border border-rose-500/20 flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2" />
            Browser speech recognition not supported
          </p>
        }
      </div>
    </div>);

}