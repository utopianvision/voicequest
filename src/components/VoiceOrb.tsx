import React from 'react';
import { VoiceState } from '../types';
interface VoiceOrbProps {
  state: VoiceState;
  className?: string;
}
export function VoiceOrb({ state, className = '' }: VoiceOrbProps) {
  // Determine animation and color based on state
  const getStateStyles = () => {
    switch (state) {
      case 'listening':
        return 'bg-indigo-500 shadow-indigo-500/50 animate-pulse scale-110';
      case 'processing':
        return 'bg-amber-500 shadow-amber-500/50 animate-spin';
      case 'speaking':
        return 'bg-emerald-500 shadow-emerald-500/50 animate-bounce';
      case 'error':
        return 'bg-rose-500 shadow-rose-500/50';
      case 'idle':
      default:
        return 'bg-slate-400 shadow-slate-400/30';
    }
  };
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer glow rings */}
      <div
        className={`absolute inset-0 rounded-full opacity-30 blur-xl transition-all duration-500 ${state === 'listening' ? 'bg-indigo-500 scale-150' : state === 'speaking' ? 'bg-emerald-500 scale-150' : state === 'processing' ? 'bg-amber-500 scale-125' : 'bg-slate-400 scale-100'}`} />


      {/* Core Orb */}
      <div
        className={`h-32 w-32 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${getStateStyles()}`}
        role="status"
        aria-label={`Voice assistant is ${state}`}>

        {/* Inner detail */}
        <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm" />
      </div>

      {/* Ripple effect for speaking/listening */}
      {(state === 'listening' || state === 'speaking') &&
      <>
          <div
          className={`absolute inset-0 rounded-full border-4 opacity-0 animate-ping ${state === 'listening' ? 'border-indigo-500' : 'border-emerald-500'}`}
          style={{
            animationDuration: '2s'
          }} />

          <div
          className={`absolute inset-0 rounded-full border-4 opacity-0 animate-ping ${state === 'listening' ? 'border-indigo-500' : 'border-emerald-500'}`}
          style={{
            animationDuration: '2s',
            animationDelay: '0.5s'
          }} />

        </>
      }
    </div>);

}