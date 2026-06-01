/**
 * Safe Custom NoSQL Query Injection Defense Middleware
 * 
 * Sanitizes req.body, req.query, and req.params in place to prevent 
 * MongoDB operator injection attacks (e.g., using '$gt' or nested keys with '.').
 * 
 * This avoids replacing req.query, req.body, or req.params references directly,
 * preventing compatibility issues like "Cannot set property query of #<IncomingMessage>".
 */

const sanitize = (val) => {
  if (val === null || val === undefined) return val;

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      val[i] = sanitize(val[i]);
    }
    return val;
  }

  if (typeof val === 'object') {
    const keys = Object.keys(val);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key.startsWith('$') || key.includes('.')) {
        delete val[key];
      } else {
        val[key] = sanitize(val[key]);
      }
    }
    return val;
  }

  return val;
};

const mongoSanitize = (req, res, next) => {
  if (req.body) {
    sanitize(req.body);
  }
  if (req.query) {
    sanitize(req.query);
  }
  if (req.params) {
    sanitize(req.params);
  }
  next();
};

module.exports = mongoSanitize;
