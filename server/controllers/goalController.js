const Goal = require('../models/Goal');

// Helper to check if two dates are the same calendar day
const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Helper to check if d1 is yesterday relative to d2
const isYesterday = (d1, d2) => {
  const check = new Date(d2);
  check.setDate(check.getDate() - 1);
  return isSameDay(d1, check);
};

// Helper to check if two dates are in the same calendar week (Sunday-Saturday)
const isSameWeek = (d1, d2) => {
  const getWeekNumber = (d) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    // Sunday is day 0. Find the start of the week (Sunday)
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff)).getTime();
  };
  return getWeekNumber(d1) === getWeekNumber(d2);
};

// Helper to check if d1 is the previous week relative to d2
const isPreviousWeek = (d1, d2) => {
  const oneWeekAgo = new Date(d2.getTime());
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return isSameWeek(d1, oneWeekAgo);
};

// Helper to check if two dates are in the same calendar month
const isSameMonth = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

// Helper to check if d1 is the previous month relative to d2
const isPreviousMonth = (d1, d2) => {
  const check = new Date(d2);
  check.setMonth(check.getMonth() - 1);
  return isSameMonth(d1, check);
};

// Helper to calculate streak logic when progress increases
const calculateStreak = (goal, now) => {
  const lastUpdate = goal.lastProgressUpdateAt;
  
  if (!lastUpdate) {
    // First update ever starts the streak at 1
    goal.streak = 1;
    goal.longestStreak = Math.max(goal.longestStreak || 0, 1);
    return { streakUpdated: true, recoveryApplied: false };
  }

  let recoveryApplied = false;

  if (goal.recurrence === 'Daily') {
    if (isSameDay(lastUpdate, now)) {
      // Already updated today, keep streak
      return { streakUpdated: false, recoveryApplied: false };
    } else if (isYesterday(lastUpdate, now)) {
      // Updated yesterday, consecutive day!
      goal.streak += 1;
      goal.longestStreak = Math.max(goal.longestStreak || 0, goal.streak);
      return { streakUpdated: true, recoveryApplied: false };
    } else {
      // Missed days!
      // Check for streak recovery logic: if last update was 2 days ago, and recovery tokens exist
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      if (isSameDay(lastUpdate, twoDaysAgo) && goal.streakRecoveryRemaining > 0) {
        // Safe streak recovery applied!
        goal.streakRecoveryRemaining -= 1;
        goal.streak += 1; // Preserve and increment
        goal.longestStreak = Math.max(goal.longestStreak || 0, goal.streak);
        recoveryApplied = true;
        return { streakUpdated: true, recoveryApplied: true };
      } else {
        // Cannot recover: calculate missed days count
        const diffTime = Math.abs(now - lastUpdate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) - 1;
        goal.missedDays += Math.max(1, diffDays);
        goal.streak = 1;
        return { streakUpdated: true, recoveryApplied: false };
      }
    }
  } else if (goal.recurrence === 'Weekly') {
    if (isSameWeek(lastUpdate, now)) {
      return { streakUpdated: false, recoveryApplied: false };
    } else if (isPreviousWeek(lastUpdate, now)) {
      goal.streak += 1;
      goal.longestStreak = Math.max(goal.longestStreak || 0, goal.streak);
      return { streakUpdated: true, recoveryApplied: false };
    } else {
      goal.streak = 1;
      return { streakUpdated: true, recoveryApplied: false };
    }
  } else if (goal.recurrence === 'Monthly') {
    if (isSameMonth(lastUpdate, now)) {
      return { streakUpdated: false, recoveryApplied: false };
    } else if (isPreviousMonth(lastUpdate, now)) {
      goal.streak += 1;
      goal.longestStreak = Math.max(goal.longestStreak || 0, goal.streak);
      return { streakUpdated: true, recoveryApplied: false };
    } else {
      goal.streak = 1;
      return { streakUpdated: true, recoveryApplied: false };
    }
  }

  return { streakUpdated: false, recoveryApplied: false };
};

