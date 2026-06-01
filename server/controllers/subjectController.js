const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');

// @desc    Get all subjects for the student
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user._id }).sort({ createdAt: 1 });
    
    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to load subjects' });
  }
};

// @desc    Create a new subject
// @route   POST /api/subjects
// @access  Private
const createSubject = async (req, res) => {
  try {
    const { subject, subjectCode, faculty, credits, semester, color } = req.body;

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Please provide a subject name' });
    }

    const newSubject = await Subject.create({
      subject,
      subjectCode: subjectCode || '',
      faculty: faculty || '',
      credits: credits !== undefined ? Number(credits) : 3,
      semester: semester !== undefined ? Number(semester) : 1,
      color: color || '#6366f1',
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      subject: newSubject,
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to create subject' });
  }
};

// @desc    Update a subject details
// @route   PUT /api/subjects/:id
// @access  Private
const updateSubject = async (req, res) => {
  try {
    const { subject, subjectCode, faculty, credits, semester, color } = req.body;

    const subjectRecord = await Subject.findById(req.params.id);

    if (!subjectRecord) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // User isolation check
    if (subjectRecord.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this subject' });
    }

    if (subject !== undefined) subjectRecord.subject = subject;
    if (subjectCode !== undefined) subjectRecord.subjectCode = subjectCode;
    if (faculty !== undefined) subjectRecord.faculty = faculty;
    if (credits !== undefined) subjectRecord.credits = Number(credits);
    if (semester !== undefined) subjectRecord.semester = Number(semester);
    if (color !== undefined) subjectRecord.color = color;

    await subjectRecord.save();

    return res.status(200).json({
      success: true,
      subject: subjectRecord,
    });
  } catch (error) {
    console.error('Update subject error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to update subject' });
  }
};

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
// @access  Private
const deleteSubject = async (req, res) => {
  try {
    const subjectRecord = await Subject.findById(req.params.id);

    if (!subjectRecord) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // User isolation check
    if (subjectRecord.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this subject' });
    }

    // Enforce database integrity: delete any timetable classes linked to this subject
    await Timetable.deleteMany({ subjectId: req.params.id });

    // Delete subject
    await Subject.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Subject and all its linked timetable classes deleted successfully',
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to delete subject' });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
