const mongoose = require('mongoose');

const notesGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a group name'],
      trim: true,
    },
    color: {
      type: String,
      default: '#6366f1', // Default hex color
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

// Enforce unique group name per user
notesGroupSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('NotesGroup', notesGroupSchema);
