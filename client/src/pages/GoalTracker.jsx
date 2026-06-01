import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  Target,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Award,
  Zap,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlusCircle,
  Flame,
  ShieldAlert,
  HelpCircle,
  Search,
  SlidersHorizontal,
  FolderOpen
} from 'lucide-react';

const GoalTracker = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering and Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedRecurrence, setSelectedRecurrence] = useState('all');
  const [sortOrder, setSortOrder] = useState('deadlineAsc'); // deadlineAsc | deadlineDesc | streakDesc | progressDesc

  // Detail / Accordion expanded cards mapping: GoalId -> Boolean
  const [expandedMilestones, setExpandedMilestones] = useState({});

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState(null); // null for creation, object for edit
  const [activeTemplate, setActiveTemplate] = useState('');

  // Confetti triggering Goal ID
  const [completedGoalId, setCompletedGoalId] = useState(null);

  // Preset goal templates
  const templates = [
    {
      id: 'dsa_30',
      name: 'Complete 30 Days DSA',
      title: 'Complete 30 Days of DSA',
      description: 'Solve Data Structures & Algorithms problems daily to build solid coding fundamentals.',
      category: 'Study',
      progressType: 'numeric',
      targetValue: 30,
      unit: 'Days',
      recurrence: 'Daily',
      priority: 'high',
      milestones: [
        { title: 'Learn Arrays & Hashmaps', completed: false },
        { title: 'Learn Two Pointers & Sliding Window', completed: false },
        { title: 'Learn Binary Search & Trees', completed: false },
        { title: 'Learn Recursion & Dynamic Programming', completed: false }
      ]
    },
    {
      id: 'attendance_85',
      name: 'Maintain 85% Attendance',
      title: 'Maintain 85% Class Attendance',
      description: 'Stay active and attend coursework lectures to maintain good academic standing.',
      category: 'Attendance',
      progressType: 'percentage',
      targetValue: 85,
      unit: '%',
      recurrence: 'Daily',
      priority: 'medium',
      milestones: []
    },
    {
      id: 'leetcode_100',
      name: 'Solve 100 LeetCode Problems',
      title: 'Solve 100 LeetCode Problems',
      description: 'Practice programming puzzles on LeetCode for technical interview preparation.',
      category: 'Study',
      progressType: 'numeric',
      targetValue: 100,
      unit: 'Problems',
      recurrence: 'One-time',
      priority: 'high',
      milestones: []
    },
    {
      id: 'semester_notes',
      name: 'Finish Semester Notes',
      title: 'Compile All Semester Study Notes',
      description: 'Collect, format, and organize lecture materials for final exam preparation.',
      category: 'Study',
      progressType: 'milestones',
      targetValue: 4,
      unit: 'Units',
      recurrence: 'Weekly',
      priority: 'medium',
      milestones: [
        { title: 'Compile Unit 1 Notes', completed: false },
        { title: 'Compile Unit 2 Notes', completed: false },
        { title: 'Compile Unit 3 Notes', completed: false },
        { title: 'Compile Unit 4 Notes', completed: false }
      ]
    }
  ];

  const categories = ['Study', 'Attendance', 'Assignments', 'Personal Development'];
  const recurrences = ['One-time', 'Daily', 'Weekly', 'Monthly'];
  const priorities = ['low', 'medium', 'high'];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'Study',
      progressType: 'numeric',
      targetValue: 1,
      unit: 'tasks',
      deadline: '',
      priority: 'medium',
      recurrence: 'One-time',
      milestones: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'milestones'
  });

  const watchProgressType = watch('progressType');
  const watchMilestones = watch('milestones');

  useEffect(() => {
    const controller = new AbortController();
    fetchGoals(false, controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  const fetchGoals = async (silent = false, signal = null) => {
    try {
      if (!silent) setLoading(true);
      const response = await API.get('/goals', { signal });
      if (response.data?.success) {
        setGoals(response.data.goals || []);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch goals error:', error);
      toast.error('Failed to sync goals tracker');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Populate form fields from template select
  const handleSelectTemplate = (templateId) => {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setActiveTemplate(templateId);
    setValue('title', template.title);
    setValue('description', template.description);
    setValue('category', template.category);
    setValue('progressType', template.progressType);
    setValue('targetValue', template.targetValue);
    setValue('unit', template.unit);
    setValue('priority', template.priority);
    setValue('recurrence', template.recurrence);
    
    // Set deadline to a logical default: e.g. 30 days from now
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 30);
    const deadlineString = defaultDeadline.toISOString().split('T')[0];
    setValue('deadline', deadlineString);

    if (template.milestones) {
      replace(template.milestones);
    } else {
      replace([]);
    }
  };

  // Goal Form Submission
  const onSubmitGoal = async (data) => {
    try {
      const payload = {
        ...data,
        targetValue: data.progressType === 'milestones' ? data.milestones.length : Number(data.targetValue)
      };

      if (goalToEdit) {
        // Edit Goal API
        const response = await API.put(`/goals/${goalToEdit._id}`, payload);
        if (response.data?.success) {
          toast.success('Goal updated successfully');
          setIsGoalModalOpen(false);
          setGoalToEdit(null);
          reset();
          fetchGoals(true);
        }
      } else {
        // Create Goal API
        const response = await API.post('/goals', payload);
        if (response.data?.success) {
          toast.success('Goal created! Crush those milestones! 🚀');
          setIsGoalModalOpen(false);
          reset();
          fetchGoals(true);
        }
      }
      setActiveTemplate('');
    } catch (error) {
      console.error('Save goal error:', error);
      toast.error(error.response?.data?.message || 'Failed to save goal details');
    }
  };

  // Progress Adjustments (PATCH)
  const handleUpdateProgress = async (goal, dataInput) => {
    const originalStatus = goal.status;
    
    // Optimistic UI updates
    setGoals(prevGoals =>
      prevGoals.map(g => {
        if (g._id === goal._id) {
          let nextProgress = g.currentProgress;
          let nextMilestones = g.milestones;
          let nextStatus = g.status;

          if (g.progressType === 'milestones' && dataInput.milestones) {
            nextMilestones = dataInput.milestones;
            nextProgress = nextMilestones.filter(m => m.completed).length;
          } else if (dataInput.increment !== undefined) {
            nextProgress = Math.min(g.targetValue, Math.max(0, g.currentProgress + dataInput.increment));
          }

          if (nextProgress >= g.targetValue) {
            nextStatus = 'Completed';
          } else {
            const now = new Date();
            if (new Date(g.deadline) < now) {
              nextStatus = 'Overdue';
            } else {
              nextStatus = nextProgress > 0 ? 'In Progress' : 'Pending';
            }
          }

          return {
            ...g,
            currentProgress: nextProgress,
            milestones: nextMilestones,
            status: nextStatus
          };
        }
        return g;
      })
    );

    try {
      const response = await API.patch(`/goals/${goal._id}/progress`, dataInput);
      if (response.data?.success) {
        const updatedGoal = response.data.goal;
        
        // Update correct details from database
        setGoals(prev => prev.map(g => (g._id === goal._id ? updatedGoal : g)));

        // If goal just reached completion, trigger animation & success toast
        if (originalStatus !== 'Completed' && updatedGoal.status === 'Completed') {
          triggerCompletionCelebration(updatedGoal._id);
        }

        if (response.data.recoveryApplied) {
          toast.success('Streak Shield Activated! Streak saved! 🛡️');
        }
      }
    } catch (error) {
      console.error('Update progress failure:', error);
      toast.error('Failed to sync progress changes');
      fetchGoals(true); // Rollback to database state
    }
  };

  // Trigger pure-CSS completion confetti popper
  const triggerCompletionCelebration = (goalId) => {
    setCompletedGoalId(goalId);
    toast.success('Goal accomplished! Dynamic performance unlocked! 🎉', {
      duration: 6000,
      icon: '🏆'
    });
    setTimeout(() => {
      setCompletedGoalId(null);
    }, 5000);
  };

  // Delete Goal
  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal? This action is permanent.')) return;
    try {
      const response = await API.delete(`/goals/${goalId}`);
      if (response.data?.success) {
        toast.success('Goal deleted');
        setGoals(prev => prev.filter(g => g._id !== goalId));
      }
    } catch (error) {
      console.error('Delete goal error:', error);
      toast.error('Failed to delete goal');
    }
  };

  // Toggle checklist subtask completeness
  const handleToggleMilestone = (goal, index) => {
    const updatedMilestones = goal.milestones.map((m, i) =>
      i === index ? { ...m, completed: !m.completed } : m
    );
    handleUpdateProgress(goal, { milestones: updatedMilestones });
  };

  // Accordion toggle helper
  const toggleMilestonesExpand = (goalId) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Achievements calculation (Dynamic gamified badges)
  const calculateAchievements = () => {
    const totalCompleted = goals.filter(g => g.status === 'Completed').length;
    const maxStreakVal = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;
    const attendanceCompleted = goals.filter(g => g.category === 'Attendance' && g.status === 'Completed').length;
    const studyCompleted = goals.filter(g => g.category === 'Study' && g.status === 'Completed').length;

    return [
      {
        id: 'streak_7',
        name: '7-Day Streak',
        description: 'Reach a streak of 7 days or more on any goal',
        unlocked: maxStreakVal >= 7,
        icon: Flame,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/25'
      },
      {
        id: 'goal_crusher',
        name: 'Goal Crusher',
        description: 'Complete your first academic or productivity milestone',
        unlocked: totalCompleted >= 1,
        icon: Target,
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/25'
      },
      {
        id: 'productivity_master',
        name: 'Productivity Master',
        description: 'Complete 5 goals inside the vault tracker',
        unlocked: totalCompleted >= 5,
        icon: Award,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25'
      },
      {
        id: 'attendance_champion',
        name: 'Attendance Champion',
        description: 'Complete any Attendance target goal',
        unlocked: attendanceCompleted >= 1 || studyCompleted >= 2,
        icon: CheckCircle,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      }
    ];
  };

  const badges = calculateAchievements();

  // Smart calculations for sidebar / summary metrics
  const activeCount = goals.filter(g => g.status === 'Pending' || g.status === 'In Progress').length;
  const completedCount = goals.filter(g => g.status === 'Completed').length;
  const overdueCount = goals.filter(g => g.status === 'Overdue').length;
  const overallStreak = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;
  const completionPercentage = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  // Search & Filtering calculations
  const filteredGoals = goals.filter(goal => {
    if (!goal) return false;
    const titleMatch = goal.title.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = (goal.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = titleMatch || descMatch;

    const matchesCategory = selectedCategory === 'all' || goal.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || goal.priority === selectedPriority;
    const matchesRecurrence = selectedRecurrence === 'all' || goal.recurrence === selectedRecurrence;

    return matchesSearch && matchesCategory && matchesPriority && matchesRecurrence;
  });

  // Client-side Sorting
  const sortedGoals = [...filteredGoals].sort((a, b) => {
    if (sortOrder === 'deadlineAsc') return new Date(a.deadline) - new Date(b.deadline);
    if (sortOrder === 'deadlineDesc') return new Date(b.deadline) - new Date(a.deadline);
    if (sortOrder === 'streakDesc') return (b.streak || 0) - (a.streak || 0);
    if (sortOrder === 'progressDesc') {
      const getProgressRate = (g) => g.targetValue > 0 ? (g.currentProgress / g.targetValue) : 0;
      return getProgressRate(b) - getProgressRate(a);
    }
    return 0;
  });

  // Split sorted list into view groups
  const activeGoalsList = sortedGoals.filter(g => g.status === 'Pending' || g.status === 'In Progress');
  const completedGoalsList = sortedGoals.filter(g => g.status === 'Completed');
  const overdueGoalsList = sortedGoals.filter(g => g.status === 'Overdue');

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'high': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Study': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'Attendance': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Assignments': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }
  };

  // Check if deadline is within 24 hours (for alerts)
  const isDeadlineUrgent = (deadlineStr) => {
    const diff = new Date(deadlineStr) - new Date();
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 relative">
        
        {/* CSS Confetti Overlay */}
        {completedGoalId && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
            {Array.from({ length: 40 }).map((_, idx) => {
              const randX = Math.random() * 100;
              const randDelay = Math.random() * 2;
              const randDuration = 2 + Math.random() * 2;
              const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];
              const randColor = colors[Math.floor(Math.random() * colors.length)];
              return (
                <div
                  key={idx}
                  className="absolute w-2.5 h-2.5 rounded-sm opacity-90 animate-confetti"
                  style={{
                    left: `${randX}%`,
                    top: `-10px`,
                    backgroundColor: randColor,
                    animationDelay: `${randDelay}s`,
                    animationDuration: `${randDuration}s`,
                    transform: `rotate(${Math.random() * 360}deg)`
                  }}
                />
              );
            })}
          </div>
        )}

        {/* CSS styles injected dynamically for animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .animate-confetti {
            animation: confetti linear infinite;
          }
        `}} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <Target className="w-8 h-8 text-rose-500 shrink-0" />
              <span>Goal Tracker & Milestones</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Set academic schedules, build habits streaks, track progress parameters, and unlock badges.</p>
          </div>
          
          <button
            onClick={() => {
              setGoalToEdit(null);
              reset();
              setActiveTemplate('');
              setIsGoalModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-650/10 transition-all duration-150 active:scale-95 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Goal</span>
          </button>
        </div>

        {/* Streaks & Achievements Board Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Summary Gamification Status */}
          <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950/20 to-slate-900/40 border border-indigo-500/10 rounded-3xl p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
            <div className="absolute top-[-30%] right-[-10%] w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Streak Status</span>
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overallStreak}</span>
                <span className="text-xs text-slate-400">consecutive days max</span>
              </div>
              <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (overallStreak / 30) * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-3 uppercase tracking-wider">
              {overallStreak >= 7 ? '🔥 Super Streaker Status Active!' : '🔥 Update daily goals to build streaks!'}
            </p>
          </div>

          {/* Gamification Unlocked Achievement Badges */}
          <div className="lg:col-span-3 bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-rose-450" />
                <span>Unlocked Accomplishments</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {badges.filter(b => b.unlocked).length} / {badges.length} Earned
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 items-center">
              {badges.map(badge => {
                const IconComp = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all duration-150 ${
                      badge.unlocked 
                        ? badge.color + ' opacity-100 scale-100 shadow-md shadow-slate-950/20' 
                        : 'bg-slate-900/10 border-slate-900 text-slate-650 opacity-40 grayscale select-none'
                    }`}
                    title={badge.description}
                  >
                    <div className="p-1.5 rounded-lg bg-slate-950/25 shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[10px] truncate leading-tight">{badge.name}</p>
                      <p className="text-[8px] text-slate-500 mt-0.5 truncate">{badge.unlocked ? 'Unlocked!' : 'Locked'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Templates Selection Quick Bar */}
        <div className="bg-[#0a0f1d]/40 border border-slate-850/60 rounded-2xl p-4 space-y-2">
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-450 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Goal Template to Populate Form Quickly:</span>
          </h4>
          <div className="flex flex-wrap gap-2 pt-1">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setGoalToEdit(null);
                  setIsGoalModalOpen(true);
                  // Allow DOM state initialization before setting values
                  setTimeout(() => handleSelectTemplate(t.id), 50);
                }}
                className="bg-[#131b2e]/60 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/20 text-slate-300 hover:text-indigo-400 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150"
              >
                + {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar Section */}
        <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-555 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search goals by title, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#131b2e]/40 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Category selection */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all" className="bg-[#0f172a]">All Categories</option>
              {categories.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
            </select>

            {/* Recurrence selection */}
            <select
              value={selectedRecurrence}
              onChange={(e) => setSelectedRecurrence(e.target.value)}
              className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all" className="bg-[#0f172a]">All Recurrences</option>
              {recurrences.map(r => <option key={r} value={r} className="bg-[#0f172a]">{r}</option>)}
            </select>

            {/* Sorting */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-850 text-slate-355 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="deadlineAsc" className="bg-[#0f172a]">Deadline (Earliest)</option>
                <option value="deadlineDesc" className="bg-[#0f172a]">Deadline (Latest)</option>
                <option value="streakDesc" className="bg-[#0f172a]">Highest Streak</option>
                <option value="progressDesc" className="bg-[#0f172a]">Highest Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Columns sections */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-slate-850 border-t-rose-500 rounded-full animate-spin"></div>
            <p className="mt-3 text-slate-400 text-sm">Loading goal records...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-[#0a0f1d]/40 border border-slate-850/80 rounded-2xl p-16 text-center max-w-xl mx-auto">
            <div className="flex justify-center mb-4 text-slate-600">
              <Target className="w-14 h-14 stroke-1 animate-pulse" />
            </div>
            <h3 className="text-base font-heading font-bold text-white">No active goals</h3>
            <p className="text-slate-450 text-xs mt-2 mb-6">
              Track DSA challenges, attendance logs, streaks, and course achievements. Select a template above to get started immediately!
            </p>
            <button
              onClick={() => {
                setGoalToEdit(null);
                reset();
                setActiveTemplate('');
                setIsGoalModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Urgent Alerts section (if any goal has warning / is overdue) */}
            {overdueGoalsList.length > 0 && (
              <div className="bg-red-950/15 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading text-xs font-bold text-white">Overdue Goals Warning!</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    You have <span className="text-red-400 font-bold">{overdueGoalsList.length} goal(s)</span> that have passed their deadline and remain incomplete. Adjust deadlines or manually resolve them.
                  </p>
                </div>
              </div>
            )}

            {/* 1. ACTIVE GOALS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h2 className="text-sm font-bold font-heading text-slate-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-400" />
                  <span>Active Goals & Challenges</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-bold bg-[#131b2e]/40 px-2 py-0.5 rounded-md border border-slate-850">
                  {activeGoalsList.length} Active
                </span>
              </div>

              {activeGoalsList.length === 0 ? (
                <p className="text-slate-550 text-xs italic py-4">No active goals match your filters.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {activeGoalsList.map(goal => (
                      <motion.div
                        key={goal._id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/85 transition-all flex flex-col justify-between group h-fit relative overflow-hidden"
                      >
                        {/* Urgent highlight overlay */}
                        {isDeadlineUrgent(goal.deadline) && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" title="Deadline within 24 hours!" />
                        )}

                        <div className="space-y-4">
                          {/* Heading row */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 
                                onClick={() => {
                                  setGoalToEdit(goal);
                                  setIsGoalModalOpen(true);
                                  // Populate edit form
                                  setTimeout(() => {
                                    setValue('title', goal.title);
                                    setValue('description', goal.description);
                                    setValue('category', goal.category);
                                    setValue('progressType', goal.progressType);
                                    setValue('targetValue', goal.targetValue);
                                    setValue('unit', goal.unit);
                                    setValue('priority', goal.priority);
                                    setValue('recurrence', goal.recurrence);
                                    setValue('deadline', new Date(goal.deadline).toISOString().split('T')[0]);
                                    replace(goal.milestones || []);
                                  }, 50);
                                }}
                                className="font-bold text-white truncate text-xs leading-snug hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Click to edit goal details"
                              >
                                {goal.title}
                              </h3>
                              <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase">{goal.recurrence} Challenge</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Streak Counter display */}
                              {goal.streak > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/15" title="Consecutive day streak!">
                                  <Flame className="w-3 h-3 fill-amber-500/15" />
                                  <span>{goal.streak}d</span>
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteGoal(goal._id)}
                                className="p-1 hover:text-red-400 text-slate-500 hover:bg-slate-800/40 rounded transition-colors"
                                title="Delete Goal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Category and priority badges */}
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getCategoryColor(goal.category)}`}>
                              {goal.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getPriorityBadgeColor(goal.priority)}`}>
                              {goal.priority}
                            </span>
                          </div>

                          {goal.description && (
                            <p className="text-[10px] text-slate-400 leading-relaxed truncate-2-lines">
                              {goal.description}
                            </p>
                          )}

                          {/* Dynamic Progress indicator layouts */}
                          <div className="space-y-2 pt-1">
                            
                            {/* Circular graphic vs Horizontal Bar based on type */}
                            {goal.progressType === 'percentage' ? (
                              <div className="flex items-center gap-4">
                                {/* SVG Circular progress */}
                                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3" fill="transparent" />
                                    <circle 
                                      cx="24" 
                                      cy="24" 
                                      r="20" 
                                      stroke="#6366f1" 
                                      strokeWidth="3.5" 
                                      fill="transparent" 
                                      strokeDasharray={2 * Math.PI * 20}
                                      strokeDashoffset={2 * Math.PI * 20 * (1 - (goal.currentProgress / goal.targetValue))}
                                      strokeLinecap="round"
                                      className="transition-all duration-500 ease-out"
                                    />
                                  </svg>
                                  <span className="absolute text-[9px] font-bold text-white">{Math.round((goal.currentProgress / goal.targetValue) * 100)}%</span>
                                </div>
                                <div className="text-xs">
                                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Current Value</p>
                                  <p className="font-bold text-slate-200 mt-0.5">{goal.currentProgress}{goal.unit} / {goal.targetValue}{goal.unit}</p>
                                </div>
                              </div>
                            ) : (
                              // Default horizontal bar
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className="text-slate-450">Progress ({Math.round((goal.currentProgress / goal.targetValue) * 100)}%)</span>
                                  <span className="text-indigo-400">{goal.currentProgress} / {goal.targetValue} {goal.unit}</span>
                                </div>
                                <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 transition-all duration-300"
                                    style={{ width: `${Math.round((goal.currentProgress / goal.targetValue) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                          </div>
                        </div>

                        {/* Expandable Milestones checklist (if milestones exist) */}
                        {goal.milestones && goal.milestones.length > 0 && (
                          <div className="mt-4 border-t border-slate-850/60 pt-3">
                            <button
                              onClick={() => toggleMilestonesExpand(goal._id)}
                              className="flex items-center justify-between w-full text-[10px] font-bold text-slate-450 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>Milestone Checklist ({goal.milestones.filter(m => m.completed).length} / {goal.milestones.length})</span>
                              {expandedMilestones[goal._id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            
                            {expandedMilestones[goal._id] && (
                              <div className="mt-2.5 space-y-2.5 max-h-[140px] overflow-y-auto pr-1 animate-in slide-in-from-top-1 duration-150">
                                {goal.milestones.map((m, idx) => (
                                  <label key={idx} className="flex items-start gap-2.5 cursor-pointer text-[10px] font-medium text-slate-350 hover:text-white select-none">
                                    <input
                                      type="checkbox"
                                      checked={m.completed}
                                      onChange={() => handleToggleMilestone(goal, idx)}
                                      className="mt-0.5 rounded text-indigo-500 focus:ring-indigo-500 shrink-0"
                                    />
                                    <span className={m.completed ? 'line-through text-slate-550' : ''}>{m.title}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer row with Deadline warnings & direct Increment buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                          <span className={`flex items-center gap-1 shrink-0 ${isDeadlineUrgent(goal.deadline) ? 'text-amber-500 font-bold' : ''}`} title="Target Completion date">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {formatGoalDate(goal.deadline)}</span>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Manual Streak shield recovery click */}
                            {goal.streakRecoveryRemaining > 0 && (
                              <button
                                onClick={() => handleUpdateProgress(goal, { increment: 1, useRecoveryToken: true })}
                                className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all font-bold cursor-pointer"
                                title="Protect streak with shield token"
                              >
                                Streak Shield ({goal.streakRecoveryRemaining})
                              </button>
                            )}

                            {/* Increment progress button if type is numeric/percentage */}
                            {goal.progressType !== 'milestones' && (
                              <button
                                onClick={() => handleUpdateProgress(goal, { increment: 1 })}
                                className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow hover:shadow-indigo-500/5 active:scale-95"
                                title={`Increment progress by +1 ${goal.unit}`}
                              >
                                +1 {goal.unit}
                              </button>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* 2. COMPLETED GOALS SECTION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h2 className="text-sm font-bold font-heading text-slate-200 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-450" />
                  <span>Accomplished Goals</span>
                </h2>
                <span className="text-[10px] text-slate-500 font-bold bg-[#131b2e]/40 px-2 py-0.5 rounded-md border border-slate-850">
                  {completedGoalsList.length} Completed
                </span>
              </div>

              {completedGoalsList.length === 0 ? (
                <p className="text-slate-550 text-xs italic py-2">No completed goals found yet. Crush goals to list them here!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {completedGoalsList.map(goal => (
                      <motion.div
                        key={goal._id}
                        layout
                        className="bg-[#0a0f1d]/40 border border-slate-900 rounded-2xl p-5 opacity-75 hover:opacity-100 transition-opacity flex flex-col justify-between relative overflow-hidden"
                      >
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-300 truncate text-xs leading-snug line-through">
                                {goal.title}
                              </h3>
                              <p className="text-[9px] text-slate-500 mt-1">Completed: {formatGoalDate(goal.completedAt || goal.updatedAt)}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteGoal(goal._id)}
                              className="p-1 hover:text-red-400 text-slate-550 hover:bg-slate-800/40 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getCategoryColor(goal.category)}`}>
                              {goal.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Completed
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-550 font-medium">
                          <span>Target: {goal.targetValue} {goal.unit}</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Done</span>
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* 3. OVERDUE GOALS SECTION */}
            {overdueGoalsList.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <h2 className="text-sm font-bold font-heading text-red-450 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <span>Overdue Goals</span>
                  </h2>
                  <span className="text-[10px] text-slate-500 font-bold bg-[#131b2e]/40 px-2 py-0.5 rounded-md border border-slate-850">
                    {overdueGoalsList.length} Overdue
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {overdueGoalsList.map(goal => (
                      <motion.div
                        key={goal._id}
                        layout
                        className="bg-red-950/[0.03] border border-red-500/10 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden"
                      >
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h3 
                                onClick={() => {
                                  setGoalToEdit(goal);
                                  setIsGoalModalOpen(true);
                                  setTimeout(() => {
                                    setValue('title', goal.title);
                                    setValue('description', goal.description);
                                    setValue('category', goal.category);
                                    setValue('progressType', goal.progressType);
                                    setValue('targetValue', goal.targetValue);
                                    setValue('unit', goal.unit);
                                    setValue('priority', goal.priority);
                                    setValue('recurrence', goal.recurrence);
                                    setValue('deadline', new Date(goal.deadline).toISOString().split('T')[0]);
                                    replace(goal.milestones || []);
                                  }, 50);
                                }}
                                className="font-bold text-red-400 truncate text-xs leading-snug hover:underline cursor-pointer"
                              >
                                {goal.title}
                              </h3>
                              <p className="text-[9px] text-red-500/70 mt-1 uppercase font-bold">Overdue since: {formatGoalDate(goal.deadline)}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteGoal(goal._id)}
                              className="p-1 hover:text-red-400 text-slate-500 hover:bg-slate-800/40 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getCategoryColor(goal.category)}`}>
                              {goal.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                              Priority: {goal.priority}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] text-slate-450 font-bold">
                              <span>Progress: {Math.round((goal.currentProgress / goal.targetValue) * 100)}%</span>
                              <span>{goal.currentProgress} / {goal.targetValue}</span>
                            </div>
                            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500" style={{ width: `${Math.round((goal.currentProgress / goal.targetValue) * 100)}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-550">
                          <button
                            onClick={() => {
                              // Auto-increment progress or prompt editing deadline
                              setGoalToEdit(goal);
                              setIsGoalModalOpen(true);
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
                          >
                            Reschedule Deadline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ================= MODAL: CREATE OR EDIT GOAL ================= */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
                <h2 className="font-heading text-sm md:text-base font-bold text-white">
                  {goalToEdit ? 'Edit Goal Details' : 'Create Custom Study Goal'}
                </h2>
                <button
                  onClick={() => {
                    setIsGoalModalOpen(false);
                    setGoalToEdit(null);
                    reset();
                    setActiveTemplate('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitGoal)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                
                {/* Templates option inside modal */}
                {!goalToEdit && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Quick Start Template (Optional)
                    </label>
                    <select
                      value={activeTemplate}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full bg-[#131b2e]/60 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 px-3 outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Template --</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master React Context APIs"
                    {...register('title', { required: 'Goal title is required' })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-550 outline-none"
                  />
                  {errors.title && (
                    <p className="mt-1 text-[9px] text-red-400 font-medium">{errors.title.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                    Description / Purpose
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Build study habits for final exam prep."
                    {...register('description')}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-550 outline-none resize-none"
                  />
                </div>

                {/* Category, Priority, Recurrence Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                      Category *
                    </label>
                    <select
                      {...register('category', { required: true })}
                      className="w-full bg-[#131b2e]/60 border border-slate-800 text-slate-300 text-xs rounded-xl py-2.5 px-3 outline-none cursor-pointer"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                      Priority *
                    </label>
                    <select
                      {...register('priority', { required: true })}
                      className="w-full bg-[#131b2e]/60 border border-slate-800 text-slate-300 text-xs rounded-xl py-2.5 px-3 outline-none cursor-pointer"
                    >
                      {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                      Recurrence *
                    </label>
                    <select
                      {...register('recurrence', { required: true })}
                      className="w-full bg-[#131b2e]/60 border border-slate-800 text-slate-300 text-xs rounded-xl py-2.5 px-3 outline-none cursor-pointer"
                    >
                      {recurrences.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Progress Type selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                      Progress Type *
                    </label>
                    <select
                      {...register('progressType', { required: true })}
                      className="w-full bg-[#131b2e]/60 border border-slate-800 text-slate-300 text-xs rounded-xl py-2.5 px-3 outline-none cursor-pointer"
                    >
                      <option value="numeric">Numeric Counter</option>
                      <option value="percentage">Percentage (0-100%)</option>
                      <option value="milestones">Milestones checklist</option>
                    </select>
                  </div>

                  {watchProgressType !== 'milestones' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                          Target Value *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          {...register('targetValue', { required: 'Target is required', min: 1 })}
                          className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                          Progress Unit *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Problems, Hours"
                          disabled={watchProgressType === 'percentage'}
                          {...register('unit')}
                          className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-650 outline-none disabled:opacity-50"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Milestones dynamic list (Shown if progressType is milestones) */}
                {watchProgressType === 'milestones' && (
                  <div className="p-3.5 bg-[#131b2e]/30 border border-slate-850 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase text-slate-450">Milestone Checklists</label>
                      <button
                        type="button"
                        onClick={() => append({ title: '', completed: false })}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Subtask</span>
                      </button>
                    </div>

                    <div className="space-y-2 pt-1 max-h-[160px] overflow-y-auto pr-1">
                      {fields.length === 0 && (
                        <p className="text-[10px] text-slate-550 italic">Add at least one subtask. Completion is auto-calculated.</p>
                      )}
                      {fields.map((field, idx) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            placeholder={`Subtask #${idx + 1}`}
                            {...register(`milestones.${idx}.title`, { required: true })}
                            className="flex-1 bg-[#0f172a] border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-white placeholder-slate-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="p-1.5 hover:text-red-400 text-slate-500 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deadline */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-405 mb-1.5">
                    Completion Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    {...register('deadline', { required: 'Deadline is required' })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-650 outline-none"
                  />
                  {errors.deadline && (
                    <p className="mt-1 text-[9px] text-red-400 font-medium">{errors.deadline.message}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGoalModalOpen(false);
                      setGoalToEdit(null);
                      reset();
                      setActiveTemplate('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-350 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                  >
                    {goalToEdit ? 'Save Changes' : 'Launch Goal'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
};

export default GoalTracker;

// Helper function
const formatGoalDate = (dateString) => {
  if (!dateString) return 'N/A';
  return formatDate(dateString);
};
