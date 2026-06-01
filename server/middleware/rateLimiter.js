const rateLimitStore = new Map();

const rateLimiter = (limit = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = `${ip}_${req.baseUrl}`;
    const now = Date.now();
    
    let clientData = rateLimitStore.get(key);
    if (!clientData) {
      clientData = {
        resetTime: now + windowMs,
        requests: []
      };
      rateLimitStore.set(key, clientData);
    }
    
    // Clean up expired timestamps
    clientData.requests = clientData.requests.filter(timestamp => timestamp > now - windowMs);
    
    if (clientData.requests.length >= limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.'
      });
    }
    
    clientData.requests.push(now);
    next();
  };
};

module.exports = rateLimiter;
