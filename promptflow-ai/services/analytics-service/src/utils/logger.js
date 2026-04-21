// services/analytics-service/src/utils/logger.js
const pino = require('pino');
module.exports = pino({ level: process.env.LOG_LEVEL || 'info', base: { service: 'analytics-service' } });
