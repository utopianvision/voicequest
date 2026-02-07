import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation } from
'react-router-dom';
import { AccessibilityProvider } from './components/AccessibilityProvider';
import { VoiceCommandProvider } from './components/VoiceCommandProvider';
import { VoiceCommandBar } from './components/VoiceCommandBar';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { QuestMap } from './pages/QuestMap';
import { QuestSession } from './pages/QuestSession';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { useUser } from './hooks/useApi';
// Protected Route Wrapper
function ProtectedRoute({ children }: {children: React.ReactNode;}) {
  const { user } = useUser();
  const location = useLocation();
  if (!user) {
    return (
      <Navigate
        to="/"
        state={{
          from: location
        }}
        replace />);


  }
  return <>{children}</>;
}
// Layout wrapper for pages with Navbar
function AppLayout({ children }: {children: React.ReactNode;}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased transition-colors duration-300 overflow-visible">
      <main className="max-w-3xl mx-auto px-4 py-6 md:py-12 min-h-[calc(100vh-80px)] pb-24 md:pb-8 overflow-visible">
        {children}
      </main>
      <Navbar />
    </div>);

}
export function App() {
  return (
    <AccessibilityProvider>
      <Router>
        <VoiceCommandProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/" element={<LoginPage />} />

            {/* Protected Routes with Layout */}
            <Route
              path="/dashboard"
              element={
              <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />


            <Route
              path="/quests"
              element={
              <ProtectedRoute>
                  <AppLayout>
                    <QuestMap />
                  </AppLayout>
                </ProtectedRoute>
              } />


            <Route
              path="/profile"
              element={
              <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              } />


            <Route
              path="/settings"
              element={
              <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />


            {/* Full Screen Session (No Layout) */}
            <Route
              path="/session/:questId"
              element={
              <ProtectedRoute>
                  <QuestSession />
                </ProtectedRoute>
              } />


            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </VoiceCommandProvider>
      </Router>
    </AccessibilityProvider>);

}