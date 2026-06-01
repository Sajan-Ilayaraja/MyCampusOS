const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');

// @desc    Get all timetable slots for the student
// @route   GET /api/timetable
// @access  Private
const getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.find({ userId: req.user._id })
      .populate('subjectId')
      .sort({ day: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: timetable.length,
      timetable,
    });
  } catch (error) {
    console.error('Get timetable error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to load timetable' });
  }
};

// @desc    Create a new timetable slot
// @route   POST /api/timetable
// @access  Private
const createTimetable = async (req, res) => {
  try {
    const { subjectId, day, startTime, endTime, room } = req.body;

    if (!subjectId || !day || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Verify subject exists and belongs to this user
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found or unauthorized' });
    }

    // Ensure day is valid
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({ success: false, message: 'Day must be Monday through Saturday' });
    }

    // Basic time format check (HH:MM 24h)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ success: false, message: 'Time must be in HH:MM (24-hour) format' });
    }

    // Ensure start time is before end time
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    const slot = await Timetable.create({
      subjectId,
      day,
      startTime,
      endTime,
      room: room || '',
      userId: req.user._id,
    });

    const populatedSlot = await slot.populate('subjectId');

    return res.status(201).json({
      success: true,
      timetable: populatedSlot,
    });
  } catch (error) {
    console.error('Create timetable error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to create timetable slot' });
  }
};

// @desc    Update a timetable slot
// @route   PUT /api/timetable/:id
// @access  Private
const updateTimetable = async (req, res) => {
  try {
    const { subjectId, day, startTime, endTime, room } = req.body;

    const slot = await Timetable.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }

    // User isolation check
    if (slot.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this slot' });
    }

    // If changing subject, verify the new subject exists and belongs to the user
    if (subjectId && subjectId !== slot.subjectId.toString()) {
      const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found or unauthorized' });
      }
      slot.subjectId = subjectId;
    }

    if (day) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (!validDays.includes(day)) {
        return res.status(400).json({ success: false, message: 'Day must be Monday through Saturday' });
      }
      slot.day = day;
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const newStartTime = startTime || slot.startTime;
    const newEndTime = endTime || slot.endTime;

    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({ success: false, message: 'Start time must be in HH:MM format' });
    }
    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({ success: false, message: 'End time must be in HH:MM format' });
    }

    if (newStartTime >= newEndTime) {
      return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    slot.startTime = newStartTime;
    slot.endTime = newEndTime;
    if (room !== undefined) slot.room = room;

    await slot.save();

    const populatedSlot = await slot.populate('subjectId');

    return res.status(200).json({
      success: true,
      timetable: populatedSlot,
    });
  } catch (error) {
    console.error('Update timetable error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to update timetable slot' });
  }
};

// @desc    Delete a timetable slot
// @route   DELETE /api/timetable/:id
// @access  Private
const deleteTimetable = async (req, res) => {
  try {
    const slot = await Timetable.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }

    // User isolation check
    if (slot.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this slot' });
    }

    await Timetable.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Timetable slot deleted successfully',
    });
  } catch (error) {
    console.error('Delete timetable error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Timetable slot not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to delete timetable slot' });
  }
};

module.exports = {
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
};
