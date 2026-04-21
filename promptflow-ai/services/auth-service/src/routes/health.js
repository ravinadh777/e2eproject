// services/auth-service/src/routes/health.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const redis = require('../utils/redis');
const { metricsRouter } = require('../middleware/metrics');

router.get('/', async (req, res) => {
  const checks = {};
  
  // DB check
  try {
    await sequelize.authenticate();
    checks.database = { status: 'healthy' };
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err.message };
  }
  
  // Redis check
  try {
    await redis.ping();
    checks.redis = { status: 'healthy' };
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message };
  }

  const isHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

router.get('/live', (req, res) => res.json({ status: 'alive' }));
router.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

router.use('/metrics', metricsRouter);

module.exports = router;
