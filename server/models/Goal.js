const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a goal title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Please specify the category'],
      enum: ['Study', 'Attendance', 'Assignments', 'Personal Development'],
    },
    progressType: {
      type: String,
      required: true,
      enum: ['numeric', 'milestones', 'percentage'],
      default: 'numeric',
    },
    targetValue: {
      type: Number,
      required: [true, 'Please specify the target value'],
      min: [1, 'Target value must be at least 1'],
    },
    currentProgress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Please specify the progress unit'],
      trim: true,
      default: 'tasks',
    },
    deadline: {
      type: Date,
      required: [true, 'Please specify the deadline'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
      default: 'Pending',
    },
    recurrence: {
      type: String,
      enum: ['One-time', 'Daily', 'Weekly', 'Monthly'],
      default: 'One-time',
    },
    streak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    missedDays: {
      type: Number,
      default: 0,
    },
    streakRecoveryRemaining: {
      type: Number,
      default: 1, // Every goal gets 1 streak recovery save token by default
    },
    milestones: [
      {
        title: { type: String, required: true, trim: true },
        completed: { type: Boolean, default: false },
      }
    ],
    lastProgressUpdateAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for optimizing sorting and isolation queries
goalSchema.index({ userId: 1, status: 1, deadline: 1 });

module.exports = mongoose.model('Goal', goalSchema);
