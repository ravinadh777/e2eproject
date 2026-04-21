// services/ai-gateway-service/src/utils/logger.js
const pino = require('pino');
module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  base: { service: 'ai-gateway-service', environment: process.env.NODE_ENV },
});

// services/ai-gateway-service/src/utils/textUtils.js - separate file below
