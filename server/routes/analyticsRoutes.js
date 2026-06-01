const express = require('express');
const router = express.Router();
const {
  getOverviewAnalytics,
  getTasksAnalytics,
  getGoalsAnalytics,
  getProductivityAnalytics
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Mount routes with protect and rateLimiter middleware to isolate by user session and prevent abuse
router.use(protect);
router.use(rateLimiter(60, 15 * 60 * 1000)); // Limit to 60 requests per 15 minutes

router.get('/overview', getOverviewAnalytics);
router.get('/tasks', getTasksAnalytics);
router.get('/goals', getGoalsAnalytics);
router.get('/productivity', getProductivityAnalytics);

module.exports = router;

