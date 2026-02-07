import React, { useEffect, useState } from 'react';
import { useUser } from '../hooks/useApi';
import { useAccessibility } from '../components/AccessibilityProvider';
import { api, CanvasCourse, CanvasAssignment } from '../lib/api';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Switch } from '@headlessui/react';
import {
  Volume2,
  Type,
  Eye,
  Zap,
  School,
  BookOpen,
  Trash2,
  CheckCircle,
  AlertCircle } from
'lucide-react';
export function Settings() {
  const { user, logout } = useUser();
  const { settings, updateSettings } = useAccessibility();
  // Canvas State
  const [canvasUrl, setCanvasUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [canvasSession, setCanvasSession] = useState<string | null>(
    localStorage.getItem('voicequest_canvas_session')
  );
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  // Fetch courses and assignments if connected
  useEffect(() => {
    if (canvasSession) {
      Promise.all([
      api.getCanvasCourses(canvasSession),
      api.getCanvasAssignments(canvasSession)]
      ).
      then(([coursesData, assignmentsData]) => {
        setCourses(coursesData.courses);
        setAssignments(assignmentsData.assignments);
      }).
      catch(() => {
        // If fetch fails, session might be invalid
        setCanvasSession(null);
        localStorage.removeItem('voicequest_canvas_session');
      });
    }
  }, [canvasSession]);
  const handleCanvasConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasUrl || !apiKey) {
      setCanvasError('Please provide both URL and API Key');
      return;
    }
    setIsConnecting(true);
    setCanvasError(null);
    try {
      const response = await api.canvasConnect(canvasUrl, apiKey, user?.id);
      if (response.success) {
        setCanvasSession(response.session_id);
        localStorage.setItem('voicequest_canvas_session', response.session_id);
        setCanvasUrl('');
        setApiKey('');
      }
    } catch (err) {
      setCanvasError('Failed to connect. Check your credentials.');
    } finally {
      setIsConnecting(false);
    }
  };
  const handleCanvasDisconnect = async () => {
    if (canvasSession) {
      try {
        await api.canvasDisconnect(canvasSession);
      } catch (e) {

        // Ignore error on disconnect
      }setCanvasSession(null);
      setCourses([]);
      setAssignments([]);
      localStorage.removeItem('voicequest_canvas_session');
    }
  };
  if (!user) return null;
  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your preferences and connections
        </p>
      </div>

      {/* Accessibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-500" />
            Accessibility & Experience
          </CardTitle>
          <CardDescription>
            Customize how VoiceQuest works for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Volume2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Auto-play Voice</p>
                <p className="text-sm text-slate-500">
                  Read tutor messages aloud automatically
                </p>
              </div>
            </div>
            <Switch
              checked={settings.autoPlayTTS}
              onChange={(checked: boolean) =>
              updateSettings({
                autoPlayTTS: checked
              })
              }
              className={`${settings.autoPlayTTS ? 'bg-indigo-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}>

              <span
                className={`${settings.autoPlayTTS ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />

            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Type className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Large Text</p>
                <p className="text-sm text-slate-500">
                  Increase text size for better readability
                </p>
              </div>
            </div>
            <Switch
              checked={settings.largeText}
              onChange={(checked: boolean) =>
              updateSettings({
                largeText: checked
              })
              }
              className={`${settings.largeText ? 'bg-indigo-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}>

              <span
                className={`${settings.largeText ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />

            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Eye className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">High Contrast</p>
                <p className="text-sm text-slate-500">
                  Increase contrast for better visibility
                </p>
              </div>
            </div>
            <Switch
              checked={settings.highContrast}
              onChange={(checked: boolean) =>
              updateSettings({
                highContrast: checked
              })
              }
              className={`${settings.highContrast ? 'bg-indigo-600' : 'bg-slate-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}>

              <span
                className={`${settings.highContrast ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />

            </Switch>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-orange-500" />
            Canvas LMS Integration
          </CardTitle>
          <CardDescription>
            Connect your school account for personalized quests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canvasSession ?
          <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900">
                    Connected to Canvas
                  </p>
                  <p className="text-sm text-emerald-700">
                    Jarvis can see your courses and assignments
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Your Courses
                </h3>
                {courses.length > 0 ?
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courses.map((course) =>
                <div
                  key={course.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">

                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <div className="overflow-hidden">
                          <p className="font-medium text-slate-900 truncate">
                            {course.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {course.course_code}
                          </p>
                        </div>
                      </div>
                )}
                  </div> :

              <p className="text-sm text-slate-500 italic">
                    No active courses found.
                  </p>
              }
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Assignments
                </h3>
                {assignments.length > 0 ?
              <div className="space-y-2">
                    {assignments.map((assignment) =>
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">

                        <div className="p-1.5 bg-orange-100 rounded-md mt-0.5">
                          <BookOpen className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {assignment.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            {(assignment as any).course_name &&
                      <span>{(assignment as any).course_name}</span>
                      }
                            {assignment.due_at &&
                      <>
                                <span className="text-slate-300">•</span>
                                <span>
                                  Due{' '}
                                  {new Date(
                            assignment.due_at
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                                </span>
                              </>
                      }
                          </div>
                        </div>
                      </div>
                )}
                  </div> :

              <p className="text-sm text-slate-500 italic">
                    No assignments found. Jarvis will fetch them from your
                    courses.
                  </p>
              }
              </div>

              <Button
              variant="outline"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              onClick={handleCanvasDisconnect}>

                <Trash2 className="mr-2 h-4 w-4" />
                Disconnect Account
              </Button>
            </div> :

          <form onSubmit={handleCanvasConnect} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Canvas URL
                </label>
                <Input
                placeholder="https://canvas.instructure.com"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                required />

                <p className="text-xs text-slate-500">
                  The web address you use to log in to Canvas
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  API Key
                </label>
                <Input
                type="password"
                placeholder="Your Canvas API Token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required />

                <p className="text-xs text-slate-500">
                  Go to Account &gt; Settings &gt; New Access Token in Canvas to
                  generate one.
                </p>
              </div>

              {canvasError &&
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
                  <AlertCircle className="h-4 w-4" />
                  {canvasError}
                </div>
            }

              <Button type="submit" isLoading={isConnecting} className="w-full">
                Connect Canvas
              </Button>
            </form>
          }
        </CardContent>
      </Card>

      {/* Account Actions */}
      <div className="pt-4">
        <Button
          variant="outline"
          className="w-full text-slate-600"
          onClick={logout}>

          Sign Out
        </Button>
      </div>
    </div>);

}