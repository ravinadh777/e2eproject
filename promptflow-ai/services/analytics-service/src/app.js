// services/analytics-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const redis = require('./utils/redis');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json());
app.use(morgan('combined', { stream: { write: (m) => logger.info(m.trim()) } }));
app.use('/health', healthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use((err, req, res, next) => { logger.error({ err }); res.status(500).json({ error: err.message }); });

// Subscribe to events for real-time aggregation
const subscriber = redis.duplicate();
subscriber.subscribe('ai-events', 'user-events', 'workspace-events', 'billing-events');
subscriber.on('message', async (channel, message) => {
  try {
    const event = JSON.parse(message);
    const { AnalyticsEvent } = require('./models');
    await AnalyticsEvent.create({ channel, type: event.type, payload: event, occurredAt: new Date() });
  } catch (err) { logger.error({ err }, 'Analytics event recording failed'); }
});

const PORT = process.env.PORT || 3006;
async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
  logger.info('Database connected');
  app.listen(PORT, '0.0.0.0', () => logger.info(`Analytics Service on port ${PORT}`));
}
start().catch((err) => { logger.error(err); process.exit(1); });
module.exports = app;
