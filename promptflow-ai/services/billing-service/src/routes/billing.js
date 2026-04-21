// services/billing-service/src/routes/billing.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/billingController');
router.get('/plans', ctrl.getPlans);
router.get('/:workspaceId', ctrl.getSubscription);
router.post('/:workspaceId/change-plan', ctrl.changePlan);
router.post('/:workspaceId/cancel', ctrl.cancelSubscription);
router.get('/:workspaceId/invoices', ctrl.listInvoices);
router.post('/usage', ctrl.recordUsage); // Internal
module.exports = router;
