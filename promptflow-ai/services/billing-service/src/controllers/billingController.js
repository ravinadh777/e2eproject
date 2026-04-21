// services/billing-service/src/controllers/billingController.js
const { Subscription, Invoice, UsageMeter, PLANS } = require('../models');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper: generate invoice number
const generateInvoiceNumber = () => `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ── Get current plan info ─────────────────────────────────────────────────────
exports.getPlans = async (req, res) => {
  const plans = Object.entries(PLANS).map(([key, val]) => ({
    id: key, ...val,
    priceDisplay: val.price === 0 ? 'Free' : `$${(val.price / 100).toFixed(2)}/mo`,
    features: {
      free:  ['100 AI requests/mo', '100MB storage', '1 workspace member', 'Community support'],
      pro:   ['1,000 AI requests/mo', '5GB storage', '5 workspace members', 'Priority support', 'Analytics dashboard'],
      team:  ['10,000 AI requests/mo', '50GB storage', '25 workspace members', '24/7 support', 'Advanced analytics', 'Custom integrations'],
    }[key] || [],
  }));
  res.json({ plans });
};

// ── Get subscription ──────────────────────────────────────────────────────────
exports.getSubscription = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.headers['x-user-id'];

    let sub = await Subscription.findOne({ where: { workspaceId } });
    if (!sub) {
      // Auto-create free plan
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      sub = await Subscription.create({
        workspaceId, userId, plan: 'free', status: 'active',
        currentPeriodStart: new Date(), currentPeriodEnd: periodEnd,
      });
    }

    // Get current usage
    const period = new Date().toISOString().slice(0, 7);
    const usage = await UsageMeter.findOne({ where: { workspaceId, period } }) ||
      { aiRequests: 0, storageBytes: 0, membersCount: 1 };

    const planLimits = PLANS[sub.plan];
    res.json({
      subscription: sub,
      usage: {
        aiRequests: { used: usage.aiRequests, limit: planLimits.requests, percent: Math.round((usage.aiRequests / planLimits.requests) * 100) },
        storage: { usedBytes: usage.storageBytes, limitBytes: planLimits.storage * 1024 * 1024, percent: Math.round((usage.storageBytes / (planLimits.storage * 1024 * 1024)) * 100) },
        members: { used: usage.membersCount, limit: planLimits.members },
      },
      planDetails: planLimits,
    });
  } catch (err) { next(err); }
};

// ── Upgrade/Change plan (mock payment) ───────────────────────────────────────
exports.changePlan = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { plan, paymentMethodId } = req.body;
    const userId = req.headers['x-user-id'];

    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    let sub = await Subscription.findOne({ where: { workspaceId } });
    const oldPlan = sub?.plan || 'free';

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (sub) {
      await sub.update({ plan, status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false });
    } else {
      sub = await Subscription.create({
        workspaceId, userId, plan, status: 'active',
        currentPeriodStart: new Date(), currentPeriodEnd: periodEnd,
      });
    }

    // Generate invoice for paid plans
    if (PLANS[plan].price > 0) {
      const invoice = await Invoice.create({
        subscriptionId: sub.id, workspaceId,
        amount: PLANS[plan].price, currency: 'usd', status: 'paid',
        period: new Date().toISOString().slice(0, 7),
        paidAt: new Date(),
        invoiceNumber: generateInvoiceNumber(),
        lineItems: [{
          description: `${PLANS[plan].name} Plan - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          amount: PLANS[plan].price,
          quantity: 1,
        }],
      });

      await redis.publish('billing-events', JSON.stringify({
        type: 'PLAN_UPGRADED', workspaceId, userId, oldPlan, newPlan: plan,
        invoiceId: invoice.id, amount: PLANS[plan].price,
      }));
    }

    logger.info({ event: 'plan_changed', workspaceId, oldPlan, newPlan: plan, userId });
    res.json({ subscription: sub, message: `Successfully upgraded to ${PLANS[plan].name} plan` });
  } catch (err) { next(err); }
};

// ── Cancel subscription ───────────────────────────────────────────────────────
exports.cancelSubscription = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const sub = await Subscription.findOne({ where: { workspaceId } });
    if (!sub) return res.status(404).json({ error: 'No subscription found' });
    await sub.update({ cancelAtPeriodEnd: true });
    logger.info({ event: 'subscription_cancelled', workspaceId });
    res.json({ message: 'Subscription will be cancelled at end of current period', periodEnd: sub.currentPeriodEnd });
  } catch (err) { next(err); }
};

// ── List invoices ─────────────────────────────────────────────────────────────
exports.listInvoices = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const invoices = await Invoice.findAll({
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
      limit: 24,
    });
    res.json({ invoices });
  } catch (err) { next(err); }
};

// ── Record usage (internal call from other services) ──────────────────────────
exports.recordUsage = async (req, res, next) => {
  try {
    const { workspaceId, aiRequests = 0, storageBytes = 0, membersCount } = req.body;
    const period = new Date().toISOString().slice(0, 7);

    const [meter, created] = await UsageMeter.findOrCreate({
      where: { workspaceId, period },
      defaults: { aiRequests: 0, storageBytes: 0, membersCount: 1 },
    });

    await meter.update({
      aiRequests: meter.aiRequests + aiRequests,
      storageBytes: meter.storageBytes + storageBytes,
      ...(membersCount !== undefined && { membersCount }),
    });

    // Check if approaching limits
    const sub = await Subscription.findOne({ where: { workspaceId } });
    if (sub) {
      const limits = PLANS[sub.plan];
      const usagePercent = ((meter.aiRequests + aiRequests) / limits.requests) * 100;
      if (usagePercent >= 80 && usagePercent < 100) {
        await redis.publish('billing-events', JSON.stringify({ type: 'USAGE_WARNING', workspaceId, percent: Math.round(usagePercent) }));
      } else if (usagePercent >= 100) {
        await redis.publish('billing-events', JSON.stringify({ type: 'USAGE_EXCEEDED', workspaceId }));
      }
    }

    res.json({ success: true, meter });
  } catch (err) { next(err); }
};
