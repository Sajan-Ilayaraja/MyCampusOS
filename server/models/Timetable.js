const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Please select a subject'],
    },
    day: {
      type: String,
      required: [true, 'Please specify a day of the week'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    startTime: {
      type: String,
      required: [true, 'Please specify a class start time'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please enter start time in HH:MM (24-hour) format'],
    },
    endTime: {
      type: String,
      required: [true, 'Please specify a class end time'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please enter end time in HH:MM (24-hour) format'],
    },
    room: {
      type: String,
      trim: true,
      default: '',
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

// Compound index to quickly load a student's weekly timetable sorted by class starting hours
timetableSchema.index({ userId: 1, day: 1, startTime: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
