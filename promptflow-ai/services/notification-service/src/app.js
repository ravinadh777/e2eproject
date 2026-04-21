// services/notification-service/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const redis = require('./utils/redis');
const emailService = require('./utils/emailService');
const healthRoutes = require('./routes/health');
const notifyRoutes = require('./routes/notify');

const app = express();
app.use(helmet()); app.use(cors()); app.use(express.json());
app.use('/health', healthRoutes);
app.use('/api/notify', notifyRoutes);
app.use((err, req, res, next) => { logger.error({ err }); res.status(500).json({ error: err.message }); });

// ── Redis Pub/Sub Event Listeners ─────────────────────────────────────────────
const subscriber = redis.duplicate();

const handleEvent = async (channel, message) => {
  try {
    const event = JSON.parse(message);
    logger.info({ event: 'received', channel, type: event.type });

    switch (event.type) {
      case 'USER_REGISTERED':
        await emailService.sendWelcomeEmail(event.email, event.name);
        break;
      case 'PASSWORD_RESET_REQUESTED':
        await emailService.sendPasswordResetEmail(event.email, event.resetToken);
        break;
      case 'MEMBER_INVITED':
        await emailService.sendWorkspaceInviteEmail(event.email, event.token, event.workspaceId);
        break;
      case 'PLAN_UPGRADED':
        await emailService.sendPlanUpgradeEmail(event.userId, event.newPlan, event.amount);
        break;
      case 'USAGE_WARNING':
        await emailService.sendUsageWarningEmail(event.workspaceId, event.percent);
        break;
      case 'USAGE_EXCEEDED':
        await emailService.sendUsageExceededEmail(event.workspaceId);
        break;
      case 'PIPELINE_FAILED':
        await emailService.sendPipelineFailureEmail(event);
        break;
      default:
        logger.debug({ type: event.type }, 'Unhandled event type');
    }
  } catch (err) {
    logger.error({ err, channel }, 'Event handling failed');
  }
};

subscriber.on('message', handleEvent);
subscriber.subscribe('user-events', 'workspace-events', 'billing-events', 'ai-events', 'system-events', (err, count) => {
  if (err) logger.error({ err }, 'Subscribe failed');
  else logger.info(`Subscribed to ${count} channels`);
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, '0.0.0.0', () => logger.info(`Notification Service on port ${PORT}`));
module.exports = app;
