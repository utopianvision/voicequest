import React, { useEffect, useState, createContext, useContext } from 'react';
import { AccessibilitySettings } from '../types';
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReaderEnabled: false,
  autoPlayTTS: true,
  speechRate: 1.0
};
const AccessibilityContext = createContext<
  AccessibilityContextType | undefined>(
  undefined);
export function AccessibilityProvider({
  children


}: {children: React.ReactNode;}) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('voicequest_a11y');
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  useEffect(() => {
    localStorage.setItem('voicequest_a11y', JSON.stringify(settings));
    // Apply classes to document root
    const root = document.documentElement;
    if (settings.highContrast) root.classList.add('high-contrast');else
    root.classList.remove('high-contrast');
    if (settings.largeText) root.classList.add('large-text');else
    root.classList.remove('large-text');
    if (settings.reducedMotion) root.classList.add('reduced-motion');else
    root.classList.remove('reduced-motion');
  }, [settings]);
  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings
    }));
  };
  const resetSettings = () => setSettings(defaultSettings);
  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings
      }}>

      {children}
    </AccessibilityContext.Provider>);

}
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      'useAccessibility must be used within an AccessibilityProvider'
    );
  }
  return context;
}