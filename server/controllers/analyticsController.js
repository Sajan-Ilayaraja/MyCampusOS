const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Goal = require('../models/Goal');
const Note = require('../models/Note');
const { analyticsCache, CACHE_EXPIRATION_MS } = require('../utils/cache');

// Cache check helper
const checkCache = (req) => {
  if (req?.query?.bypassCache === 'true' || req?.headers?.['x-bypass-cache'] === 'true') {
    return null;
  }
  const cacheKey = `${req?.user?._id}_${req?.path}_${req?.query?.timeFilter || '30days'}_${req?.query?.startDate || ''}_${req?.query?.endDate || ''}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt < CACHE_EXPIRATION_MS)) {
    return cached.data;
  }
  return null;
};

// Cache save helper
const saveCache = (req, data) => {
  const cacheKey = `${req?.user?._id}_${req?.path}_${req?.query?.timeFilter || '30days'}_${req?.query?.startDate || ''}_${req?.query?.endDate || ''}`;
  analyticsCache.set(cacheKey, { data, cachedAt: Date.now() });
};


// Date range resolver
const resolveDateRange = (query) => {
  const { timeFilter = '30days', startDate, endDate } = query;
  const now = new Date();
  let start = new Date();
  let end = now;

  if (timeFilter === '7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === '30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === '90days') {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === 'semester') {
    start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === 'custom' && startDate) {
    start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
    }
  } else {
    // Default to last 30 days
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Normalize hours
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Helper: Calculate advanced productivity score
const calculateProductivityScore = (metrics) => {
  const {
    totalTasks = 0, completedTasks = 0, overdueTasks = 0,
    totalGoals = 0, completedGoals = 0, maxStreak = 0,
    activeDaysCount = 0, totalDays = 30
  } = metrics;

  // Enforce isolation / empty states: return 0 if no activity/data exists
  const hasAnyActivity = totalTasks > 0 || totalGoals > 0 || activeDaysCount > 0;
  if (!hasAnyActivity) return 0;

  // 1. Task Score (40%)
  let taskScore = 80;
  if (totalTasks > 0) {
    const completionRatio = completedTasks / totalTasks;
    const penalty = Math.min(30, overdueTasks * 5);
    taskScore = Math.max(0, (completionRatio * 100) - penalty);
  }

  // 2. Goal Score (30%)
  let goalScore = 80;
  if (totalGoals > 0) {
    const goalCompletionRate = (completedGoals / totalGoals) * 100;
    const streakScore = Math.min(100, maxStreak * 10);
    goalScore = (goalCompletionRate * 0.6) + (streakScore * 0.4);
  }

  // 3. Daily Consistency Score (30%)
  // Consistency = activeDays / totalDays
  const daysToCheck = Math.max(1, totalDays);
  // Scale so that keeping active half the days yields full consistency score
  const consistencyScore = Math.min(100, (activeDaysCount / daysToCheck) * 100 * 2);

  const score = (taskScore * 0.40) + (goalScore * 0.30) + (consistencyScore * 0.30);
  return Math.min(100, Math.round(score));
};

// @desc    Get overview statistics
// @route   GET /api/analytics/overview
// @access  Private
const getOverviewAnalytics = async (req, res) => {
  try {
    const cachedData = checkCache(req);
    if (cachedData) return res.status(200).json(cachedData);

    const userId = req.user._id;
    const { start, end } = resolveDateRange(req.query);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

    // 1. Task Summary within range
    const totalTasks = await Task.countDocuments({
      userId,
      createdAt: { $lte: end }
    });
    const completedTasks = await Task.countDocuments({
      userId,
      completed: true,
      updatedAt: { $gte: start, $lte: end }
    });
    const overdueTasks = await Task.countDocuments({
      userId,
      completed: false,
      dueDate: { $gte: start, $lte: end }
    });
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // 2. Attendance Summary
    const subjects = await Subject.find({ userId });
    let totalPresent = 0;
    let totalLogs = 0;
    subjects.forEach(sub => {
      sub.history.forEach(entry => {
        if (entry.date >= start && entry.date <= end) {
          totalLogs++;
          if (entry.status === 'present') totalPresent++;
        }
      });
    });
    const overallAttendance = totalLogs > 0 
      ? (totalPresent / totalLogs) * 100 
      : (subjects.length > 0 ? subjects.reduce((sum, s) => sum + (s.percentage || 0), 0) / subjects.length : 0);

    // 3. Goal Streak Metrics
    const goals = await Goal.find({ userId, createdAt: { $lte: end } });
    const completedGoals = goals.filter(g => g.status === 'Completed' && g.completedAt >= start && g.completedAt <= end).length;
    const goalRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;
    const maxStreak = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;

    // 4. Active days for consistency
    const activitySet = new Set();
    const addActivityDate = (d) => {
      if (!d) return;
      const dateVal = new Date(d);
      if (dateVal >= start && dateVal <= end) {
        activitySet.add(dateVal.toISOString().split('T')[0]);
      }
    };

    const tasksList = await Task.find({ userId });
    tasksList.forEach(t => {
      addActivityDate(t.createdAt);
      if (t.completed) addActivityDate(t.updatedAt);
    });
    subjects.forEach(sub => sub.history.forEach(entry => addActivityDate(entry.date)));
    goals.forEach(g => {
      addActivityDate(g.createdAt);
      if (g.completedAt) addActivityDate(g.completedAt);
    });

    const activeDaysCount = activitySet.size;

    const pScore = calculateProductivityScore({
      totalTasks, completedTasks, overdueTasks,
      subjectCount: subjects.length, overallAttendance,
      totalGoals: goals.length, completedGoals, maxStreak,
      activeDaysCount, totalDays
    });

    const payload = {
      success: true,
      timeframe: { start, end },
      overview: {
        productivityScore: pScore,
        activeDaysCount,
        totalDays,
        weeklyConsistency: Math.round(Math.min(100, (activeDaysCount / totalDays) * 100)),
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          overdue: overdueTasks,
          rate: Math.round(taskCompletionRate * 10) / 10
        },
        attendance: null,
        goals: {
          total: goals.length,
          completed: completedGoals,
          maxStreak,
          rate: Math.round(goalRate * 10) / 10
        }
      }
    };

    saveCache(req, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Overview analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile overview analytics' });
  }
};

// @desc    Get detailed tasks analysis
// @route   GET /api/analytics/tasks
// @access  Private
const getTasksAnalytics = async (req, res) => {
  try {
    const cachedData = checkCache(req);
    if (cachedData) return res.status(200).json(cachedData);

    const userId = req.user._id;
    const { start, end } = resolveDateRange(req.query);

    const allTasks = await Task.find({
      userId,
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } },
        { dueDate: { $gte: start, $lte: end } }
      ]
    });

    const priorityAgg = await Task.aggregate([
      {
        $match: {
          userId,
          $or: [
            { createdAt: { $gte: start, $lte: end } },
            { updatedAt: { $gte: start, $lte: end } }
          ]
        }
      },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } }
        }
      }
    ]);

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const priorityData = ['low', 'medium', 'high'].map(p => {
      const agg = priorityAgg.find(a => a._id === p) || { total: 0, completed: 0 };
      return {
        priority: p.charAt(0).toUpperCase() + p.slice(1),
        total: agg.total,
        completed: agg.completed,
        rate: agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) : 0
      };
    });

    const dayCounts = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    allTasks.forEach(task => {
      if (task.completed && task.updatedAt >= start && task.updatedAt <= end) {
        const dayName = daysOfWeek[new Date(task.updatedAt).getDay()];
        dayCounts[dayName]++;
      }
    });

    const completionByDay = Object.keys(dayCounts).map(day => ({
      day: day.substring(0, 3),
      completed: dayCounts[day]
    }));

    const payload = {
      success: true,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        completionRate: Math.round(completionRate * 10) / 10,
        priorityData,
        completionByDay
      }
    };

    saveCache(req, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Tasks analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile tasks analytics' });
  }
};


// @desc    Get goals progression and streaks
// @route   GET /api/analytics/goals
// @access  Private
const getGoalsAnalytics = async (req, res) => {
  try {
    const cachedData = checkCache(req);
    if (cachedData) return res.status(200).json(cachedData);

    const userId = req.user._id;
    const { start, end } = resolveDateRange(req.query);

    const goals = await Goal.find({
      userId,
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { updatedAt: { $gte: start, $lte: end } }
      ]
    });

    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'Completed' && g.completedAt >= start && g.completedAt <= end).length;
    const activeGoals = goals.filter(g => g.status === 'In Progress' || g.status === 'Pending').length;
    const overdueGoals = goals.filter(g => g.status === 'Overdue').length;
    const rate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    const maxStreak = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;
    
    const categories = ['Study', 'Attendance', 'Assignments', 'Personal Development'];
    const categoryData = categories.map(cat => {
      const catGoals = goals.filter(g => g.category === cat);
      const catCompleted = catGoals.filter(g => g.status === 'Completed').length;
      let avgProgPercent = 0;
      
      catGoals.forEach(g => {
        const target = g.targetValue || 1;
        const current = g.currentProgress || 0;
        avgProgPercent += Math.min(100, (current / target) * 100);
      });

      return {
        category: cat,
        total: catGoals.length,
        completed: catCompleted,
        avgProgress: catGoals.length > 0 ? Math.round(avgProgPercent / catGoals.length) : 0
      };
    });

    const payload = {
      success: true,
      goals: {
        total: totalGoals,
        completed: completedGoals,
        active: activeGoals,
        overdue: overdueGoals,
        completionRate: Math.round(rate * 10) / 10,
        maxStreak,
        categoryData
      }
    };

    saveCache(req, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Goals analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile goals analytics' });
  }
};

// @desc    Get study consistency logs and dynamic smart insights
// @route   GET /api/analytics/productivity
// @access  Private
const getProductivityAnalytics = async (req, res) => {
  try {
    const cachedData = checkCache(req);
    if (cachedData) return res.status(200).json(cachedData);

    const userId = req.user._id;
    const { start, end } = resolveDateRange(req.query);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

    // Fetch all items for user to compute score history & consistency heatmap
    const [tasks, subjects, goals, notes] = await Promise.all([
      Task.find({ userId }),
      Subject.find({ userId }),
      Goal.find({ userId }),
      Note.find({ uploadedBy: userId })
    ]);

    // Build the activity heatmap grid based on the filtered date range
    const activityCounts = {};
    const logActivity = (dateStr) => {
      if (!dateStr) return;
      const key = new Date(dateStr).toISOString().split('T')[0];
      activityCounts[key] = (activityCounts[key] || 0) + 1;
    };

    // Log tasks
    tasks.forEach(t => {
      logActivity(t.createdAt);
      if (t.completed) logActivity(t.updatedAt);
    });
    // Log attendance
    subjects.forEach(s => {
      s.history.forEach(entry => logActivity(entry.date));
    });
    // Log goals
    goals.forEach(g => {
      logActivity(g.createdAt);
      if (g.status === 'Completed' && g.completedAt) logActivity(g.completedAt);
    });
    // Log notes
    notes.forEach(n => logActivity(n.createdAt));

    // Construct daily heatmap array in filtered range
    const heatmap = [];
    const loopDate = new Date(start);
    const today = new Date(end);

    let activeDaysCount = 0;
    while (loopDate <= today) {
      const key = loopDate.toISOString().split('T')[0];
      const count = activityCounts[key] || 0;
      // Cap daily activities counted for consistency to prevent spam inflation
      const cappedCount = Math.min(10, count);
      
      if (count > 0) activeDaysCount++;

      heatmap.push({
        date: key,
        count: cappedCount,
        rawCount: count // show actual count in hover tooltips
      });
      loopDate.setDate(loopDate.getDate() + 1);
    }

    // Compute most active days of the week
    const dayActivity = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    heatmap.forEach(h => {
      const dayName = daysArr[new Date(h.date).getDay()];
      dayActivity[dayName] += h.rawCount;
    });
    const activeDaysData = Object.keys(dayActivity).map(day => ({
      day,
      count: dayActivity[day]
    }));

    // Weekly progress score builder (Wk 1 to Wk 4)
    const getWeekRange = (weeksAgo) => {
      const now = new Date();
      const endRange = new Date(now.getTime() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
      const startRange = new Date(now.getTime() - (weeksAgo + 1) * 7 * 24 * 60 * 60 * 1000);
      startRange.setHours(0, 0, 0, 0);
      endRange.setHours(23, 59, 59, 999);
      return { wStart: startRange, wEnd: endRange };
    };

    const calculateScoreForRange = (wStart, wEnd) => {
      const filteredTasks = tasks.filter(t => t.createdAt <= wEnd);
      const tTasks = filteredTasks.length;
      const cTasks = filteredTasks.filter(t => t.completed && t.updatedAt >= wStart && t.updatedAt <= wEnd).length;
      const oTasks = filteredTasks.filter(t => !t.completed && new Date(t.dueDate) < wEnd && new Date(t.dueDate) >= wStart).length;
      
      let overallAttendance = 0;
      let logsInPeriod = 0;
      let presentInPeriod = 0;
      subjects.forEach(s => {
        s.history.forEach(entry => {
          if (entry.date >= wStart && entry.date <= wEnd) {
            logsInPeriod++;
            if (entry.status === 'present') presentInPeriod++;
          }
        });
      });
      if (logsInPeriod > 0) {
        overallAttendance = (presentInPeriod / logsInPeriod) * 100;
      } else if (subjects.length > 0) {
        overallAttendance = subjects.reduce((sum, s) => sum + (s.percentage || 0), 0) / subjects.length;
      }

      const filteredGoals = goals.filter(g => g.createdAt <= wEnd);
      const tGoals = filteredGoals.length;
      const cGoals = filteredGoals.filter(g => g.status === 'Completed' && g.completedAt >= wStart && g.completedAt <= wEnd).length;
      const maxStreak = filteredGoals.length > 0 ? Math.max(...filteredGoals.map(g => g.streak || 0)) : 0;

      // Active days count in this 7-day period
      const activeDaysSet = new Set();
      const checkAndAdd = (dateStr) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        if (d >= wStart && d <= wEnd) {
          activeDaysSet.add(d.toISOString().split('T')[0]);
        }
      };
      tasks.forEach(t => { checkAndAdd(t.createdAt); if (t.completed) checkAndAdd(t.updatedAt); });
      subjects.forEach(s => s.history.forEach(e => checkAndAdd(e.date)));
      goals.forEach(g => { checkAndAdd(g.createdAt); if (g.completedAt) checkAndAdd(g.completedAt); });

      return calculateProductivityScore({
        totalTasks: tTasks, completedTasks: cTasks, overdueTasks: oTasks,
        subjectCount: subjects.length, overallAttendance,
        totalGoals: tGoals, completedGoals: cGoals, maxStreak,
        activeDaysCount: activeDaysSet.size, totalDays: 7
      });
    };

    const w1Score = calculateScoreForRange(getWeekRange(3).wStart, getWeekRange(3).wEnd);
    const w2Score = calculateScoreForRange(getWeekRange(2).wStart, getWeekRange(2).wEnd);
    const w3Score = calculateScoreForRange(getWeekRange(1).wStart, getWeekRange(1).wEnd);
    const w4Score = calculateScoreForRange(getWeekRange(0).wStart, getWeekRange(0).wEnd);

    const weeklyProgress = [
      { week: 'Wk 1', score: w1Score },
      { week: 'Wk 2', score: w2Score },
      { week: 'Wk 3', score: w3Score },
      { week: 'Wk 4', score: w4Score }
    ];

    // Compute main metrics for current timeframe productivity score
    const filteredTasks = tasks.filter(t => t.createdAt <= end);
    const totalTasksCount = filteredTasks.length;
    const completedTasksCount = filteredTasks.filter(t => t.completed && t.updatedAt >= start && t.updatedAt <= end).length;
    const overdueTasksCount = filteredTasks.filter(t => !t.completed && new Date(t.dueDate) < end && new Date(t.dueDate) >= start).length;

    let overallAttendancePercent = 0;
    let logsCount = 0;
    let presentCount = 0;
    subjects.forEach(s => {
      s.history.forEach(entry => {
        if (entry.date >= start && entry.date <= end) {
          logsCount++;
          if (entry.status === 'present') presentCount++;
        }
      });
    });
    if (logsCount > 0) {
      overallAttendancePercent = (presentCount / logsCount) * 100;
    } else if (subjects.length > 0) {
      overallAttendancePercent = subjects.reduce((sum, s) => sum + (s.percentage || 0), 0) / subjects.length;
    }

    const filteredGoals = goals.filter(g => g.createdAt <= end);
    const totalGoalsCount = filteredGoals.length;
    const completedGoalsCount = filteredGoals.filter(g => g.status === 'Completed' && g.completedAt >= start && g.completedAt <= end).length;
    const maxStreakCount = filteredGoals.length > 0 ? Math.max(...filteredGoals.map(g => g.streak || 0)) : 0;

    const productivityScore = calculateProductivityScore({
      totalTasks: totalTasksCount, completedTasks: completedTasksCount, overdueTasks: overdueTasksCount,
      subjectCount: subjects.length, overallAttendance: overallAttendancePercent,
      totalGoals: totalGoalsCount, completedGoals: completedGoalsCount, maxStreak: maxStreakCount,
      activeDaysCount, totalDays
    });

    // 4. Generate dynamic insights
    const insights = [];

    // Insight 1: Productivity Trend
    const trendDrop = w3Score - w4Score;
    if (trendDrop > 0) {
      insights.push({
        category: 'warning',
        title: 'Productivity Trend Drop',
        message: `Your productivity dropped ${Math.round((trendDrop / (w3Score || 1)) * 100)}% this week compared to last week.`
      });
    } else if (trendDrop < 0) {
      insights.push({
        category: 'success',
        title: 'Productivity Growth',
        message: `Your productivity increased ${Math.round((Math.abs(trendDrop) / (w3Score || 1)) * 100)}% this week. Keep up the high consistency!`
      });
    }

    // Insight 2: Course Attendance Warning
    if (subjects.length > 0) {
      const criticallyLow = subjects.filter(s => s.percentage < 75);
      if (criticallyLow.length > 0) {
        insights.push({
          category: 'warning',
          title: 'Debarment Risk Warning',
          message: `${criticallyLow[0].subject} (${criticallyLow[0].subjectCode || 'N/A'}) attendance is critically low (${criticallyLow[0].percentage}%). Attend classes to recover.`
        });
      } else {
        insights.push({
          category: 'success',
          title: 'Optimal Attendance Health',
          message: 'Excellent job maintaining overall course attendance above the 75% target threshold.'
        });
      }
    }

    // Insight 3: Completion Behavior (Weekend vs Weekday)
    let weekendCompletions = 0;
    let weekdayCompletions = 0;
    tasks.forEach(t => {
      if (t.completed && t.updatedAt) {
        const day = new Date(t.updatedAt).getDay();
        if (day === 0 || day === 6) weekendCompletions++;
        else weekdayCompletions++;
      }
    });
    goals.forEach(g => {
      if (g.status === 'Completed' && g.completedAt) {
        const day = new Date(g.completedAt).getDay();
        if (day === 0 || day === 6) weekendCompletions++;
        else weekdayCompletions++;
      }
    });

    if (weekendCompletions > weekdayCompletions) {
      insights.push({
        category: 'success',
        title: 'Weekend Warrior',
        message: 'You complete more goals and tasks on weekends. Use weekdays to prep and plan.'
      });
    }

    // General fallback insights if list is small
    if (insights.length < 2) {
      insights.push({
        category: 'suggestion',
        title: 'Study Recommendation',
        message: 'Increase your daily study consistency checklist to unlock achievement badges.'
      });
    }

    const payload = {
      success: true,
      productivity: {
        score: productivityScore,
        heatmap,
        activeDays: activeDaysData,
        insights,
        weeklyProgress
      }
    };

    saveCache(req, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Productivity analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile productivity analytics' });
  }
};

module.exports = {
  getOverviewAnalytics,
  getTasksAnalytics,
  getGoalsAnalytics,
  getProductivityAnalytics
};
