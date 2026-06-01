const NotesGroup = require('../models/NotesGroup');
const Note = require('../models/Note');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Get all note groups/folders for the student
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res) => {
  try {
    const groups = await NotesGroup.find({ userId: req.user._id }).sort({ name: 1 });

    // Return groups with their file counts
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const fileCount = await Note.countDocuments({ groupId: group._id });
        return {
          ...group.toObject(),
          fileCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: groupsWithCounts.length,
      groups: groupsWithCounts,
    });
  } catch (error) {
    console.error('Get groups error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to load folders' });
  }
};

// @desc    Create a new note group/folder
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a folder name' });
    }

    // Prevent duplicate folder names per user (case-insensitive check)
    const existingGroup = await NotesGroup.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });

    if (existingGroup) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists' });
    }

    const group = await NotesGroup.create({
      name: name.trim(),
      color: color || '#6366f1',
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      group: {
        ...group.toObject(),
        fileCount: 0
      },
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to create folder' });
  }
};

// @desc    Update/Rename a group/folder
// @route   PUT /api/groups/:id
// @access  Private
const updateGroup = async (req, res) => {
  try {
    const { name, color } = req.body;

    const group = await NotesGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // User isolation check
    if (group.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this folder' });
    }

    if (name) {
      // Check for duplicate name if renaming (case-insensitive check)
      const normalizedNewName = name.trim();
      if (normalizedNewName.toLowerCase() !== group.name.toLowerCase()) {
        const existingDuplicate = await NotesGroup.findOne({
          userId: req.user._id,
          name: { $regex: new RegExp(`^${normalizedNewName}$`, 'i') },
        });

        if (existingDuplicate) {
          return res.status(400).json({ success: false, message: 'A folder with this name already exists' });
        }
      }
      group.name = normalizedNewName;

      // Automatically sync subject string in associated notes for backwards compatibility
      await Note.updateMany({ groupId: group._id }, { subject: normalizedNewName });
    }

    if (color) {
      group.color = color;
    }

    await group.save();

    const fileCount = await Note.countDocuments({ groupId: group._id });

    return res.status(200).json({
      success: true,
      group: {
        ...group.toObject(),
        fileCount
      },
    });
  } catch (error) {
    console.error('Update group error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to update folder details' });
  }
};

// @desc    Safe Delete folder/group (option to delete all files or move files to another folder)
// @route   DELETE /api/groups/:id
// @access  Private
const deleteGroup = async (req, res) => {
  try {
    const group = await NotesGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // User isolation check
    if (group.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this folder' });
    }

    const { action, targetGroupId } = req.body;
    const notesInGroup = await Note.find({ groupId: group._id });

    if (action === 'move_files') {
      if (!targetGroupId) {
        return res.status(400).json({ success: false, message: 'Destination folder ID must be provided' });
      }

      // Verify destination folder exists and belongs to the user
      const targetGroup = await NotesGroup.findOne({ _id: targetGroupId, userId: req.user._id });
      if (!targetGroup) {
        return res.status(404).json({ success: false, message: 'Destination folder not found or unauthorized' });
      }

      if (targetGroupId === group._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot move files to the same folder being deleted' });
      }

      // Move notes to destination folder (preserves files on disk/Cloudinary)
      await Note.updateMany(
        { groupId: group._id },
        { groupId: targetGroupId, subject: targetGroup.name }
      );

      // Delete folder itself
      await NotesGroup.deleteOne({ _id: group._id });

      return res.status(200).json({
        success: true,
        message: `Folder deleted successfully. ${notesInGroup.length} files moved to folder "${targetGroup.name}".`,
      });
    } else {
      // Default: delete_all
      // Delete notes from storage
      for (const note of notesInGroup) {
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
      }

      // Remove notes from DB
      await Note.deleteMany({ groupId: group._id });

      // Delete folder
      await NotesGroup.deleteOne({ _id: group._id });

      return res.status(200).json({
        success: true,
        message: `Folder deleted successfully. Deleted folder and all its ${notesInGroup.length} files.`,
      });
    }
  } catch (error) {
    console.error('Delete group error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to delete folder' });
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
