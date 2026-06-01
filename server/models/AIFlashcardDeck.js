const mongoose = require('mongoose');

const aiFlashcardDeckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Flashcard Deck',
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
    cardCount: {
      type: Number,
      required: true,
      default: 5,
    },
    deck: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    masteryProgress: {
      type: Number,
      default: 0, // mastered count
    },
    knownCards: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

aiFlashcardDeckSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AIFlashcardDeck', aiFlashcardDeckSchema);
