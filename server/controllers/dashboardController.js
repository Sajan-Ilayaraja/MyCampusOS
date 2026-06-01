const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Note = require('../models/Note');
const Timetable = require('../models/Timetable');
const NotesGroup = require('../models/NotesGroup');
const Goal = require('../models/Goal');

// @desc    Get dashboard metrics summary
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();

    // Fetch tasks, subjects, notes, timetable, and goals concurrently
    const [tasks, subjects, upcomingTasks, totalNotes, recentNotes, timetable, folderCount, storageAggregation, goals] = await Promise.all([
      Task.find({ userId }),
      Subject.find({ userId }),
      Task.find({ userId, completed: false }).sort({ dueDate: 1 }).limit(5),
      Note.countDocuments({ uploadedBy: userId }),
      Note.find({ uploadedBy: userId }).sort({ createdAt: -1 }).limit(5),
      Timetable.find({ userId }).populate('subjectId'),
      NotesGroup.countDocuments({ userId }),
      Note.aggregate([
        { $match: { uploadedBy: req.user._id } },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
      ]),
      Goal.find({ userId })
    ]);

    // 1. Task Summary
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // 2. Attendance Summary
    let totalAttended = 0;
    let totalClasses = 0;
    let subjectsUnder75Count = 0;
    let bestSubject = null;

    subjects.forEach(sub => {
      totalAttended += sub.attended;
      totalClasses += sub.totalClasses;
      if (sub.totalClasses > 0 && sub.percentage < 75) {
        subjectsUnder75Count++;
      }
    });

    const overallAttendance = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

    // Find best performing subject (must have classes conducted)
    const validSubjects = subjects.filter(s => s.totalClasses > 0);
    if (validSubjects.length > 0) {
      bestSubject = validSubjects.reduce((prev, current) => 
        (prev.percentage > current.percentage) ? prev : current
      );
    }

    // 3. Productivity Score Math (adjusted to include Goals completion rate)
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'Completed').length;
    const activeGoals = totalGoals - completedGoals;
    const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    const maxStreak = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;

    let productivityScore = 100;
    const weights = [];
    let totalWeight = 0;

    if (totalTasks > 0) {
      weights.push(taskCompletionRate * 0.6);
      totalWeight += 0.6;
    }
    if (totalGoals > 0) {
      weights.push(goalCompletionRate * 0.4);
      totalWeight += 0.4;
    }

    if (totalWeight > 0) {
      productivityScore = weights.reduce((a, b) => a + b, 0) / totalWeight;
    } else {
      productivityScore = 100;
    }

    // 4. Academic Overview
    const totalSubjects = subjects.length;
    // Get recent attendance logs (subjects sorted by last updated)
    const recentSubjects = [...subjects]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 3);

    // 5. Timetable planner calculations
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = daysOfWeek[now.getDay()];

    const todayClasses = timetable
      .filter(t => t.day === todayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Next class calculation
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}`;

    let nextClass = null;
    if (todayName !== 'Sunday') {
      nextClass = todayClasses.find(c => c.startTime > currentTimeStr);
    }

    // If no next class today, search tomorrow and onwards
    if (!nextClass) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayIdx = dayOrder.indexOf(todayName); // -1 if Sunday
      
      for (let i = 1; i <= 7; i++) {
        const nextDayIdx = (todayIdx === -1 ? 0 + i - 1 : todayIdx + i) % 6;
        const targetDay = dayOrder[nextDayIdx];
        const targetDayClasses = timetable
          .filter(t => t.day === targetDay)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        if (targetDayClasses.length > 0) {
          nextClass = targetDayClasses[0];
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        welcome: {
          name: req.user.name,
          email: req.user.email
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          percentage: Math.round(taskCompletionRate * 10) / 10
        },
        attendance: null,
        academic: {
          totalSubjects,
          recentUpdates: recentSubjects.map(s => ({
            _id: s._id,
            subject: s.subject,
            percentage: s.percentage,
            updatedAt: s.updatedAt
          }))
        },
        planner: {
          todayClasses: todayClasses.map(c => ({
            _id: c._id,
            subject: c.subjectId ? c.subjectId.subject : 'Unknown',
            color: c.subjectId ? c.subjectId.color : '#6366f1',
            startTime: c.startTime,
            endTime: c.endTime,
            room: c.room
          })),
          nextClass: nextClass ? {
            _id: nextClass._id,
            subject: nextClass.subjectId ? nextClass.subjectId.subject : 'Unknown',
            color: nextClass.subjectId ? nextClass.subjectId.color : '#6366f1',
            day: nextClass.day,
            startTime: nextClass.startTime,
            endTime: nextClass.endTime,
            room: nextClass.room
          } : null,
          totalSubjects
        },
        notes: {
          total: totalNotes,
          folderCount: folderCount,
          totalStorageBytes: storageAggregation[0]?.totalSize || 0,
          recent: recentNotes.map(n => ({
            _id: n._id,
            title: n.title,
            subject: n.subject,
            fileType: n.fileType,
            fileUrl: n.fileUrl,
            fileSize: n.fileSize,
            createdAt: n.createdAt
          }))
        },
        goals: {
          total: totalGoals,
          active: activeGoals,
          completed: completedGoals,
          maxStreak
        },
        productivityScore: Math.round(productivityScore),
        upcomingDeadlines: upcomingTasks.map(t => ({
          _id: t._id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate
        }))
      }
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile dashboard summary' });
  }
};

// @desc    Get dashboard analytics charts datasets
// @route   GET /api/dashboard/analytics
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const [tasks, subjects, timetable, notes, goals] = await Promise.all([
      Task.find({ userId }),
      Subject.find({ userId }),
      Timetable.find({ userId }),
      Note.find({ uploadedBy: userId }).populate('groupId'),
      Goal.find({ userId })
    ]);

    // 1. Attendance Chart Data
    const attendanceChartData = subjects.map(s => ({
      name: s.subject,
      attended: s.attended,
      missed: s.totalClasses - s.attended,
      percentage: s.percentage,
    }));

    // 2. Task completion by priority
    const priorityCategories = ['low', 'medium', 'high'];
    const taskPriorityData = priorityCategories.map(priority => {
      const priorityTasks = tasks.filter(t => t.priority === priority);
      const completed = priorityTasks.filter(t => t.completed).length;
      return {
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        completed,
        pending: priorityTasks.length - completed,
        total: priorityTasks.length
      };
    });

    // 3. Task status division
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const taskStatusData = [
      { name: 'Completed', value: completedTasksCount },
      { name: 'Pending', value: tasks.length - completedTasksCount }
    ];

    // 4. Planner analytics
    const dayCounts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
    timetable.forEach(slot => {
      if (dayCounts[slot.day] !== undefined) {
        dayCounts[slot.day]++;
      }
    });

    const classesPerDayData = Object.keys(dayCounts).map(day => ({
      day: day.substring(0, 3), // Mon, Tue, Wed, Thu, Fri, Sat
      count: dayCounts[day]
    }));

    const creditDistributionData = subjects.map(s => ({
      subject: s.subject,
      credits: s.credits || 0,
      color: s.color || '#6366f1'
    }));

    // 5. Notes by subject (grouped by group name or subject string)
    const notesBySubjectCounts = {};
    notes.forEach(n => {
      const folderName = n.groupId ? n.groupId.name : (n.subject || 'General');
      notesBySubjectCounts[folderName] = (notesBySubjectCounts[folderName] || 0) + 1;
    });

    const notesBySubjectData = Object.keys(notesBySubjectCounts).map(subj => ({
      subject: subj,
      count: notesBySubjectCounts[subj]
    }));

    // 6. Goals completion by category
    const categories = ['Study', 'Attendance', 'Assignments', 'Personal Development'];
    const goalsCategoryData = categories.map(cat => {
      const catGoals = goals.filter(g => g.category === cat);
      const completed = catGoals.filter(g => g.status === 'Completed').length;
      return {
        category: cat,
        completed,
        pending: catGoals.length - completed,
        total: catGoals.length
      };
    });

    // 7. Goals status distribution
    const completedGoalsCount = goals.filter(g => g.status === 'Completed').length;
    const goalsStatusData = [
      { name: 'Completed', value: completedGoalsCount },
      { name: 'Pending/In Progress', value: goals.filter(g => g.status !== 'Completed' && g.status !== 'Overdue').length },
      { name: 'Overdue', value: goals.filter(g => g.status === 'Overdue').length }
    ];

    return res.status(200).json({
      success: true,
      analytics: {
        taskPriorityData,
        taskStatusData,
        classesPerDayData,
        creditDistributionData,
        notesBySubjectData,
        goalsCategoryData,
        goalsStatusData,
        totalGoalsCount: goals.length,
        totalNotesCount: notes.length,
        subjectCount: subjects.length
      }
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile dashboard analytics' });
  }
};

module.exports = {
  getDashboardSummary,
  getDashboardAnalytics,
};
