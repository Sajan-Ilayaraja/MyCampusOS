const fs = require('fs');
const path = require('path');

// Logger configurations
const env = process.env.NODE_ENV || 'development';
const logDir = path.join(__dirname, '..', 'logs');

// Create logs directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  
  if (env === 'production') {
    // Structural JSON output for cloud log aggregators (Datadog, Loggly, CloudWatch)
    return JSON.stringify({
      timestamp,
      level,
      message,
      environment: env,
      ...meta
    });
  }

  // Colored console log formatting for local development DX
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m'
  };

  const metaStr = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : '';

  if (level === 'info') {
    // If it's a key success message, colorize it green. Otherwise, keep it clean without prefixes.
    const isSuccess = 
      message.includes('verified successfully') ||
      message.includes('configured successfully') ||
      message.includes('Connected') ||
      message.includes('Server running');
    
    if (isSuccess) {
      return `${colors.green}${message}${colors.reset}`;
    }
    return `${message}${metaStr}`;
  }

  if (level === 'warn') {
    return `${colors.yellow}[WARN]: ${message}${metaStr}${colors.reset}`;
  }

  if (level === 'error') {
    return `${colors.red}[ERROR]: ${message}${metaStr}${colors.reset}`;
  }

  if (level === 'debug') {
    return `${colors.magenta}[DEBUG]: ${message}${metaStr}${colors.reset}`;
  }

  return `${message}${metaStr}`;
};

// Write logs to a local file for persistent recording
const writeToFile = (formattedMsg) => {
  try {
    const cleanMsg = formattedMsg.replace(/\x1b\[[0-9;]*m/g, ''); // strip colors
    fs.appendFileSync(path.join(logDir, 'combined.log'), cleanMsg + '\n');
  } catch (err) {
    console.error('Failed to write to combined log file:', err.message);
  }
};

const logger = {
  info: (msg, meta = {}) => {
    const formatted = formatMessage('info', msg, meta);
    console.log(formatted);
    writeToFile(formatted);
  },
  warn: (msg, meta = {}) => {
    const formatted = formatMessage('warn', msg, meta);
    console.warn(formatted);
    writeToFile(formatted);
  },
  error: (msg, meta = {}) => {
    const formatted = formatMessage('error', msg, meta);
    console.error(formatted);
    writeToFile(formatted);
  },
  debug: (msg, meta = {}) => {
    if (env === 'development') {
      const formatted = formatMessage('debug', msg, meta);
      console.log(formatted);
      writeToFile(formatted);
    }
  },
  
  // Custom tracking metrics mapping to future telemetry nodes
  authFailure: (userId, ip, reason) => {
    logger.warn(`Authentication failure for user: ${userId || 'unknown'}`, { ip, reason, category: 'security_auth' });
  },
  aiError: (feature, errorMsg, promptSize) => {
    logger.error(`Gemini AI API failure inside feature: ${feature}`, { error: errorMsg, promptSize, category: 'ai_stability' });
  },
  uploadFailure: (filename, size, mime, reason) => {
    logger.error(`File upload blocked or failed: ${filename}`, { size, mime, reason, category: 'file_io' });
  },
  slowResponse: (url, method, durationMs) => {
    if (durationMs > 1000) {
      logger.warn(`Slow API response detected: ${method} ${url}`, { durationMs, category: 'perf_metric' });
    }
  }
};

module.exports = logger;
