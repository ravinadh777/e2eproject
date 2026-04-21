// services/auth-service/src/middleware/metrics.js
const client = require('prom-client');

// Register default metrics
client.collectDefaultMetrics({ prefix: 'auth_service_' });

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.5, 1],
});

const httpRequestTotal = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const authAttempts = new client.Counter({
  name: 'auth_login_attempts_total',
  help: 'Total login attempts',
  labelNames: ['status'],
});

module.exports = (req, res, next) => {
  if (req.path === '/metrics') return next();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
    httpRequestTotal.inc({ method: req.method, route, status_code: res.statusCode });
    
    if (route.includes('/login')) {
      authAttempts.inc({ status: res.statusCode === 200 ? 'success' : 'failure' });
    }
  });
  
  next();
};

// Expose metrics endpoint
const express = require('express');
const metricsRouter = express.Router();
metricsRouter.get('/', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports.metricsRouter = metricsRouter;
module.exports.authAttempts = authAttempts;
