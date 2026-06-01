const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect } = require('../middleware/authMiddleware');

// Mount routes - all routes are protected
router.route('/')
  .get(protect, getSubjects)
  .post(protect, createSubject);

router.route('/:id')
  .put(protect, updateSubject)
  .delete(protect, deleteSubject);

module.exports = router;
