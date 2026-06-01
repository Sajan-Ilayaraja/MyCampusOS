const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

let isCloudinaryConfigured = false;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Helper to determine if a credential is a default placeholder or empty/missing
const isPlaceholderOrEmpty = (val) => {
  if (!val) return true;
  const cleanVal = val.toString().trim().toLowerCase();
  return (
    cleanVal === '' ||
    cleanVal.includes('your_cloudinary_') ||
    cleanVal.includes('your_api_') ||
    cleanVal.includes('placeholder') ||
    cleanVal === 'default'
  );
};

const hasCloudinaryCredentials = 
  !isPlaceholderOrEmpty(cloudName) &&
  !isPlaceholderOrEmpty(apiKey) &&
  !isPlaceholderOrEmpty(apiSecret);

if (hasCloudinaryCredentials) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    isCloudinaryConfigured = true;
    logger.info('Cloudinary configured successfully');
  } catch (err) {
    logger.error(`Failed to configure Cloudinary: ${err.message}`);
  }
} else {
  logger.warn('Cloudinary credentials not set or left as default. Backend will fall back to local disk uploads.');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
