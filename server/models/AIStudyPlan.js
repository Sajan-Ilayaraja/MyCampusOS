const mongoose = require('mongoose');

const aiStudyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Study Plan',
    },
    subject: {
      type: String,
      required: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    topics: {
      type: [String],
      required: true,
    },
    dailyHours: {
      type: Number,
      required: true,
      default: 2,
    },
    plan: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

aiStudyPlanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AIStudyPlan', aiStudyPlanSchema);
