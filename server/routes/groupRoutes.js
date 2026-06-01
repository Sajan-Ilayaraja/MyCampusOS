const express = require('express');
const router = express.Router();
const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

// Mount routes - all routes require JWT protection
router.route('/')
  .get(protect, getGroups)
  .post(protect, createGroup);

router.route('/:id')
  .put(protect, updateGroup)
  .delete(protect, deleteGroup);

module.exports = router;
