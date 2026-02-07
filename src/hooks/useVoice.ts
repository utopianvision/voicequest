import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { VoiceState } from '../types';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceOptions {
  alwaysOn?: boolean;
  silenceTimeout?: number;
}

export function useVoice(options: UseVoiceOptions = {}) {
  const { alwaysOn = false, silenceTimeout = 1500 } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [speechEnded, setSpeechEnded] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceStateRef = useRef<VoiceState>('idle');
  const autoRestartRef = useRef(alwaysOn);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);
  const silenceTimeoutRef = useRef(silenceTimeout);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedTranscriptRef = useRef('');
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync — these NEVER cause effect re-runs
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);
  useEffect(() => {
    autoRestartRef.current = alwaysOn;
  }, [alwaysOn]);
  useEffect(() => {
    silenceTimeoutRef.current = silenceTimeout;
  }, [silenceTimeout]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isSupported =
  typeof window !== 'undefined' && (
  'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const isListening = voiceState === 'listening';

  // All timer/state helpers use refs only — no state dependencies
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const doStart = useCallback(() => {
    if (!recognitionRef.current || !mountedRef.current) return;
    if (pausedRef.current) return;
    if (
    voiceStateRef.current === 'speaking' ||
    voiceStateRef.current === 'processing')

    return;

    // Reset ALL speech state for a clean new session
    accumulatedTranscriptRef.current = '';
    setSpeechEnded(false);
    setTranscript('');
    setInterimTranscript('');
    clearTimers();

    try {
      recognitionRef.current.start();
    } catch (e) {

      // Already started — fine
    }}, [clearTimers]);

  const doRestart = useCallback(() => {
    if (!autoRestartRef.current || pausedRef.current || !mountedRef.current)
    return;
    if (
    voiceStateRef.current === 'speaking' ||
    voiceStateRef.current === 'processing')

    return;

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || pausedRef.current) return;
      if (
      voiceStateRef.current === 'speaking' ||
      voiceStateRef.current === 'processing')

      return;
      doStart();
    }, 600);
  }, [doStart]);

  // Store doRestart in a ref so the recognition setup effect doesn't depend on it
  const doRestartRef = useRef(doRestart);
  useEffect(() => {
    doRestartRef.current = doRestart;
  }, [doRestart]);

  // === RECOGNITION SETUP — runs ONCE (only depends on isSupported) ===
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!mountedRef.current) return;
      setVoiceState('listening');
      voiceStateRef.current = 'listening';
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return;

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulatedTranscriptRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // Clear old transcript when new speech starts coming in
      // This is the ONLY place transcript gets cleared — not in doStart()
      if (accumulatedTranscriptRef.current) {
        setTranscript(accumulatedTranscriptRef.current);
      } else if (interim) {
        // New interim speech but no finals yet — show interim and clear old final
        setTranscript('');
      }
      setInterimTranscript(interim);

      // Reset silence timer via ref (avoids stale closure)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        const finalText = accumulatedTranscriptRef.current.trim();
        if (finalText.length >= 2) {
          setTranscript(finalText);
          setInterimTranscript('');
          setSpeechEnded(true);
        } else {
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          setInterimTranscript('');
        }
      }, silenceTimeoutRef.current);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return;
      // Suppress all common errors in always-on mode
      const silentErrors = [
      'no-speech',
      'aborted',
      'audio-capture',
      'network',
      'not-allowed'];

      if (silentErrors.includes(event.error)) return;

      setError(`Speech recognition error: ${event.error}`);
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Process any pending speech
      const pending = accumulatedTranscriptRef.current.trim();
      if (pending.length >= 2 && !pausedRef.current) {
        setTranscript(pending);
        setInterimTranscript('');
        setSpeechEnded(true);
        setVoiceState('idle');
        voiceStateRef.current = 'idle';
        return;
      }

      setVoiceState('idle');
      voiceStateRef.current = 'idle';
      setInterimTranscript('');

      // Auto-restart via ref
      if (autoRestartRef.current && !pausedRef.current) {
        doRestartRef.current();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognition.abort();
    };
  }, [isSupported]); // <-- ONLY depends on isSupported, runs once

  // Auto-start on mount if alwaysOn
  useEffect(() => {
    if (alwaysOn && isSupported && recognitionRef.current) {
      const timer = setTimeout(() => {
        if (mountedRef.current && voiceStateRef.current === 'idle') {
          doStart();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [alwaysOn, isSupported, doStart]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    pausedRef.current = false;
    doStart();
  }, [doStart]);

  const stopListening = useCallback(() => {
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {

        /* ignore */}
    }
    setVoiceState('idle');
    voiceStateRef.current = 'idle';
  }, [clearTimers]);

  const pauseListening = useCallback(() => {
    pausedRef.current = true;
    clearTimers();
    if (recognitionRef.current && voiceStateRef.current === 'listening') {
      try {
        recognitionRef.current.stop();
      } catch (e) {

        /* ignore */}
    }
  }, [clearTimers]);

  const resumeListening = useCallback(() => {
    pausedRef.current = false;
    if (autoRestartRef.current && mountedRef.current) {
      doStart();
    }
  }, [doStart]);

  const speak = useCallback(
    async (text: string, voiceId?: string): Promise<void> => {
      // Stop any currently playing audio first
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
          if (currentAudioRef.current.src.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudioRef.current.src);
          }
        } catch (e) {
          // Ignore errors when stopping
        }
        currentAudioRef.current = null;
      }
      
      pausedRef.current = true;
      clearTimers();
      if (recognitionRef.current && voiceStateRef.current === 'listening') {
        try {
          recognitionRef.current.stop();
        } catch (e) {

          /* ignore */}
      }

      setVoiceState('speaking');
      voiceStateRef.current = 'speaking';
      setError(null);

      return new Promise<void>((resolve) => {
        const finish = (success: boolean) => {
          if (!mountedRef.current) {
            resolve();
            return;
          }
          // Always reset to idle, even if TTS failed
          setVoiceState('idle');
          voiceStateRef.current = 'idle';
          currentAudioRef.current = null;
          pausedRef.current = false;
          // Don't restart mic here - let the VoiceCommandProvider handle it
          // This prevents conflicts and ensures proper timing
          resolve();
        };

        // Add timeout to TTS request
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TTS request timeout')), 10000);
        });

        Promise.race([
          api.textToSpeech(text, voiceId),
          timeoutPromise
        ]).
        then(async (audioData) => {
          if (!mountedRef.current) {
            resolve();
            return;
          }
          
          // Use HTMLAudioElement for MP3 playback (more reliable than AudioContext)
          const blob = new Blob([audioData], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          
          // Set volume to ensure it's audible
          audio.volume = 1.0;
          
          // Store reference to stop if needed
          currentAudioRef.current = audio;
          
          // Set up event handlers
          audio.onended = () => {
            console.log('[TTS] Audio playback completed');
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            finish(true);
          };
          
          audio.onerror = (e) => {
            console.error('[TTS] Audio playback error:', e, audio.error);
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            finish(false);
          };
          
          // Play the audio with proper error handling
          try {
            console.log('[TTS] Attempting to play audio...');
            await audio.play();
            console.log('[TTS] Audio playing successfully');
          } catch (playError: any) {
            console.error('[TTS] Failed to play audio:', playError);
            // For autoplay policy issues, try user interaction workaround
            if (playError.name === 'NotAllowedError' || playError.name === 'NotSupportedError') {
              console.warn('[TTS] Autoplay blocked, audio will play on next user interaction');
              // Create a one-time click handler to play audio
              const playOnInteraction = async () => {
                try {
                  await audio.play();
                  console.log('[TTS] Audio playing after user interaction');
                  document.removeEventListener('click', playOnInteraction);
                  document.removeEventListener('touchstart', playOnInteraction);
                } catch (e) {
                  console.error('[TTS] Still failed after interaction:', e);
                }
              };
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('touchstart', playOnInteraction, { once: true });
              // Still resolve - the audio will play when user interacts
              finish(true);
              return;
            }
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            finish(false);
            return;
          }
        }).
        catch((err) => {
          console.error('[TTS] Failed:', err?.message || err);
          setError('Failed to play audio. Check ElevenLabs API key.');
          // Always finish even on error to ensure mic can restart
          finish(false);
        });
      });
    },
    [clearTimers, doStart]
  );

  const stopSpeaking = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      // Clean up blob URL if it exists
      if (currentAudioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioRef.current.src);
      }
      currentAudioRef.current = null;
    }
    setVoiceState('idle');
    voiceStateRef.current = 'idle';
    pausedRef.current = false;
    if (autoRestartRef.current) doStart();
  }, [doStart]);

  return {
    voiceState,
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    speechEnded,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    speak,
    stopSpeaking,
    setVoiceState
  };
}