// @desc    Get all goals for the logged-in student
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Overdue Detection: automatically mark goals as Overdue in DB if past deadline and not completed
    await Goal.updateMany(
      {
        userId,
        status: { $nin: ['Completed', 'Overdue'] },
        deadline: { $lt: now }
      },
      { status: 'Overdue' }
    );

    // Dynamic recovery: if user edits a goal's deadline to the future, restore to In Progress / Pending
    await Goal.updateMany(
      {
        userId,
        status: 'Overdue',
        deadline: { $gte: now }
      },
      { status: 'In Progress' }
    );

    // Retrieve goals
    const goals = await Goal.find({ userId }).sort({ deadline: 1 });

    return res.status(200).json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to load goals' });
  }
};

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      progressType,
      targetValue,
      currentProgress,
      unit,
      deadline,
      priority,
      recurrence,
      milestones
    } = req.body;

    if (!title || !category || !targetValue || !deadline) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Determine default units based on progressType
    let finalUnit = unit || 'tasks';
    if (progressType === 'percentage') {
      finalUnit = '%';
    } else if (progressType === 'milestones') {
      finalUnit = 'milestones';
    }

    const finalTarget = progressType === 'milestones' ? (milestones?.length || 1) : Number(targetValue);
    const finalProgress = progressType === 'milestones' ? (milestones?.filter(m => m.completed).length || 0) : Number(currentProgress || 0);

    const goal = await Goal.create({
      title: title.trim(),
      description: description || '',
      category,
      progressType: progressType || 'numeric',
      targetValue: finalTarget,
      currentProgress: Math.min(finalTarget, Math.max(0, finalProgress)),
      unit: finalUnit,
      deadline: new Date(deadline),
      priority: priority || 'medium',
      recurrence: recurrence || 'One-time',
      milestones: milestones || [],
      userId: req.user._id,
      status: finalProgress >= finalTarget ? 'Completed' : 'Pending',
      completedAt: finalProgress >= finalTarget ? new Date() : undefined
    });

    return res.status(201).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to create goal' });
  }
};

// @desc    Get a single goal
// @route   GET /api/goals/:id
// @access  Private
const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this goal' });
    }

    return res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Get goal error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to fetch goal details' });
  }
};

// @desc    Update/Rename a goal metadata
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this goal' });
    }

    const {
      title,
      description,
      category,
      progressType,
      targetValue,
      currentProgress,
      unit,
      deadline,
      priority,
      recurrence,
      milestones,
      streakRecoveryRemaining,
      streak,
      longestStreak,
      missedDays,
      lastProgressUpdateAt
    } = req.body;

    if (title) goal.title = title.trim();
    if (description !== undefined) goal.description = description;
    if (category) goal.category = category;
    if (progressType) goal.progressType = progressType;
    if (unit) goal.unit = unit;
    if (priority) goal.priority = priority;
    if (recurrence) goal.recurrence = recurrence;
    if (streakRecoveryRemaining !== undefined) goal.streakRecoveryRemaining = Number(streakRecoveryRemaining);
    if (streak !== undefined) goal.streak = Number(streak);
    if (longestStreak !== undefined) goal.longestStreak = Number(longestStreak);
    if (missedDays !== undefined) goal.missedDays = Number(missedDays);
    if (lastProgressUpdateAt !== undefined) goal.lastProgressUpdateAt = lastProgressUpdateAt;

    if (deadline) {
      goal.deadline = new Date(deadline);
      // Recalculate status if updated deadline changes overdue condition
      const now = new Date();
      if (goal.status === 'Overdue' && goal.deadline >= now) {
        goal.status = goal.currentProgress > 0 ? 'In Progress' : 'Pending';
      }
    }

    if (progressType === 'milestones' && milestones) {
      goal.milestones = milestones;
      goal.targetValue = milestones.length;
      goal.currentProgress = milestones.filter(m => m.completed).length;
    } else {
      if (targetValue !== undefined) goal.targetValue = Number(targetValue);
      if (currentProgress !== undefined) {
        goal.currentProgress = Math.min(goal.targetValue, Math.max(0, Number(currentProgress)));
      }
    }

    // Auto-completion detection
    if (goal.currentProgress >= goal.targetValue) {
      if (goal.status !== 'Completed') {
        goal.status = 'Completed';
        goal.completedAt = new Date();
      }
    } else {
      if (goal.status === 'Completed') {
        goal.completedAt = undefined;
      }
      const now = new Date();
      if (goal.deadline < now) {
        goal.status = 'Overdue';
      } else {
        goal.status = goal.currentProgress > 0 ? 'In Progress' : 'Pending';
      }
    }

    await goal.save();

    return res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update goal' });
  }
};

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this goal' });
    }

    await Goal.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete goal' });
  }
};

