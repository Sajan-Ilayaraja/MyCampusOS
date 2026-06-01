const mongoose = require('mongoose');

const flashcardMasterySchema = new mongoose.Schema(
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
    masteredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCards: {
      type: Number,
      required: true,
      min: 1,
    },
    knownCards: {
      type: [String], // Array of card question hashes or indices marked as known
      default: [],
    },
    studyStreak: {
      type: Number,
      default: 0,
    },
    dailyRevisionGoal: {
      type: Number,
      default: 5, // Default daily goal of reviewing 5 cards
    },
    cardRepetition: {
      type: [
        {
          cardId: { type: String, required: true },
          box: { type: Number, default: 1 }, // Leitner box 1-5
          nextReviewDate: { type: Date, default: Date.now }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true,
  }
);

flashcardMasterySchema.index({ userId: 1, topic: 1, updatedAt: -1 });

module.exports = mongoose.model('FlashcardMastery', flashcardMasterySchema);

