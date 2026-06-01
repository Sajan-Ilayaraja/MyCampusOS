const mongoose = require('mongoose');

const aiInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feature: {
      type: String,
      required: true,
      enum: ['study-plan', 'notes-summary', 'quiz-generator', 'flashcards', 'career-advisor', 'productivity-insights', 'interview-prep', 'chat'],
    },
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Optimize database queries for usage dashboard analytics
aiInteractionSchema.index({ userId: 1, feature: 1, createdAt: -1 });

module.exports = mongoose.model('AIInteraction', aiInteractionSchema);
