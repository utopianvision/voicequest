import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useVoiceCommand } from './VoiceCommandProvider';
import { VoiceOrb } from './VoiceOrb';
import { Card } from './ui/Card';
import {
  Mic,
  MicOff,
  HelpCircle,
  X,
  Command,
  Loader2,
  Radio,
  AlertTriangle,
  Bot } from
'lucide-react';
export function VoiceCommandBar() {
  const {
    isListening,
    isProcessing,
    toggleListening,
    interimTranscript,
    commandResult,
    lastCommand,
    assistantName,
    executeDirectCommand
  } = useVoiceCommand();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const getContextualSuggestions = () => {
    const path = location.pathname;
    if (path === '/dashboard') return ['Start a quest', 'Go to profile', 'Help'];
    if (path === '/quests')
    return ['Show science quests', 'Start quest one', 'Go home'];
    if (path === '/profile') return ['Go to dashboard', 'Settings'];
    return ['Go home', 'Show quests', 'Help'];
  };
  const suggestions = getContextualSuggestions();
  const orbState = isListening ?
  'listening' :
  isProcessing ?
  'processing' :
  'idle';
  // Don't show on login page (has its own voice UI) or active quest session
  if (location.pathname === '/' || location.pathname.includes('/session'))
  return null;
  // Only show interim speech starting from the wake word — feels like the app isn't listening otherwise
  const wakeWord = assistantName.toLowerCase();
  const wakeIndex = interimTranscript.toLowerCase().indexOf(wakeWord);
  const filteredInterim =
  wakeIndex !== -1 ? interimTranscript.substring(wakeIndex) : '';
  // Display: filtered interim (only from wake word) > lastCommand (already processed) > nothing
  // Always show lastCommand if it exists and we're not actively speaking, to avoid showing base message
  const displayText =
  filteredInterim || (lastCommand ? lastCommand : null);
  const isLiveSpeech = !!filteredInterim;
  return (
    <>
      {/* Compact bar integrated into bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 z-35 md:hidden shadow-sm">
        <div className="px-4 py-2 flex items-center gap-3">
          {/* Voice Orb Button */}
          <button
            onClick={toggleListening}
            disabled={isProcessing}
            className="relative group focus:outline-none disabled:opacity-50 flex-shrink-0"
            aria-label={isListening ? 'Pause voice' : 'Resume voice'}>
            <VoiceOrb state={orbState} className="scale-75" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {isProcessing ?
              <Loader2 className="h-4 w-4 text-white animate-spin" /> :
              isListening ?
              <Mic className="h-4 w-4 text-white animate-pulse" /> :
              <MicOff className="h-4 w-4 text-slate-400" />
              }
            </div>
          </button>

          {/* Text Display */}
          <div className="flex-1 min-w-0" aria-live="polite" aria-atomic="true">
            {displayText ?
            <p className={`text-sm font-medium truncate ${isLiveSpeech ? 'text-slate-500' : 'text-slate-800'}`}>
              &ldquo;{displayText}&rdquo;
            </p> :
            isProcessing ?
            <div className="flex items-center gap-2 text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
              <p className="text-xs font-medium truncate">
                {assistantName} is thinking...
              </p>
            </div> :
            commandResult ?
            <p className={`text-xs font-medium truncate ${commandResult.type === 'error' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {commandResult.message}
            </p> :
            <p className="text-xs text-slate-400 truncate">
              {isListening ? `Say "${assistantName}"...` : 'Voice paused'}
            </p>
            }
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
            title="Help">
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop: Top bar */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 h-12 overflow-visible">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          {/* Left: Status */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isListening ?
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" /> :
              <div className={`h-2 w-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
              }
              <span className="text-xs font-medium text-slate-600">
                {isListening ? 'Listening' : isProcessing ? 'Processing...' : 'Ready'}
              </span>
            </div>
            {displayText &&
            <p className="text-sm font-medium text-slate-800 truncate">
              &ldquo;{displayText}&rdquo;
            </p>
            }
            {isProcessing && !displayText &&
            <div className="flex items-center gap-2 text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <p className="text-xs font-medium">
                {assistantName} is thinking...
              </p>
            </div>
            }
            {commandResult && !displayText && !isProcessing &&
            <p className={`text-xs font-medium truncate ${commandResult.type === 'error' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {commandResult.message}
            </p>
            }
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3 flex-shrink-0 h-full py-1 overflow-visible">
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className="relative group focus:outline-none disabled:opacity-50 flex-shrink-0 h-full flex items-center overflow-visible"
              aria-label={isListening ? 'Pause voice' : 'Resume voice'}>
              <VoiceOrb state={orbState} className="scale-[0.35] origin-center" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {isProcessing ?
                <Loader2 className="h-4 w-4 text-white animate-spin" /> :
                isListening ?
                <Mic className="h-4 w-4 text-white animate-pulse" /> :
                <MicOff className="h-4 w-4 text-slate-400" />
                }
              </div>
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
              title="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Popover */}
      {showHelp &&
      <div className="fixed z-50 bottom-28 md:top-14 left-4 right-4 md:left-auto md:right-8 md:w-80 animate-in fade-in zoom-in-95 duration-200">
          <Card className="shadow-xl border-slate-200">
            <div className="flex justify-between items-center p-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-sm">{assistantName} Commands</h3>
              </div>
              <button onClick={() => setShowHelp(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="p-3 space-y-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg text-indigo-700 text-xs">
                <Bot className="h-3.5 w-3.5" />
                <span className="font-medium">
                  Say &ldquo;{assistantName}&rdquo; to activate, then your
                  command
                </span>
              </div>
              <div>
                <p className="font-semibold text-indigo-600 text-xs uppercase mb-1">
                  Navigation
                </p>
                <ul className="text-slate-600 space-y-1 pl-2 border-l-2 border-indigo-100">
                  <li>
                    &ldquo;{assistantName}, take me to the dashboard&rdquo;
                  </li>
                  <li>&ldquo;{assistantName}, open my profile&rdquo;</li>
                  <li>&ldquo;{assistantName}, go to settings&rdquo;</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-emerald-600 text-xs uppercase mb-1">
                  Quests
                </p>
                <ul className="text-slate-600 space-y-1 pl-2 border-l-2 border-emerald-100">
                  <li>&ldquo;{assistantName}, start a quest&rdquo;</li>
                  <li>&ldquo;{assistantName}, show science quests&rdquo;</li>
                  <li>&ldquo;{assistantName}, start quest one&rdquo;</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-purple-600 text-xs uppercase mb-1">
                  General
                </p>
                <ul className="text-slate-600 space-y-1 pl-2 border-l-2 border-purple-100">
                  <li>&ldquo;{assistantName}, help&rdquo;</li>
                  <li>&ldquo;{assistantName}, log out&rdquo;</li>
                </ul>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                Press{' '}
                <kbd className="font-mono bg-slate-100 px-1 rounded">Space</kbd>{' '}
                to pause/resume listening
              </p>
            </div>
          </Card>
        </div>
      }
    </>);

}