import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import SafeImage from '../components/SafeImage';
import ErrorBoundary from '../components/ErrorBoundary';
import ErrorState from '../components/ErrorState';
import { DashboardSkeleton, AnalyticsChartSkeleton } from '../components/SkeletonLoaders';
import { formatDate } from '../utils/dateFormatter';

const DashboardCharts = lazy(() => import('../components/DashboardCharts'));
import {
  Sparkles,
  Calendar,
  CheckCircle,
  Clock,
  BookOpen,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Award,
  Zap,
  FileText,
  Target,
  MapPin
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchDashboardData(signal);
    fetchAiInsights(signal);

    return () => {
      controller.abort();
    };
  }, []);

  const fetchDashboardData = async (signal) => {
    try {
      setLoading(true);
      setError(false);
      const [summaryRes, analyticsRes] = await Promise.all([
        API.get('/dashboard/summary', { signal }),
        API.get('/dashboard/analytics', { signal })
      ]);

      if (summaryRes.data.success && analyticsRes.data.success) {
        setSummary(summaryRes.data.summary);
        setAnalytics(analyticsRes.data.analytics);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch dashboard details error:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async (signal) => {
    try {
      const res = await API.get('/ai/productivity-insights', { signal });
      if (res.data.success) {
        setAiInsights(res.data.insights);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch AI productivity insights error:', error);
    }
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getCurrentDate = () => {
    return formatDate(new Date(), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProductivityColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-red-400 border-red-500/20 bg-red-500/5';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
  };

  const formatCardDate = (dateString) => {
    return formatDate(dateString, { month: 'short', day: 'numeric', year: undefined });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-[#0a0f1d]/40 border border-slate-800/60 h-32 rounded-3xl" />
        <DashboardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsChartSkeleton />
          <AnalyticsChartSkeleton />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <ErrorState 
        message="Failed to load Dashboard" 
        errorDetails="There was an error compiling your campus summaries. Please check your network and database connections."
        onRetry={() => fetchDashboardData()} 
      />
    );
  }

  const { tasks, attendance, academic, notes, goals, productivityScore, upcomingDeadlines } = summary;
  const isDemoMode = tasks.total === 0 && academic.totalSubjects === 0;

  return (
    <div className="space-y-6">
      <SEO title="Dashboard Overview" description="Overview of student coursework, daily schedule timelines, study notes vault, and goal streaks." />
      {/* 1. Welcome Card Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-500/10 p-6 md:p-8">
        <div className="absolute top-[-30%] right-[-10%] w-[32rem] h-[32rem] rounded-full bg-indigo-500/[0.03] blur-[120px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Workspace</span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight">
              {getGreeting()}, {user?.name || 'Student'}!
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Track your student life, assignments, and class schedules in one secure command center.
            </p>
          </div>

          {/* Current Date widget */}
          <div className="bg-[#0b101c]/90 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Date Today</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">{getCurrentDate()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Onboarding Helper for new users */}
      {isDemoMode && (
        <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 mt-0.5">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading text-sm font-semibold text-white">Getting Started with MyCampusOS</h4>
            <p className="text-xs text-slate-455 leading-relaxed mt-1">
              Your database is empty! Add coursework subjects inside the{' '}
              <Link to="/planner" className="text-indigo-400 hover:underline font-medium">Academic Planner</Link>
              , and record study deadlines inside the{' '}
              <Link to="/tasks" className="text-indigo-400 hover:underline font-medium">Task Manager</Link>{' '}
              to populate these widgets with statistics.
            </p>
          </div>
        </div>
      )}

      {/* 3. Metrics Summary Grid (5 columns on large screen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {/* Productivity Score radial display */}
        <div className={`border rounded-2xl p-5 flex items-center gap-4 ${getProductivityColor(productivityScore)}`}>
          <div className="relative flex items-center justify-center shrink-0 w-14 h-14 rounded-full border border-current font-heading font-black text-xl">
            <span>{productivityScore}</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Productivity</h4>
            <p className="text-sm font-bold text-white mt-0.5">Score</p>
            <p className="text-[9px] text-slate-500 mt-0.5 truncate">Combined metrics</p>
          </div>
        </div>


        {/* Task completion widget */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Tasks Complete</h4>
            <p className="text-base font-bold text-white mt-0.5">{tasks.completed} / {tasks.total}</p>
            <p className="text-[9px] text-slate-500 mt-0.5 truncate">
              {tasks.percentage}% completion
            </p>
          </div>
        </div>

        {/* Total Subjects widget */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-2.5 bg-violet-500/10 text-violet-400 rounded-xl shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Subjects</h4>
            <p className="text-base font-bold text-white mt-0.5">{academic.totalSubjects} Classes</p>
            <p className="text-[9px] text-slate-500 mt-0.5 truncate">
              Coursework Subjects
            </p>
          </div>
        </div>

        {/* Total Notes Vault widget */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl shrink-0">
            <FileText className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 w-full">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Notes Vault</h4>
            <p className="text-base font-bold text-white mt-0.5">{notes?.total || 0} Files ({notes?.folderCount || 0} Folders)</p>
            <p className="text-[9px] text-slate-400 mt-0.5 truncate">
              Storage: {(() => {
                const bytes = notes?.totalStorageBytes || 0;
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
              })()}
            </p>
          </div>
        </div>

        {/* Goal Tracker widget */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-2.5 bg-rose-500/10 text-rose-450 rounded-xl shrink-0">
            <Target className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 w-full">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Goals & Streaks</h4>
            <p className="text-base font-bold text-white mt-0.5">{goals?.completed || 0} / {goals?.total || 0} Goals</p>
            <p className="text-[9px] text-slate-400 mt-0.5 truncate">
              Max Streak: 🔥 {goals?.maxStreak || 0} Days
            </p>
          </div>
        </div>
      </div>

      {/* AI Productivity Coach Feed */}
      {aiInsights && (
        <div className="bg-[#0a0f1d]/75 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-96 h-96 rounded-full bg-indigo-500/[0.02] blur-[100px] pointer-events-none"></div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-heading text-base font-bold text-white">AI Productivity Coach Feed</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Tip */}
            <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Coach Daily Note</p>
                <p className="text-xs text-slate-200 mt-2 leading-relaxed italic">"{aiInsights.dailyTip}"</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                <span>Integrated Copilot</span>
                <Link to="/ai" className="text-indigo-400 hover:underline">Open Copilot Workspace</Link>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Focus Areas Today</p>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                {Array.isArray(aiInsights.focusAreas) && aiInsights.focusAreas.map((area, i) => (
                  <div key={i} className="p-3 bg-[#131b2e]/45 border border-slate-850 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-200 truncate max-w-[120px]">{area.area}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider ${
                        area.priority === 'High' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>{area.priority}</span>
                    </div>
                    <p className="text-slate-400 text-[10px]">{area.currentMetric} • {area.actionableAdvice}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actionable Recommendations</p>
              <ul className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-350 list-disc list-inside">
                {Array.isArray(aiInsights.suggestions) && aiInsights.suggestions.map((sug, i) => (
                  <li key={i} className="leading-snug">{sug}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule & Next Class */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Class Widget */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-3xl p-6 flex flex-col justify-between h-[160px] lg:col-span-1 relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Next Upcoming Class</span>
              {summary.planner?.nextClass && (
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: summary.planner.nextClass.color }}
                />
              )}
            </div>
            {summary.planner?.nextClass ? (
              <div className="mt-3">
                <h3 className="font-heading text-sm font-bold text-white truncate">
                  {summary.planner.nextClass.subject}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-350">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{summary.planner.nextClass.day}, {summary.planner.nextClass.startTime} - {summary.planner.nextClass.endTime}</span>
                  </span>
                  {summary.planner.nextClass.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-405 shrink-0" />
                      <span>{summary.planner.nextClass.room}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-450 text-xs mt-4 italic">No classes scheduled.</p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
            <span>Schedule Planner</span>
            <Link to="/planner" className="text-indigo-400 hover:underline">View Timetable</Link>
          </div>
        </div>

        {/* Today's Classes List */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-[160px] lg:col-span-2">
          <div className="overflow-hidden flex flex-col h-full justify-between">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Today's Classes</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {summary.planner?.todayClasses?.length || 0} scheduled
              </span>
            </div>
            
            <div className="flex-1 overflow-x-auto flex items-center gap-3 py-1">
              {!Array.isArray(summary.planner?.todayClasses) || summary.planner.todayClasses.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No lectures scheduled for today.</p>
              ) : (
                summary.planner.todayClasses.map(c => (
                  <div 
                    key={c._id}
                    className="bg-[#131b2e]/30 border border-slate-850/60 rounded-xl p-2.5 min-w-[160px] max-w-[200px] relative overflow-hidden flex flex-col justify-between h-[80px] shrink-0"
                  >
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1" 
                      style={{ backgroundColor: c.color }}
                    ></div>
                    <div className="pl-1.5 min-w-0">
                      <h4 className="font-heading font-bold text-[11px] text-white truncate" title={c.subject}>{c.subject}</h4>
                      <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span>{c.startTime} - {c.endTime}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Upcoming Deadlines, Recent Notes, Recent Activities splits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Deadlines list */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-[320px]">
          <div className="overflow-hidden flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Upcoming Deadlines</span>
              </h3>
              <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors">
                <span>All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {!Array.isArray(upcomingDeadlines) || upcomingDeadlines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-550 py-6">
                  <CheckCircle className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs">No pending tasks remaining!</p>
                </div>
              ) : (
                upcomingDeadlines.map((task) => (
                  <div key={task._id} className="py-2.5 flex items-center justify-between gap-3 text-xs border-b border-slate-900/60 last:border-0">
                    <span className="font-medium text-white truncate max-w-[150px]">{task.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="text-slate-400">{formatCardDate(task.dueDate)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent notes list widget */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-[320px]">
          <div className="overflow-hidden flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Recent Study Notes</span>
              </h3>
              <Link to="/notes" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors">
                <span>Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {!notes?.recent || !Array.isArray(notes.recent) || notes.recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-550 py-6">
                  <FileText className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs">No notes uploaded yet.</p>
                </div>
              ) : (
                notes.recent.map((note) => {
                  const token = localStorage.getItem('token');
                  const downloadUrl = `${API.defaults.baseURL}/notes/download/${note._id}?token=${token}`;
                  return (
                    <div key={note._id} className="py-2.5 flex items-center justify-between gap-3 text-xs border-b border-slate-900/60 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate max-w-[140px]" title={note.title}>{note.title}</p>
                        <p className="text-[9px] text-slate-500 truncate">{note.subject}</p>
                      </div>
                      
                      {/* Anchor link downloading file */}
                      <a
                        href={downloadUrl}
                        className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/20 hover:border-indigo-500/40 py-1 px-2 rounded-lg transition-colors shrink-0"
                        title="Download Note"
                      >
                        Download
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Subject Updates */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between h-[320px]">
          <div className="overflow-hidden flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
              <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                <span>Recent Subject Updates</span>
              </h3>
              <Link to="/planner" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors">
                <span>Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              {!academic?.recentUpdates || !Array.isArray(academic.recentUpdates) || academic.recentUpdates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-550 py-6">
                  <BookOpen className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs">No subjects tracked yet.</p>
                </div>
              ) : (
                academic.recentUpdates.map((sub) => (
                  <div key={sub._id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white truncate max-w-[130px]">{sub.subject}</span>
                      <span className={`font-semibold ${sub.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sub.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-850 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${sub.percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      ></div>
                    </div>
                    <p className="text-[8px] text-slate-500 text-right">
                      Updated {formatCardDate(sub.updatedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Recharts Analytics Panels */}
      {!isDemoMode && analytics && (
        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChartSkeleton />
            <AnalyticsChartSkeleton />
          </div>
        }>
          <DashboardCharts analytics={analytics} />
        </Suspense>
      )}
    </div>
  );
};

export default Dashboard;
