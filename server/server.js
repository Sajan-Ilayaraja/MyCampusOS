const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const validateEnv = require('./config/envValidation');
validateEnv();

const express = require('express');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
const helmet = require('helmet');
const mongoSanitize = require('./middleware/mongoSanitize');
const compression = require('compression');
const morgan = require('morgan');

const connectDB = require('./config/db');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const noteRoutes = require('./routes/noteRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const groupRoutes = require('./routes/groupRoutes');
const goalRoutes = require('./routes/goalRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');

const cacheInvalidator = require('./middleware/cacheInvalidator');

// Force IPv4 resolution first to avoid Node 17+ IPv6 DNS lookup issues
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('Could not set custom DNS servers:', err.message);
}

const app = express();

// 1. Security Headers & CORS Configuration
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : '';

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://my-campus-os.vercel.app',
  clientUrl
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// 2. Request Logging with Morgan
app.use(morgan((tokens, req, res) => {
  const method = tokens.method(req, res);
  const url = tokens.url(req, res);
  const status = res.statusCode;
  const duration = parseFloat(tokens['response-time'](req, res) || '0');
  
  logger.slowResponse(url, method, duration);
  
  return [
    method,
    url,
    status,
    tokens.res(req, res, 'content-length'), '-',
    duration, 'ms'
  ].join(' ');
}, {
  stream: { write: (message) => logger.info(message.trim(), { category: 'http_request' }) }
}));

// 3. Payload Compression & Body Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. NoSQL Query Injection Defense
app.use(mongoSanitize);

// 5. Global Cache Invalidator
app.use(cacheInvalidator);

// Production Health Check (Item 10)
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Swagger Interactive API Docs Route (Item 10)
const fs = require('fs');
const swaggerPath = path.join(__dirname, 'docs', 'openapi.yaml');
if (fs.existsSync(swaggerPath)) {
  try {
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yamljs');
    const swaggerDocument = YAML.load(swaggerPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (err) {
    logger.warn('Could not mount Swagger docs: openapi.yaml missing or invalid', { error: err.message });
  }
}

// Serve a basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', message: 'MyCampusOS Server is active' });
});

// Serve static files from uploads folder for fallback storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler Middleware (Production Safe)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  logger.error('Unhandled Server Error caught in global middleware:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode
  });

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && !isDev 
      ? 'Internal Server Error. Please contact support or retry later.' 
      : err.message,
    stack: isDev ? err.stack : undefined
  });
});

// Connect to MongoDB database & start server
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server due to database connection error.', { error: error.message });
    process.exit(1);
  }
};

startServer();
