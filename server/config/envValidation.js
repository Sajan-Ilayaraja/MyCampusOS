const logger = require('../utils/logger');

/**
 * Validates the presence and integrity of environment variables
 */
const validateEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const errors = [];

  // Required production keys
  const requiredKeys = ['MONGO_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];

  requiredKeys.forEach(key => {
    if (!process.env[key] || process.env[key] === `YOUR_${key}_HERE`) {
      errors.push(`Missing or default environment config key: ${key}`);
    }
  });

  // Check connection scheme
  if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb://') && !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
    errors.push('MONGO_URI must be a valid MongoDB connection string (starts with mongodb:// or mongodb+srv://)');
  }

  // Enforce JWT strength in production
  if (env === 'production' && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters long in production environments');
  }

  if (errors.length > 0) {
    logger.error('CRITICAL: Environment variable validation failed. Server boot aborted.', { errors });
    if (env === 'production') {
      process.exit(1); // Abort execution in production to prevent misconfiguration runs
    } else {
      console.warn('\x1b[33m[WARNING]: Env validation errors occurred. App running in DEV mode with mocks:\x1b[0m', errors);
    }
  } else {
    logger.info('Environment configurations verified successfully');
  }
};

module.exports = validateEnv;
