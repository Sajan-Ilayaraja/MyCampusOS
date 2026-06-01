const { invalidateUserCache } = require('../utils/cache');

const cacheInvalidator = (req, res, next) => {
  res.on('finish', () => {
    // Only invalidate cache if request succeeded (200-299) and was a modifying method
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const modifyingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      if (modifyingMethods.includes(req.method) && req.user && req.user._id) {
        invalidateUserCache(req.user._id);
      }
    }
  });
  next();
};

module.exports = cacheInvalidator;
