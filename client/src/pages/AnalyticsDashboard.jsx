import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API from '../services/api';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/ErrorBoundary';
import { AnalyticsChartSkeleton } from '../components/SkeletonLoaders';
import { formatDate } from '../utils/dateFormatter';
import {
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Award,
  Download,
  Printer,
  ChevronRight,
  TrendingDown,
  Activity,
  Layers,
  GraduationCap,
  Briefcase,
  Target,
  RefreshCw,
  Search,
  BookOpen,
  Info,
  DollarSign,
  Scale,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';

const ProductivityCharts = lazy(() => import('../components/AnalyticsCharts').then(m => ({ default: m.ProductivityCharts })));
const TaskCharts = lazy(() => import('../components/AnalyticsCharts').then(m => ({ default: m.TaskCharts })));
const GoalCharts = lazy(() => import('../components/AnalyticsCharts').then(m => ({ default: m.GoalCharts })));
const ComparisonCharts = lazy(() => import('../components/AnalyticsCharts').then(m => ({ default: m.ComparisonCharts })));

// Animated Counter component
const AnimatedCounter = ({ value, duration = 800, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(Number(value)) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    if (start === end) {
      setCount(end);
      return;
    }
    const increment = end > start ? 1 : -1;
    const range = Math.abs(end - start);
    const stepTime = Math.max(8, Math.floor(duration / range));
    const timer = setInterval(() => {
      start += increment;
      setCount(start);
      if (start === end) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}{suffix}</span>;
};

// Memoized Chart Wrapper to optimize performance
const MemoizedChart = React.memo(({ children }) => {
  return (
    <div className="w-full h-full min-h-[220px]">
      {children}
    </div>
  );
});

const AnalyticsDashboard = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('overview'); // overview, academics, tasks, goals, comparisons

  // Timeframe filters state
  const [timeFilter, setTimeFilter] = useState('30days'); // 7days, 30days, 90days, semester, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto Refresh Settings
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshIntervalRef = useRef(null);

  // Raw API Datasets
  const [overviewData, setOverviewData] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [productivityData, setProductivityData] = useState(null);

  // UI state controllers
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [highContrastMode, setHighContrastMode] = useState(false);

  // Floating Tooltip state for activity heatmap
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Comparison Engine state variables
  const [compareCatA, setCompareCatA] = useState('Study');
  const [compareCatB, setCompareCatB] = useState('Assignments');
  const [compareRoleA, setCompareRoleA] = useState('');
  const [compareRoleB, setCompareRoleB] = useState('');

  // Recharts harmonized color palettes
  const CHART_COLORS = useMemo(() => {
    if (highContrastMode) {
      return ['#ffffff', '#cccccc', '#999999', '#777777', '#555555', '#333333', '#111111'];
    }
    return ['#6366f1', '#10b981', '#f59e0b', '#38bdf8', '#ec4899', '#f43f5e', '#a855f7'];
  }, [highContrastMode]);

  const abortControllerRef = useRef(null);

  const fetchAllAnalytics = async (silent = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const params = { timeFilter };
      if (timeFilter === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      
      const config = {
        params,
        signal: controller.signal,
        ...(silent ? { headers: { 'x-bypass-cache': 'true' } } : {})
      };

      const [overviewRes, tasksRes, goalsRes, productivityRes] = await Promise.all([
        API.get('/analytics/overview', config),
        API.get('/analytics/tasks', config),
        API.get('/analytics/goals', config),
        API.get('/analytics/productivity', config)
      ]);

      setOverviewData(overviewRes.data);
      setTasksData(tasksRes.data);
      setGoalsData(goalsRes.data);
      setProductivityData(productivityRes.data);

      // Set roles fallbacks
      setCompareRoleA('Software Engineer');
      setCompareRoleB('Data Analyst');

    } catch (error) {
      if (axios.isCancel(error)) {
        return;
      }
      console.error('Fetch analytics details error:', error);
      toast.error('Failed to load visual aggregation metrics');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [timeFilter, startDate, endDate]);

  // Handle Auto Refresh triggers
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchAllAnalytics(true);
      }, 30000); // 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, timeFilter, startDate, endDate]);

  // Fast window refocus cache updater
  useEffect(() => {
    const handleFocus = () => {
      fetchAllAnalytics(true);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [timeFilter, startDate, endDate]);

  const handleManualRefresh = () => {
    fetchAllAnalytics(true);
    toast.success('Analytics cache updated successfully');
  };

  // Gamified Badge items logic
  const badges = useMemo(() => {
    if (!overviewData || !productivityData) return [];
    const score = overviewData.overview?.productivityScore || 0;
    const goalRate = overviewData.overview?.goals?.completed || 0;

    return [
      {
        id: 'productivity_master',
        name: 'Productivity Master',
        desc: 'Achieve a score of 80%+ on consistency scale',
        unlocked: score >= 80,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
      },
      {
        id: 'goal_crusher',
        name: 'Goal Crusher',
        desc: 'Complete at least 3 goals',
        unlocked: goalRate >= 3,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      }
    ];
  }, [overviewData, productivityData]);

  // Export functions
  const handleExportCSV = () => {
    if (!overviewData) return;
    const rows = [
      ['Metric', 'Value'],
      ['Productivity Score', overviewData.overview?.productivityScore],
      ['Total Tasks Tracked', overviewData.overview?.tasks?.total],
      ['Completed Tasks', overviewData.overview?.tasks?.completed],
      ['Goals Completed', overviewData.overview?.goals?.completed]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MyCampusOS_Report_${timeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported');
  };

  const handleExportJSON = () => {
    const payload = {
      overview: overviewData,
      tasks: tasksData,
      goals: goalsData,
      productivity: productivityData,
      exportedAt: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `MyCampusOS_Data_Backup_${timeFilter}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('JSON Raw Backup exported');
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Keyboard navigation helper
  const handleKeyboardTrigger = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  // GitHub Heatmap Padding Logic
  const paddedHeatmap = useMemo(() => {
    const heatmapData = productivityData?.productivity?.heatmap;
    if (!Array.isArray(heatmapData) || heatmapData.length === 0) return [];
    const data = [...heatmapData];
    const firstDate = new Date(data[0].date);
    const firstDay = firstDate.getDay(); // 0 = Sun, 1 = Mon...
    
    const padding = [];
    for (let i = 0; i < firstDay; i++) {
      padding.push({ date: `pad-${i}`, count: -1, rawCount: -1 });
    }
    return [...padding, ...data];
  }, [productivityData]);

  const compCatDataA = useMemo(() => {
    if (!goalsData?.goals?.categoryData) return null;
    return goalsData.goals.categoryData.find(c => c.category === compareCatA) || null;
  }, [goalsData, compareCatA]);

  const compCatDataB = useMemo(() => {
    if (!goalsData?.goals?.categoryData) return null;
    return goalsData.goals.categoryData.find(c => c.category === compareCatB) || null;
  }, [goalsData, compareCatB]);

  const { overview } = overviewData || {};
  const { productivity } = productivityData || {};
  const { tasks } = tasksData || {};
  const { goals } = goalsData || {};

  // Memoized Chart Dataset Transformations
  const memoizedProductivity = useMemo(() => ({
    weeklyProgress: Array.isArray(productivity?.weeklyProgress) ? productivity.weeklyProgress : [],
    activeDays: Array.isArray(productivity?.activeDays) ? productivity.activeDays : [],
    heatmap: Array.isArray(productivity?.heatmap) ? productivity.heatmap : [],
  }), [productivity]);

  const memoizedTasks = useMemo(() => ({
    priorityData: Array.isArray(tasks?.priorityData) ? tasks.priorityData : [],
    completionByDay: Array.isArray(tasks?.completionByDay) ? tasks.completionByDay : [],
  }), [tasks]);

  const memoizedGoals = useMemo(() => ({
    categoryData: Array.isArray(goals?.categoryData) ? goals.categoryData : [],
  }), [goals]);

  // Skeleton Loaders
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="h-10 bg-slate-850 rounded-2xl w-2/5 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0a0f1d]/75 border border-slate-850 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3 bg-slate-800/80 rounded w-16" />
                <div className="h-4.5 bg-slate-800/80 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnalyticsChartSkeleton />
          </div>
          <div>
            <AnalyticsChartSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-4 text-slate-100">
      
      {/* 1. Print Friendly Styles Injection */}
      <style>{`
        @media print {
          body { background: #070b13 !important; color: white !important; }
          aside, header, nav, .no-print, button, select, input { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print-grid { display: grid !important; grid-template-cols: 1fr 1fr !important; gap: 1.5rem !important; }
          .card-print { border: 1px solid #334155 !important; background: transparent !important; }
        }
      `}</style>

      {/* 2. Top Header Navigation Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-indigo-400 shrink-0 animate-pulse" />
            <span>Productivity & Analytics Center</span>
          </h1>
          <p className="text-slate-450 text-sm mt-1">Centralized analytical metrics reporting daily consistency, course attendance trends, and recruitment funnels.</p>
        </div>

        {/* Date Filter selector & custom range fields */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#131b2e]/40 border border-slate-800 rounded-xl p-1 shrink-0">
            {['7days', '30days', '90days', 'semester', 'custom'].map(filter => (
              <button
                key={filter}
                tabIndex={0}
                onClick={() => setTimeFilter(filter)}
                onKeyDown={(e) => handleKeyboardTrigger(e, () => setTimeFilter(filter))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  timeFilter === filter ? 'bg-indigo-600 text-white shadow' : 'text-slate-450 hover:text-slate-200'
                }`}
                aria-label={`Filter data by ${filter === '7days' ? 'Last 7 Days' : filter === '30days' ? 'Last 30 Days' : filter === '90days' ? 'Last 90 Days' : filter === 'semester' ? 'Semester' : 'Custom range'}`}
              >
                {filter === '7days' ? '7D' : filter === '30days' ? '30D' : filter === '90days' ? '90D' : filter === 'semester' ? 'Sem' : 'Custom'}
              </button>
            ))}
          </div>

          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs shrink-0 animate-in fade-in slide-in-from-right-2 duration-200">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-800 rounded-lg py-1 px-2.5 outline-none text-slate-200 focus:border-indigo-500"
                aria-label="Start date"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-800 rounded-lg py-1 px-2.5 outline-none text-slate-200 focus:border-indigo-500"
                aria-label="End date"
              />
            </div>
          )}

          {/* Auto refresh switch toggle */}
          <div className="flex items-center gap-2 border border-slate-800 bg-[#0a0f1d]/40 rounded-xl px-3 py-1.5 text-xs text-slate-450 shrink-0">
            <span className="font-semibold">Auto 30s:</span>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
              aria-label="Toggle auto refresh"
            />
          </div>

          {/* Manual Refresh Trigger */}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 bg-[#131b2e]/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-all disabled:opacity-40"
            title="Bypass cached database records"
            aria-label="Manual refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Contrast helper toggle */}
          <button
            onClick={() => setHighContrastMode(!highContrastMode)}
            className="text-[10px] uppercase font-bold border border-slate-800 px-2 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer hover:bg-slate-800/40"
            aria-label="Toggle high contrast color palette"
          >
            {highContrastMode ? 'Color Palette' : 'High Contrast'}
          </button>
        </div>
      </div>

      {/* 3. Export Suite Dropdown Row */}
      <div className="flex items-center justify-end gap-3 no-print">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-xs font-semibold border border-slate-800 bg-[#131b2e]/40 hover:bg-[#131b2e]/70 px-3 py-2 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Export report as CSV file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 text-xs font-semibold border border-slate-800 bg-[#131b2e]/40 hover:bg-[#131b2e]/70 px-3 py-2 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Export report as JSON file"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export JSON</span>
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 px-3 py-2 rounded-xl text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
          aria-label="Trigger PDF printing layout"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print PDF Report</span>
        </button>
      </div>

      {/* 4. Dashboard KPI Cards Grid (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Productivity score gauge */}
        <div className="bg-gradient-to-tr from-indigo-950/40 to-slate-900/60 border border-indigo-500/10 rounded-2xl p-5 flex items-center gap-4 card-print shadow-md">
          <div className="relative w-14 h-14 rounded-full border-4 border-indigo-500/20 flex items-center justify-center font-heading font-black text-xl text-indigo-400">
            <AnimatedCounter value={overview?.productivityScore || 0} />
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Productivity</h4>
            <p className="text-base font-bold text-white mt-0.5">Score</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Weighted metric</p>
          </div>
        </div>

        {/* Weekly Consistency KPI */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 card-print shadow-md">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Activity className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Consistency</h4>
            <p className="text-base font-bold text-white mt-0.5">
              <AnimatedCounter value={overview?.weeklyConsistency || 0} suffix="%" />
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">{overview?.activeDaysCount || 0} active days</p>
          </div>
        </div>

        {/* Goal completion rate */}
        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4 card-print shadow-md">
          <div className="p-3 bg-rose-500/10 text-rose-4 opacity-100 rounded-xl">
            <Target className="w-5.5 h-5.5 text-rose-400" />
          </div>
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Goals Rate</h4>
            <p className="text-base font-bold text-white mt-0.5">
              <AnimatedCounter value={overview?.goals?.rate || 0} suffix="%" />
            </p>
            <p className="text-[9px] text-rose-400 font-semibold mt-0.5">Streak: 🔥 {overview?.goals?.maxStreak || 0} Days</p>
          </div>
        </div>

      </div>

      {/* 5. Navigation Tab Selection Layout (No-Print) */}
      <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-2 flex justify-start items-center gap-1.5 overflow-x-auto scrollbar-none scroll-momentum no-print">
        {[
          { key: 'overview', name: 'Overview Heatmap', icon: Activity },
          { key: 'tasks', name: 'Productivity (Tasks)', icon: CheckCircle },
          { key: 'goals', name: 'Streaks & Goals', icon: Target },
          { key: 'comparisons', name: 'Comparison Engine', icon: Scale }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              tabIndex={0}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => handleKeyboardTrigger(e, () => setActiveTab(tab.key))}
              className={`px-4 py-2.5 rounded-xl cursor-pointer text-xs font-semibold flex items-center gap-2 shrink-0 transition-all ${
                activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/10' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={`Switch to ${tab.name} view`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* 6. Main Tab Workspace displays */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom activity heatmap (GitHub Grid Style) */}
                <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 lg:col-span-2 space-y-4 card-print relative">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span>Study & Activity Heatmap</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Visualizing your academic interactions and log count over the selected time range</p>
                  </div>

                  {/* Scrollable GitHub matrix grid */}
                  <div className="overflow-x-auto pb-3 scrollbar-none scroll-momentum relative">
                    <div className="flex gap-2 min-w-[700px]">
                      {/* Day Labels */}
                      <div className="grid grid-rows-7 text-[10px] text-slate-500 pr-1 py-0.5 leading-[14px] select-none font-medium h-[115px]">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>

                      {/* Heatmap cells */}
                      <div className="flex-1">
                        <div className="grid grid-rows-7 grid-flow-col gap-1 w-max h-[115px]">
                          {paddedHeatmap.map((cell, idx) => {
                            if (cell.count === -1) {
                              return (
                                <div key={cell.date} className="w-[13px] h-[13px] rounded-sm bg-transparent shrink-0" />
                              );
                            }

                            let bgColor = 'bg-slate-900/60 border border-slate-800/40';
                            if (cell.count === 1) bgColor = 'bg-emerald-950/70 border border-emerald-900/10';
                            else if (cell.count >= 2 && cell.count <= 3) bgColor = 'bg-emerald-800/80';
                            else if (cell.count >= 4 && cell.count <= 6) bgColor = 'bg-emerald-600/90';
                            else if (cell.count >= 7) bgColor = 'bg-emerald-500';

                            return (
                              <div
                                key={cell.date}
                                tabIndex={0}
                                className={`w-[13px] h-[13px] rounded-sm transition-colors duration-150 ${bgColor} cursor-help shrink-0 hover:ring-1 hover:ring-white outline-none`}
                                onMouseEnter={(e) => {
                                  const rect = e.target.getBoundingClientRect();
                                  setHoveredCell(cell);
                                  setTooltipPos({
                                    x: rect.left + window.scrollX - 70,
                                    y: rect.top + window.scrollY - 42
                                  });
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                onFocus={(e) => {
                                  const rect = e.target.getBoundingClientRect();
                                  setHoveredCell(cell);
                                  setTooltipPos({
                                    x: rect.left + window.scrollX - 70,
                                    y: rect.top + window.scrollY - 42
                                  });
                                }}
                                onBlur={() => setHoveredCell(null)}
                                aria-label={`${cell.rawCount} activities on ${cell.date}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Custom Floating Tooltip */}
                  {hoveredCell && (
                    <div
                      className="absolute z-50 p-2 bg-[#090d16] border border-slate-700 text-[10px] text-slate-100 rounded-lg shadow-xl pointer-events-none transition-all duration-75 text-center leading-snug w-[150px]"
                      style={{
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`
                      }}
                    >
                      <p className="font-bold text-indigo-400">{hoveredCell.rawCount} activities</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">
                        {formatDate(hoveredCell.date)}
                      </p>
                    </div>
                  )}

                  {/* Heatmap Legend row */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1 px-1 border-t border-slate-900/60 no-print">
                    <span>Active days: {productivity?.heatmap?.filter(h => h.count > 0).length || 0}</span>
                    <div className="flex items-center gap-1.5">
                      <span>Less</span>
                      <div className="w-[10px] h-[10px] rounded-sm bg-slate-900/60 border border-slate-800/40"></div>
                      <div className="w-[10px] h-[10px] rounded-sm bg-emerald-950/70"></div>
                      <div className="w-[10px] h-[10px] rounded-sm bg-emerald-800/80"></div>
                      <div className="w-[10px] h-[10px] rounded-sm bg-emerald-600/90"></div>
                      <div className="w-[10px] h-[10px] rounded-sm bg-emerald-500"></div>
                      <span>More</span>
                    </div>
                  </div>
                </div>

                {/* Smart Insights Panel */}
                <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between min-h-[220px] card-print">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                      <Info className="w-4 h-4 text-indigo-400" />
                      <span>Smart AI Insights</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Automated assessments of your study metrics</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 mt-4 max-h-[170px] scrollbar-thin">
                    {!productivity?.insights || productivity.insights.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-4">No insights logged yet. Add subjects and tasks.</p>
                    ) : (
                      productivity.insights.map((insight, idx) => {
                        let colorClasses = 'border-slate-850 bg-slate-900/10 text-slate-400';
                        if (insight.category === 'warning') colorClasses = 'border-red-500/20 bg-red-500/5 text-red-400';
                        else if (insight.category === 'success') colorClasses = 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400';
                        else if (insight.category === 'achievement') colorClasses = 'border-violet-500/20 bg-violet-500/5 text-violet-400';
                        else if (insight.category === 'suggestion') colorClasses = 'border-sky-500/20 bg-sky-500/5 text-sky-400';

                        return (
                          <div key={idx} className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all ${colorClasses}`}>
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold leading-none">{insight.title}</p>
                              <p className="text-[10px] text-slate-450 mt-1 leading-snug">{insight.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Weekly progress and active days line charts */}
              <Suspense fallback={
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnalyticsChartSkeleton />
                  <AnalyticsChartSkeleton />
                </div>
              }>
                <ProductivityCharts productivity={memoizedProductivity} CHART_COLORS={CHART_COLORS} />
              </Suspense>

              {/* Badges and achievements list */}
              <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 card-print">
                <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-850">
                  <Award className="w-4 h-4 text-amber-500 animate-bounce" />
                  <h3 className="font-heading text-sm font-semibold text-white">Gamification Badges</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {badges.map(b => (
                    <div
                      key={b.id}
                      className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                        b.unlocked 
                          ? b.color + ' opacity-100 shadow-md transform hover:scale-[1.02] duration-250' 
                          : 'bg-slate-900/10 border-slate-900 text-slate-600 opacity-40 select-none grayscale'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-950/20 shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs leading-none">{b.name}</p>
                        <p className="text-[9px] text-slate-450 mt-1.5 leading-snug">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB: PRODUCTIVITY (TASKS) */}
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <Suspense fallback={
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnalyticsChartSkeleton />
                  <AnalyticsChartSkeleton />
                </div>
              }>
                <TaskCharts tasks={memoizedTasks} CHART_COLORS={CHART_COLORS} />
              </Suspense>
            </motion.div>
          )}

          {/* TAB: GOALS */}
          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Streaks metrics details */}
                <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between min-h-[330px] card-print">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-450" />
                      <span>Streaks Milestones</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tracking current habits streaks</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center gap-3">
                    <div className="text-5xl animate-bounce">🔥</div>
                    <p className="text-3xl font-black text-white">{goals?.maxStreak || 0} Days</p>
                    <p className="text-xs text-slate-500">Longest streak recorded across productivity goals</p>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Suspense fallback={<AnalyticsChartSkeleton />}>
                    <GoalCharts goals={memoizedGoals} CHART_COLORS={CHART_COLORS} />
                  </Suspense>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: COMPARISONS */}
          {activeTab === 'comparisons' && (
            <motion.div
              key="comparisons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid">
                


                {/* 2. Goal Category Comparison Engine */}
                <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-6 space-y-4 card-print">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-450" />
                      <span>Goal Category Comparison Engine</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Compare goals volume and completion progress percentages</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 no-print">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Category A</label>
                      <select
                        value={compareCatA}
                        onChange={(e) => setCompareCatA(e.target.value)}
                        className="w-full bg-[#131b2e]/60 border border-slate-800 text-xs py-2 px-2.5 rounded-xl text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
                        aria-label="Compare goal category A"
                      >
                        {['Study', 'Attendance', 'Assignments', 'Personal Development'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Category B</label>
                      <select
                        value={compareCatB}
                        onChange={(e) => setCompareCatB(e.target.value)}
                        className="w-full bg-[#131b2e]/60 border border-slate-800 text-xs py-2 px-2.5 rounded-xl text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
                        aria-label="Compare goal category B"
                      >
                        {['Study', 'Attendance', 'Assignments', 'Personal Development'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-4 bg-[#131b2e]/20 border border-slate-850 rounded-2xl space-y-3">
                      <p className="font-bold text-xs text-emerald-400 truncate">{compareCatA}</p>
                      {compCatDataA ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-bold text-slate-200">{compCatDataA.total}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Completed:</span><span className="font-bold text-slate-200">{compCatDataA.completed}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Progress:</span><span className="font-bold text-emerald-400">{compCatDataA.avgProgress}%</span></div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No category data found</p>
                      )}
                    </div>

                    <div className="p-4 bg-[#131b2e]/20 border border-slate-850 rounded-2xl space-y-3">
                      <p className="font-bold text-xs text-rose-450 truncate">{compareCatB}</p>
                      {compCatDataB ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-bold text-slate-200">{compCatDataB.total}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Completed:</span><span className="font-bold text-slate-200">{compCatDataB.completed}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Progress:</span><span className="font-bold text-rose-455">{compCatDataB.avgProgress}%</span></div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">No category data found</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Monthly Productivity Comparison */}
                <Suspense fallback={<AnalyticsChartSkeleton />}>
                  <ComparisonCharts productivity={memoizedProductivity} CHART_COLORS={CHART_COLORS} />
                </Suspense>



              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};

export default AnalyticsDashboard;