// @desc    Update progress of a goal
// @route   PATCH /api/goals/:id/progress
// @access  Private
const updateProgress = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this goal progress' });
    }

    const { currentProgress, increment, milestones, useRecoveryToken } = req.body;
    const now = new Date();
    const initialProgress = goal.currentProgress;

    // Apply milestone checklist changes
    if (goal.progressType === 'milestones' && milestones) {
      goal.milestones = milestones;
      goal.targetValue = milestones.length;
      goal.currentProgress = milestones.filter(m => m.completed).length;
    } else if (currentProgress !== undefined) {
      goal.currentProgress = Math.min(goal.targetValue, Math.max(0, Number(currentProgress)));
    } else if (increment !== undefined) {
      goal.currentProgress = Math.min(goal.targetValue, Math.max(0, goal.currentProgress + Number(increment)));
    }

    let streakResult = { streakUpdated: false, recoveryApplied: false };

    // Calculate streaks if progress has actually increased or changed
    if (goal.currentProgress > initialProgress) {
      // Force manual request trigger or automatically use recovery token if streak was about to reset
      if (useRecoveryToken && goal.streakRecoveryRemaining > 0) {
        // Force recovery consumption if explicitly requested
        goal.streakRecoveryRemaining -= 1;
        goal.streak += 1;
        goal.longestStreak = Math.max(goal.longestStreak || 0, goal.streak);
        streakResult = { streakUpdated: true, recoveryApplied: true };
      } else {
        streakResult = calculateStreak(goal, now);
      }
      goal.lastProgressUpdateAt = now;
    }

    // Auto-completion detection
    if (goal.currentProgress >= goal.targetValue) {
      if (goal.status !== 'Completed') {
        goal.status = 'Completed';
        goal.completedAt = now;
      }
    } else {
      if (goal.status === 'Completed') {
        goal.completedAt = undefined;
      }
      if (goal.deadline < now) {
        goal.status = 'Overdue';
      } else {
        goal.status = goal.currentProgress > 0 ? 'In Progress' : 'Pending';
      }
    }

    await goal.save();

    return res.status(200).json({
      success: true,
      goal,
      streakUpdated: streakResult.streakUpdated,
      recoveryApplied: streakResult.recoveryApplied
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update progress' });
  }
};

// @desc    Update status of a goal manually
// @route   PATCH /api/goals/:id/status
// @access  Private
const updateStatus = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    if (goal.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { status } = req.body;
    if (!status || !['Pending', 'In Progress', 'Completed', 'Overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    goal.status = status;
    if (status === 'Completed') {
      goal.currentProgress = goal.targetValue;
      goal.completedAt = new Date();
      // Milestones checklist: resolve all as completed
      if (goal.progressType === 'milestones') {
        goal.milestones.forEach(m => { m.completed = true; });
      }
    } else {
      goal.completedAt = undefined;
      if (status === 'Pending') {
        goal.currentProgress = 0;
        if (goal.progressType === 'milestones') {
          goal.milestones.forEach(m => { m.completed = false; });
        }
      }
    }

    await goal.save();

    return res.status(200).json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getGoals,
  createGoal,
  getGoalById,
  updateGoal,
  deleteGoal,
  updateProgress,
  updateStatus
};
