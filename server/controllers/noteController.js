const Note = require('../models/Note');
const NotesGroup = require('../models/NotesGroup');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Upload a new note
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res) => {
  try {
    const { title, groupId, newGroupName, newGroupColor, description } = req.body;

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    let fileUrl = '';
    let publicId = '';
    const fileType = req.file.mimetype;
    const fileSize = req.file.size;

    // Helper cleanup function
    const cleanupLocalFile = () => {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };

    // 1. Resolve Folder/GroupId (support inline creation)
    let targetGroupId = groupId;

    if (!targetGroupId && newGroupName) {
      // Inline group folder creation
      const cleanName = newGroupName.trim();
      let folder = await NotesGroup.findOne({
        userId: req.user._id,
        name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
      });

      if (!folder) {
        folder = await NotesGroup.create({
          name: cleanName,
          color: newGroupColor || '#6366f1',
          userId: req.user._id,
        });
      }
      targetGroupId = folder._id;
    }

    if (!targetGroupId) {
      cleanupLocalFile();
      return res.status(400).json({ success: false, message: 'Please specify a folder/group or create a new one' });
    }

    // Verify folder exists and belongs to the user
    const folder = await NotesGroup.findOne({ _id: targetGroupId, userId: req.user._id });
    if (!folder) {
      cleanupLocalFile();
      return res.status(404).json({ success: false, message: 'Folder not found or unauthorized' });
    }

    // 2. Validate note title input
    const finalTitle = title ? title.trim() : path.basename(req.file.originalname, path.extname(req.file.originalname));

    // Prevent duplicate filenames inside same folder for this user
    const duplicateFile = await Note.findOne({
      groupId: targetGroupId,
      uploadedBy: req.user._id,
      title: { $regex: new RegExp(`^${finalTitle}$`, 'i') },
    });

    if (duplicateFile) {
      cleanupLocalFile();
      return res.status(400).json({ success: false, message: 'A document with this title already exists in the folder' });
    }

    // 3. Upload to Cloudinary if configured
    if (isCloudinaryConfigured) {
      try {
        const uploadOptions = {
          folder: 'mycampusos_notes',
          resource_type: 'auto',
        };

        const result = await cloudinary.uploader.upload(req.file.path, uploadOptions);
        fileUrl = result.secure_url;
        publicId = result.public_id;

        cleanupLocalFile();
      } catch (err) {
        console.error('Cloudinary upload failure:', err);
        // Local fallback
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        publicId = req.file.filename;
      }
    } else {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      publicId = req.file.filename;
    }

    // 4. Create Note document in MongoDB
    const note = await Note.create({
      title: finalTitle,
      groupId: targetGroupId,
      subject: folder.name, // Keep subject text populated for compatibility
      description: description || '',
      fileUrl,
      fileType,
      fileSize,
      publicId,
      uploadedBy: req.user._id,
    });

    const populatedNote = await note.populate('groupId');

    return res.status(201).json({
      success: true,
      note: populatedNote,
    });
  } catch (error) {
    console.error('Create note error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to upload note' });
  }
};

// @desc    Get all notes for the logged-in student
// @route   GET /api/notes
// @access  Private
const getNotes = async (req, res) => {
  try {
    const { groupId, search } = req.query;

    const query = { uploadedBy: req.user._id };

    if (groupId && groupId !== 'all') {
      query.groupId = groupId;
    }

    // Support search inside group by title, description, fileType, or folder subject
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { fileType: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } } // Group name matching
      ];
    }

    const notes = await Note.find(query)
      .populate('groupId')
      .sort({ createdAt: -1 })
      .lean(); // Production Query Optimization

    return res.status(200).json({
      success: true,
      count: notes.length,
      notes,
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to load notes' });
  }
};

// @desc    Get a single note details
// @route   GET /api/notes/:id
// @access  Private
const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('groupId')
      .lean(); // Production Query Optimization

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // User isolation check
    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this note' });
    }

    return res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    console.error('Get note by id error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to load note details' });
  }
};

// @desc    Update note metadata
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = async (req, res) => {
  try {
    const { title, groupId, description } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // User isolation check
    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this note' });
    }

    // 1. Check folder permissions if moving to another folder
    let targetFolder = null;
    if (groupId && groupId !== note.groupId.toString()) {
      targetFolder = await NotesGroup.findOne({ _id: groupId, userId: req.user._id });
      if (!targetFolder) {
        return res.status(404).json({ success: false, message: 'Target folder not found or unauthorized' });
      }
      note.groupId = groupId;
      note.subject = targetFolder.name;
    }

    // 2. Prevent duplicate filenames inside the target folder
    const finalTitle = title !== undefined ? title.trim() : note.title;
    const finalGroupId = groupId || note.groupId;

    if (title !== undefined && finalTitle.toLowerCase() !== note.title.toLowerCase()) {
      const duplicateNote = await Note.findOne({
        _id: { $ne: note._id },
        groupId: finalGroupId,
        uploadedBy: req.user._id,
        title: { $regex: new RegExp(`^${finalTitle}$`, 'i') },
      });

      if (duplicateNote) {
        return res.status(400).json({ success: false, message: 'A document with this title already exists in the folder' });
      }
      note.title = finalTitle;
    }

    if (description !== undefined) note.description = description;

    await note.save();
    const populatedNote = await note.populate('groupId');

    return res.status(200).json({
      success: true,
      note: populatedNote,
    });
  } catch (error) {
    console.error('Update note error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to update note metadata' });
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // User isolation check
    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this note' });
    }

    // Delete file from Cloudinary/Disk storage
    if (isCloudinaryConfigured && note.publicId && !note.fileUrl.includes('localhost') && !note.fileUrl.includes('127.0.0.1')) {
      try {
        const isImage = note.fileType.startsWith('image');
        await cloudinary.uploader.destroy(note.publicId, {
          resource_type: isImage ? 'image' : 'raw',
        });
      } catch (err) {
        console.error('Failed to delete file from Cloudinary:', err.message);
      }
    } else if (note.publicId) {
      const localFilePath = path.join(__dirname, '..', 'uploads', note.publicId);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    }

    // Remove from MongoDB
    await Note.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Delete note error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to delete note' });
  }
};

// @desc    Download note file
// @route   GET /api/notes/download/:id
// @access  Private
const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // User isolation check
    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this note' });
    }

    const isLocal = note.fileUrl.includes('localhost') || note.fileUrl.includes('127.0.0.1');

    if (isLocal) {
      const localFilePath = path.join(__dirname, '..', 'uploads', note.publicId);
      if (fs.existsSync(localFilePath)) {
        return res.download(localFilePath, note.title + path.extname(localFilePath));
      } else {
        return res.status(404).json({ success: false, message: 'Local note file not found on disk' });
      }
    } else {
      return res.redirect(note.fileUrl);
    }
  } catch (error) {
    console.error('Download note error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to download note' });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  downloadNote,
};
