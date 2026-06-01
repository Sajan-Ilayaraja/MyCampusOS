const logger = require('./utils/logger');
const validateEnv = require('./config/envValidation');
const bcrypt = require('bcryptjs');

console.log('--- MYCAMPUSOS PRODUCTION SMOKE TESTS ---');

// 1. Validate Env configs
try {
  console.log('\nRunning Env Configuration checks...');
  process.env.MONGO_URI = 'mongodb://localhost:27017/test_mycampusos';
  process.env.JWT_SECRET = 'SuperSecretKeyForTestingSmoke123';
  process.env.GEMINI_API_KEY = 'MOCK_KEY_HERE';
  validateEnv();
  console.log('SUCCESS: Environment configuration validated.');
} catch (err) {
  console.error('FAIL: Env config checks failed:', err.message);
}

// 2. Validate Password Hashing logic
try {
  console.log('\nRunning Cryptographic Password Hash checks...');
  const pass = 'password123';
  const hashed = bcrypt.hashSync(pass, 10);
  const isMatch = bcrypt.compareSync(pass, hashed);
  if (isMatch) {
    console.log('SUCCESS: bcrypt cryptographic integrity confirmed.');
  } else {
    console.error('FAIL: Hash matching failed.');
  }
} catch (err) {
  console.error('FAIL: Password hashing test failed:', err.message);
}

// 3. Logger levels check
try {
  console.log('\nRunning Logger category tests...');
  logger.info('Logger verification message (INFO)');
  logger.authFailure('user_123', '127.0.0.1', 'Invalid credential tokens');
  logger.slowResponse('/api/analytics/overview', 'GET', 1200);
  console.log('SUCCESS: Logging formatters active.');
} catch (err) {
  console.error('FAIL: Logger validation failed:', err.message);
}

console.log('\n--- ALL SMOKE TESTS COMPLETED ---');
