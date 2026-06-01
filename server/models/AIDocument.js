const mongoose = require('mongoose');

const AIDocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String, // MIME type
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String
  },
  text: {
    type: String,
    default: ''
  },
  generatedSummaries: [{
    summaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AISummary' },
    createdAt: { type: Date, default: Date.now }
  }],
  generatedQuizzes: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIQuiz' },
    createdAt: { type: Date, default: Date.now }
  }],
  generatedFlashcards: [{
    deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIFlashcardDeck' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('AIDocument', AIDocumentSchema);
