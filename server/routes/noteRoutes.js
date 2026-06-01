const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  downloadNote,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Mount routes
router.route('/')
  .get(protect, getNotes)
  .post(protect, upload.single('file'), createNote);

router.route('/:id')
  .get(protect, getNoteById)
  .put(protect, updateNote)
  .delete(protect, deleteNote);

router.get('/download/:id', protect, downloadNote);

module.exports = router;
