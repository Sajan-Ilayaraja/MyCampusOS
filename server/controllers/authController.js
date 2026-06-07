const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      return res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Server error, registration failed' });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user (must explicitly select password since select: false is set in schema)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error, login failed' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is populated by the protect middleware
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to fetch profile' });
  }
};

const mongoose = require('mongoose');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const googleOAuthCallback = (err, user, req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (err || !user) {
    console.error('OAuth Callback Error:', err);
    return res.redirect(`${clientUrl}/login?error=oauth_failed`);
  }
  const token = generateToken(user._id);
  return res.redirect(`${clientUrl}/oauth-success?token=${token}`);
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      collegeName,
      department,
      yearOfStudy,
      registerNumber,
      phoneNumber,
      linkedin,
      github,
      portfolio,
      bio,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    user.collegeName = collegeName !== undefined ? collegeName : user.collegeName;
    user.department = department !== undefined ? department : user.department;
    user.yearOfStudy = yearOfStudy !== undefined ? yearOfStudy : user.yearOfStudy;
    user.registerNumber = registerNumber !== undefined ? registerNumber : user.registerNumber;
    user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
    user.linkedin = linkedin !== undefined ? linkedin : user.linkedin;
    user.github = github !== undefined ? github : user.github;
    user.portfolio = portfolio !== undefined ? portfolio : user.portfolio;
    user.bio = bio !== undefined ? bio : user.bio;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profileImage: user.profileImage,
        collegeName: user.collegeName,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        registerNumber: user.registerNumber,
        phoneNumber: user.phoneNumber,
        linkedin: user.linkedin,
        github: user.github,
        portfolio: user.portfolio,
        bio: user.bio,
        provider: user.provider,
        joinedAt: user.joinedAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update profile' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.password) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user from User collection
    await User.findByIdAndDelete(userId);

    // Cascading deletes across other collections using dynamic mongoose model lookup
    const cascadeModels = [
      { name: 'Task', field: 'userId' },
      { name: 'Goal', field: 'userId' },
      { name: 'Note', field: 'uploadedBy' },
      { name: 'Timetable', field: 'userId' },
      { name: 'Subject', field: 'userId' },
      { name: 'NotesGroup', field: 'userId' },
      { name: 'QuizAttempt', field: 'userId' },
      { name: 'AIQuiz', field: 'userId' },
      { name: 'AIStudyPlan', field: 'userId' },
      { name: 'AIFlashcardDeck', field: 'userId' },
      { name: 'FlashcardMastery', field: 'userId' },
      { name: 'AIInteraction', field: 'userId' }
    ];

    for (const item of cascadeModels) {
      try {
        const Model = mongoose.model(item.name);
        await Model.deleteMany({ [item.field]: userId });
      } catch (err) {
        console.warn(`Could not cascade delete for model ${item.name}:`, err.message);
      }
    }

    return res.status(200).json({ success: true, message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete account' });
  }
};

const getProfileStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Load models dynamically to avoid potential circular dependency issues
    const Task = mongoose.model('Task');
    const Goal = mongoose.model('Goal');
    const Note = mongoose.model('Note');
    const AIStudyPlan = mongoose.model('AIStudyPlan');
    const QuizAttempt = mongoose.model('QuizAttempt');
    const AIFlashcardDeck = mongoose.model('AIFlashcardDeck');
    const AIInteraction = mongoose.model('AIInteraction');
    const FlashcardMastery = mongoose.model('FlashcardMastery');

    const [
      tasksCompleted,
      goalsAchieved,
      notesUploaded,
      studyPlansCreated,
      quizzesTaken,
      flashcardsCreated,
      aiRequestsUsed,
      tasksCount,
      completedTasksCount,
      goalsCount,
      completedGoalsCount,
      goalsList,
      flashcardMasteries,
      interactions,
      notesList
    ] = await Promise.all([
      Task.countDocuments({ userId, completed: true }),
      Goal.countDocuments({ userId, status: 'Completed' }),
      Note.countDocuments({ uploadedBy: userId }),
      AIStudyPlan.countDocuments({ userId }),
      QuizAttempt.countDocuments({ userId }),
      AIFlashcardDeck.countDocuments({ userId }),
      AIInteraction.countDocuments({ userId }),
      
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, completed: true }),
      Goal.countDocuments({ userId }),
      Goal.countDocuments({ userId, status: 'Completed' }),
      Goal.find({ userId }),
      FlashcardMastery.find({ userId }),
      AIInteraction.aggregate([
        { $match: { userId } },
        { $group: { _id: '$feature', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      Note.find({ uploadedBy: userId })
    ]);

    // Calculate Productivity Score
    const taskCompletionRate = tasksCount > 0 ? (completedTasksCount / tasksCount) * 100 : 0;
    const goalCompletionRate = goalsCount > 0 ? (completedGoalsCount / goalsCount) * 100 : 0;
    let productivityScore = 100;
    let totalWeight = 0;
    let weights = [];
    if (tasksCount > 0) {
      weights.push(taskCompletionRate * 0.6);
      totalWeight += 0.6;
    }
    if (goalsCount > 0) {
      weights.push(goalCompletionRate * 0.4);
      totalWeight += 0.4;
    }
    if (totalWeight > 0) {
      productivityScore = weights.reduce((a, b) => a + b, 0) / totalWeight;
    }

    // Streaks
    const maxGoalStreak = goalsList.length > 0 ? Math.max(...goalsList.map(g => g.streak || 0)) : 0;
    const maxFcStreak = flashcardMasteries.length > 0 ? Math.max(...flashcardMasteries.map(f => f.studyStreak || 0)) : 0;
    const currentStreak = Math.max(maxGoalStreak, maxFcStreak);

    // Most used feature mapping
    const featureLabels = {
      'study-plan': 'Study Planner',
      'notes-summary': 'Notes Summarizer',
      'quiz-generator': 'Quiz Generator',
      'flashcards': 'Flashcards Creator',
      'career-advisor': 'AI Career Advisor',
      'productivity-insights': 'Productivity Insights',
      'interview-prep': 'Interview Prep',
      'chat': 'CampusBuddy Chat'
    };
    const mostUsedFeature = interactions.length > 0 ? (featureLabels[interactions[0]._id] || interactions[0]._id) : 'None yet';

    // Learning focus subject
    const subjectsFromNotes = notesList.map(n => n.subject).filter(Boolean);
    const subjectsCount = {};
    subjectsFromNotes.forEach(s => {
      subjectsCount[s] = (subjectsCount[s] || 0) + 1;
    });
    let learningFocusArea = 'General';
    let maxCount = 0;
    for (const s in subjectsCount) {
      if (subjectsCount[s] > maxCount) {
        maxCount = subjectsCount[s];
        learningFocusArea = s;
      }
    }

    // Recommended Action
    const pendingHighPriority = await Task.findOne({ userId, completed: false, priority: 'high' });
    let recommendedAction = 'Set up a daily study goal to build streaks!';
    if (pendingHighPriority) {
      recommendedAction = `Complete high-priority task: "${pendingHighPriority.title}"`;
    } else {
      const activeGoalsCount = goalsList.filter(g => g.status !== 'Completed').length;
      if (activeGoalsCount === 0) {
        recommendedAction = 'Create a new learning goal in Goal Tracker';
      } else if (studyPlansCreated === 0) {
        recommendedAction = 'Generate a personalized AI Study Plan';
      } else {
        recommendedAction = 'Test your recall with a quiz in CampusBuddy';
      }
    }

    return res.status(200).json({
      success: true,
      stats: {
        academicOverview: {
          tasksCompleted,
          goalsAchieved,
          notesUploaded,
          studyPlansCreated,
          quizzesTaken,
          flashcardsCreated,
          aiRequestsUsed
        },
        insights: {
          mostUsedFeature,
          productivityScore: Math.round(productivityScore),
          currentStreak,
          learningFocusArea,
          recommendedAction
        }
      }
    });
  } catch (error) {
    console.error('Get profile stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile stats' });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    let profileImageUrl = '';
    
    if (isCloudinaryConfigured) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'mycampusos/avatars',
        transformation: [{ width: 300, height: 300, crop: 'limit' }]
      });
      profileImageUrl = result.secure_url;
      const fs = require('fs');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } else {
      profileImageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const user = await User.findById(req.user._id);
    user.profileImage = profileImageUrl;
    user.avatar = profileImageUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      profileImage: profileImageUrl,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        profileImage: user.profileImage,
        collegeName: user.collegeName,
        department: user.department,
        yearOfStudy: user.yearOfStudy,
        registerNumber: user.registerNumber,
        phoneNumber: user.phoneNumber,
        linkedin: user.linkedin,
        github: user.github,
        portfolio: user.portfolio,
        bio: user.bio,
        provider: user.provider,
        joinedAt: user.joinedAt,
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({ success: false, message: 'Server error, photo upload failed' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  googleOAuthCallback,
  updateProfile,
  updatePassword,
  deleteAccount,
  getProfileStats,
  uploadProfilePhoto,
};
