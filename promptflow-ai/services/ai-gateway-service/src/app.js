// services/ai-gateway-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const logger = require('./utils/logger');
const { sequelize } = require('./models');
const metricsMiddleware = require('./middleware/metrics');

const aiRoutes = require('./routes/ai');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));
app.use(metricsMiddleware);

// Rate limiting per user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
  message: { error: 'Rate limit exceeded. Maximum 30 AI requests per minute.' },
});

app.use('/health', healthRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);

app.use((err, req, res, next) => {
  logger.error({ err });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3003;

async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  logger.info('Database connected');
  app.listen(PORT, '0.0.0.0', () => logger.info(`AI Gateway running on port ${PORT}`));
}

start().catch((err) => { logger.error(err); process.exit(1); });
module.exports = app;
