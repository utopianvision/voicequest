import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map, User, Settings, Mic } from 'lucide-react';
import { useVoiceCommand } from './VoiceCommandProvider';
import { VoiceCommandBar } from './VoiceCommandBar';
export function Navbar() {
  const location = useLocation();
  const { isListening } = useVoiceCommand();
  const isActive = (path: string) => location.pathname === path;
  const navItems = [
  {
    path: '/dashboard',
    icon: Home,
    label: 'Home'
  },
  {
    path: '/quests',
    icon: Map,
    label: 'Quests'
  },
  {
    path: '/profile',
    icon: User,
    label: 'Profile'
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings'
  }];

  // Don't show navbar on login page or active quest session
  if (location.pathname === '/' || location.pathname.includes('/session'))
  return null;
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-30 md:sticky md:top-12 md:border-t-0 md:border-b md:h-16 md:flex md:items-center md:justify-between md:px-8 shadow-lg md:shadow-sm">
        {/* Mobile View */}
        <div className="flex justify-between items-center md:hidden pt-2 px-6 pb-20">
          {navItems.map((item) =>
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-colors ${isActive(item.path) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}>

              <item.icon
              className={`h-6 w-6 ${isActive(item.path) ? 'fill-current' : ''}`} />

              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:flex items-center space-x-2">
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center mr-2 transition-colors ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-600'}`}>

            <Mic className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            VoiceQuest
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) =>
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>

              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )}
        </div>
      </nav>
      {/* Voice Command Bar integrated into bottom nav */}
      <VoiceCommandBar />
    </>);

}