const express = require('express');
const router = express.Router();
const passport = require('passport');
const { 
  registerUser, 
  loginUser, 
  getMe,
  googleOAuthCallback,
  updateProfile,
  updatePassword,
  deleteAccount,
  getProfileStats,
  uploadProfilePhoto
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Multer setup for profile photo upload
const multer = require('multer');
const path = require('path');
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const photoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    googleOAuthCallback(err, user, req, res);
  })(req, res, next);
});

// Profile Management routes
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.delete('/account', protect, deleteAccount);
router.get('/profile/stats', protect, getProfileStats);
router.post('/profile/photo', protect, uploadPhoto.single('photo'), uploadProfilePhoto);

module.exports = router;
