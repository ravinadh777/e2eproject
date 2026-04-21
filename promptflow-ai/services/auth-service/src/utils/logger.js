// services/auth-service/src/utils/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' },
  } : undefined,
  base: {
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  },
});

module.exports = logger;
