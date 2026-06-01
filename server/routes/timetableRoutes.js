const express = require('express');
const router = express.Router();
const {
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
} = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');

// Mount routes - all routes are protected
router.route('/')
  .get(protect, getTimetable)
  .post(protect, createTimetable);

router.route('/:id')
  .put(protect, updateTimetable)
  .delete(protect, deleteTimetable);

module.exports = router;
