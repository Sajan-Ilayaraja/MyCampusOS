const mongoose = require('mongoose');

const aiSummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Summary',
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
    content: {
      type: String,
      required: false,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

aiSummarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AISummary', aiSummarySchema);
