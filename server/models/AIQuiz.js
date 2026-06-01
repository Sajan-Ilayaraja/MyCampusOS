const mongoose = require('mongoose');

const aiQuizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Quiz',
    },
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: false,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AIDocument',
      required: false,
    },
    topic: {
      type: String,
      required: false,
    },
    difficulty: {
      type: String,
      required: true,
      default: 'medium',
    },
    questionCount: {
      type: Number,
      required: true,
      default: 5,
    },
    quiz: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    score: {
      type: Number,
      required: false,
    },
    totalQuestions: {
      type: Number,
      required: false,
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    submitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

aiQuizSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AIQuiz', aiQuizSchema);
