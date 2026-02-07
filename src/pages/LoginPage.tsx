import React, { useState } from 'react';
import { useVoiceCommand } from '../components/VoiceCommandProvider';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { VoiceOrb } from '../components/VoiceOrb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
import { Mic, Sparkles, AlertCircle, Keyboard, Bot } from 'lucide-react';
import { useUser } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';
export function LoginPage() {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textUsername, setTextUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useUser();
  const navigate = useNavigate();
  const {
    isListening,
    isProcessing,
    interimTranscript,
    lastCommand,
    commandResult,
    assistantName,
    pauseListening,
    resumeListening
  } = useVoiceCommand();
  const handleTextLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textUsername.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await login(textUsername.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };
  // Only show live speech starting from the wake word
  const wakeWord = assistantName.toLowerCase();
  const wakeIndex = interimTranscript.toLowerCase().indexOf(wakeWord);
  const filteredInterim =
  wakeIndex !== -1 ? interimTranscript.substring(wakeIndex) : '';
  // Always show lastCommand if it exists and we're not actively speaking, to avoid showing base message
  const displayText =
  filteredInterim || (lastCommand ? lastCommand : null);
  const isLiveSpeech = !!filteredInterim;
  const isLoginProcessing = commandResult?.type === 'login';
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <Card className="w-full max-w-md relative overflow-hidden border-0 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-2 relative">
            <Bot className="h-10 w-10 text-indigo-600" />
            {isListening &&
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
            }
          </div>
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            VoiceQuest
          </CardTitle>
          <CardDescription className="text-base">
            Level up your knowledge with voice-powered learning adventures!
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {mode === 'voice' ?
          <div className="flex flex-col items-center space-y-5">
              {/* Jarvis prompt */}
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Bot className="h-4 w-4 text-indigo-600" />
                <p className="text-sm font-medium text-indigo-700">
                  Say{' '}
                  <span className="font-bold">
                    &ldquo;{assistantName}, my name is ...&rdquo;
                  </span>
                </p>
              </div>

              {/* Voice Orb */}
              <div className="relative py-2">
                <VoiceOrb
                state={
                isListening ?
                'listening' :
                isProcessing ?
                'processing' :
                'idle'
                }
                className="cursor-default" />

              </div>

              {/* Live speech / command display */}
              <div
              className="w-full min-h-[60px] text-center"
              aria-live="polite"
              aria-atomic="true">

                {displayText ?
              <p
                className={`text-lg font-medium ${isLiveSpeech ? 'text-slate-500 animate-pulse' : 'text-slate-800'}`}>

                    &ldquo;{displayText}&rdquo;
                  </p> :

              <p className="text-sm text-slate-400">
                    {isListening ?
                `${assistantName} is listening...` :
                'Voice paused'}
                  </p>
              }

                {/* Jarvis response */}
                {!isLiveSpeech && isProcessing &&
              <div className="flex items-center justify-center gap-2 mt-2 text-amber-600">
                    <div className="h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">
                      {assistantName} is thinking...
                    </p>
                  </div>
              }

                {!isLiveSpeech && !isProcessing && commandResult &&
              <div
                className={`mt-2 text-sm font-medium ${commandResult.type === 'error' ? 'text-rose-600' : commandResult.type === 'login' ? 'text-emerald-600' : 'text-indigo-600'}`}>

                    {commandResult.type === 'login' &&
                <Sparkles className="inline h-4 w-4 mr-1" />
                }
                    {commandResult.message}
                  </div>
              }
              </div>

              {/* Voice error */}
              {error &&
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm w-full">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
            }

              {/* Switch to text mode */}
              <button
              onClick={() => {
                setMode('text');
                pauseListening();
              }}
              className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded px-2 py-1">

                <Keyboard className="h-3.5 w-3.5" />
                Prefer to type? Click here
              </button>
            </div> :

          <form onSubmit={handleTextLogin} className="space-y-6">
              <div className="space-y-2">
                <Input
                placeholder="Enter your hero name..."
                value={textUsername}
                onChange={(e) => {
                  setTextUsername(e.target.value);
                  setError(null);
                }}
                className="text-lg h-14 text-center"
                autoFocus
                required />

              </div>

              {error &&
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
            }

              <Button
              type="submit"
              className="w-full h-14 text-lg font-bold group"
              disabled={isLoading || !textUsername.trim()}
              isLoading={isLoading}>

                {!isLoading &&
              <Sparkles className="mr-2 h-5 w-5 text-yellow-300 group-hover:animate-spin" />
              }
                Start Adventure
              </Button>

              <button
              type="button"
              onClick={() => {
                setMode('voice');
                resumeListening();
              }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 transition-colors">

                <Mic className="h-3.5 w-3.5" />
                Use voice instead
              </button>
            </form>
          }

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              Powered by {assistantName} • OpenAI & ElevenLabs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>);

}