// services/ai-gateway-service/src/routes/health.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const redis = require('../utils/redis');
const { metricsRouter } = require('../middleware/metrics');

router.get('/', async (req, res) => {
  const checks = {};
  try { await sequelize.authenticate(); checks.database = { status: 'healthy' }; } 
  catch (err) { checks.database = { status: 'unhealthy', error: err.message }; }
  try { await redis.ping(); checks.redis = { status: 'healthy' }; }
  catch (err) { checks.redis = { status: 'unhealthy', error: err.message }; }
  
  const openaiKeySet = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-demo-key-replace-me');
  checks.openai = { status: openaiKeySet ? 'configured' : 'mock-mode' };

  const healthy = checks.database.status === 'healthy' && checks.redis.status === 'healthy';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    service: 'ai-gateway-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

router.get('/live', (req, res) => res.json({ status: 'alive' }));
router.get('/ready', async (req, res) => {
  try { await sequelize.authenticate(); res.json({ status: 'ready' }); }
  catch { res.status(503).json({ status: 'not ready' }); }
});
router.use('/metrics', metricsRouter);

module.exports = router;
