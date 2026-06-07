const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email address',
      ],
    },
    password: {
      type: String,
      required: [
        function () {
          return this.provider === 'local' || !this.provider;
        },
        'Please add a password',
      ],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Prevents password from being returned in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    profileImage: {
      type: String,
      default: '',
    },
    collegeName: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: '',
    },
    yearOfStudy: {
      type: String,
      default: '',
    },
    registerNumber: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
    github: {
      type: String,
      default: '',
    },
    portfolio: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      default: 'local',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password entered by user with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
