const express = require('express');
const router = express.Router();
const { getDashboardSummary, getDashboardAnalytics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/summary', protect, getDashboardSummary);
router.get('/analytics', protect, getDashboardAnalytics);

module.exports = router;
