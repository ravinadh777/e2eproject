// services/notification-service/src/routes/health.js
const express = require('express');
const router = express.Router();
const redis = require('../utils/redis');
const client = require('prom-client');
client.collectDefaultMetrics({ prefix: 'notification_service_' });
const metricsRouter = express.Router();
metricsRouter.get('/', async (req, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });

router.get('/', async (req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'healthy', service: 'notification-service', timestamp: new Date().toISOString() });
  } catch (err) { res.status(503).json({ status: 'unhealthy', error: err.message }); }
});
router.get('/live', (req, res) => res.json({ status: 'alive' }));
router.get('/ready', async (req, res) => { try { await redis.ping(); res.json({ status: 'ready' }); } catch { res.status(503).json({ status: 'not ready' }); } });
router.use('/metrics', metricsRouter);
module.exports = router;
