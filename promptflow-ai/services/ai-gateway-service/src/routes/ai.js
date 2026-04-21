// services/ai-gateway-service/src/routes/ai.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const aiController = require('../controllers/aiController');
const validate = require('../middleware/validate');

const chatSchema = Joi.object({
  message: Joi.string().min(1).max(4000).required(),
  workspaceId: Joi.string().uuid().optional(),
  conversationId: Joi.string().uuid().optional(),
  documentIds: Joi.array().items(Joi.string().uuid()).max(10).default([]),
});

router.post('/chat', validate(chatSchema), aiController.chat);
router.get('/conversations', aiController.listConversations);
router.get('/conversations/:conversationId', aiController.getConversation);
router.post('/suggest-prompts', aiController.suggestPrompts);
router.get('/usage', aiController.getUsage);

module.exports = router;
