// services/workspace-service/src/utils/redis.js
const Redis = require('ioredis');
const logger = require('./logger');
const client = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379, password: process.env.REDIS_PASSWORD || undefined, retryStrategy: (t) => Math.min(t * 50, 2000) });
client.on('connect', () => logger.info('Redis connected'));
client.on('error', (err) => logger.error({ err }, 'Redis error'));
module.exports = client;
