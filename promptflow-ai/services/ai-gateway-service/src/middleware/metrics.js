// services/ai-gateway-service/src/middleware/metrics.js
const client = require('prom-client');
client.collectDefaultMetrics({ prefix: 'ai_gateway_' });

const aiRequestDuration = new client.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI request duration in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

const aiTokensUsed = new client.Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens used',
  labelNames: ['model'],
});

const httpDuration = new client.Histogram({
  name: 'ai_gateway_http_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

module.exports = (req, res, next) => {
  if (req.path === '/metrics') return next();
  const start = Date.now();
  res.on('finish', () => {
    const d = (Date.now() - start) / 1000;
    httpDuration.observe({ method: req.method, route: req.route?.path || req.path, status: res.statusCode }, d);
  });
  next();
};

module.exports.aiRequestDuration = aiRequestDuration;
module.exports.aiTokensUsed = aiTokensUsed;

const express = require('express');
const metricsRouter = express.Router();
metricsRouter.get('/', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
module.exports.metricsRouter = metricsRouter;
