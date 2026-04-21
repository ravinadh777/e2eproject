// services/billing-service/src/utils/logger.js
const pino = require('pino');
module.exports = pino({ level: process.env.LOG_LEVEL || 'info', base: { service: 'billing-service' } });

// ────────────────────────────────────────────────────────────────────────────
// services/billing-service/src/utils/redis.js  (save as separate file)
