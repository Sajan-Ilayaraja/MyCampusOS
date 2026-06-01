const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a note title'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Please specify the subject'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is missing'],
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true, // Size in bytes
    },
    publicId: {
      type: String, // Tracks Cloudinary public_id or local filename for deletions
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotesGroup',
      required: [true, 'Note must belong to a folder'],
    },
  },
  {
    timestamps: true,
  }
);

// Optimize queries by user, group and date
noteSchema.index({ uploadedBy: 1, groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
