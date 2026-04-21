// services/notification-service/src/routes/notify.js
const express = require('express');
const router = express.Router();
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

// Manual trigger endpoint (for testing/admin use)
router.post('/send', async (req, res, next) => {
  try {
    const { to, subject, message } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to and subject required' });
    await emailService.sendGenericNotification(to, subject, message || 'No message provided');
    res.json({ message: 'Notification sent' });
  } catch (err) { next(err); }
});

router.post('/test', async (req, res) => {
  res.json({ message: 'Notification service is working', timestamp: new Date().toISOString() });
});

module.exports = router;
