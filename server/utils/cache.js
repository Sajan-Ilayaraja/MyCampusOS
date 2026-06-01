// In-memory cache for analytics results (expires after 10 seconds)
const analyticsCache = new Map();
const CACHE_EXPIRATION_MS = 10000; // 10 seconds

const invalidateUserCache = (userId) => {
  if (!userId) return;
  const prefix = `${userId}_`;
  for (const key of analyticsCache.keys()) {
    if (key.startsWith(prefix)) {
      analyticsCache.delete(key);
    }
  }
};

module.exports = {
  analyticsCache,
  CACHE_EXPIRATION_MS,
  invalidateUserCache
};
