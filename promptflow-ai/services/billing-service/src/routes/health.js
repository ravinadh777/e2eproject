// services/billing-service/src/routes/health.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const client = require('prom-client');
client.collectDefaultMetrics({ prefix: 'billing_service_' });
const metricsRouter = express.Router();
metricsRouter.get('/', async (req, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });
router.get('/', async (req, res) => {
  try { await sequelize.authenticate(); res.json({ status: 'healthy', service: 'billing-service', timestamp: new Date().toISOString() }); }
  catch (err) { res.status(503).json({ status: 'unhealthy', error: err.message }); }
});
router.get('/live', (req, res) => res.json({ status: 'alive' }));
router.get('/ready', async (req, res) => { try { await sequelize.authenticate(); res.json({ status: 'ready' }); } catch { res.status(503).json({ status: 'not ready' }); } });
router.use('/metrics', metricsRouter);
module.exports = router;
