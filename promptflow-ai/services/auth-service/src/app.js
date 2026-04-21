// services/auth-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const metricsMiddleware = require('./middleware/metrics');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ── Metrics ───────────────────────────────────────────────────────────────────
app.use(metricsMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method });
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Database & Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('Database models synchronized');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Auth Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Swagger docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    logger.error('Failed to start auth service:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
