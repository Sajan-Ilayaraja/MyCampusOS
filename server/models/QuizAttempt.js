const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard'],
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({ userId: 1, topic: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
