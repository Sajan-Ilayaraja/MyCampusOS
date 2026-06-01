const mongoose = require('mongoose');

const attendanceHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true,
  },
});

const subjectSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: [true, 'Please add a subject name'],
      trim: true,
    },
    subjectCode: {
      type: String,
      trim: true,
      default: '',
    },
    faculty: {
      type: String,
      trim: true,
      default: '',
    },
    credits: {
      type: Number,
      default: 3,
      min: [0, 'Credits cannot be negative'],
    },
    semester: {
      type: Number,
      default: 1,
      min: [1, 'Semester must be at least 1'],
    },
    color: {
      type: String,
      default: '#6366f1', // Default Indigo hex
    },
    // Attendance details
    attended: {
      type: Number,
      default: 0,
      min: [0, 'Attended classes cannot be negative'],
    },
    totalClasses: {
      type: Number,
      default: 0,
      min: [0, 'Total classes cannot be negative'],
    },
    percentage: {
      type: Number,
      default: 0,
    },
    history: [attendanceHistorySchema],
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

// Pre-save middleware to calculate the attendance percentage automatically
subjectSchema.pre('save', function () {
  if (this.totalClasses === 0) {
    this.percentage = 0;
  } else {
    if (this.attended > this.totalClasses) {
      this.attended = this.totalClasses;
    }
    this.percentage = Math.round((this.attended / this.totalClasses) * 100 * 100) / 100;
  }
});

// Index to optimize user-level subject fetching
subjectSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
