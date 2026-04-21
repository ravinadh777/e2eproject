// services/workspace-service/src/routes/workspace.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const ctrl = require('../controllers/workspaceController');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'Validation failed', details: error.details });
  req.body = value; next();
};

router.post('/', validate(Joi.object({ name: Joi.string().min(1).max(100).required(), description: Joi.string().max(500).optional() })), ctrl.createWorkspace);
router.get('/', ctrl.listWorkspaces);
router.get('/:id', ctrl.getWorkspace);
router.put('/:id', ctrl.updateWorkspace);
router.post('/:id/invite', validate(Joi.object({ email: Joi.string().email().required(), role: Joi.string().valid('admin','member','viewer').default('member') })), ctrl.inviteMember);
router.get('/:id/members', ctrl.getMembers);

module.exports = router;
