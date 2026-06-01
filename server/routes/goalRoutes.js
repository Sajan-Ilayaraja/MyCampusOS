const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  getGoalById,
  updateGoal,
  deleteGoal,
  updateProgress,
  updateStatus
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

// Base routes protected by JWT middleware
router.route('/')
  .get(protect, getGoals)
  .post(protect, createGoal);

router.route('/:id')
  .get(protect, getGoalById)
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

// Patch endpoints for updating tracking state
router.patch('/:id/progress', protect, updateProgress);
router.patch('/:id/status', protect, updateStatus);

module.exports = router;
