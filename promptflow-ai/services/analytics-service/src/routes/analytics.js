// services/analytics-service/src/routes/analytics.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
router.get('/dashboard', ctrl.getPlatformDashboard);
router.get('/workspace/:workspaceId', ctrl.getWorkspaceDashboard);
router.get('/api-stats', ctrl.getApiStats);
module.exports = router;
