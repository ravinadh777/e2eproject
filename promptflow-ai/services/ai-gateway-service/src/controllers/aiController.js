// services/ai-gateway-service/src/controllers/aiController.js
const { OpenAI } = require('openai');
const { Usage, Conversation, Document } = require('../models');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const { splitIntoChunks, cosineSimilarity } = require('../utils/textUtils');

// Use OpenAI or fallback to mock for demo
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-demo-key-replace-me') {
    return null; // Use mock
  }
  return new OpenAI({ apiKey });
};

// ── Mock LLM for demo without API key ─────────────────────────────────────────
const mockLLMResponse = async (prompt, context) => {
  await new Promise((r) => setTimeout(r, 500)); // Simulate latency
  const responses = [
    `Based on the provided context, I can see that ${context.slice(0, 100)}... This suggests the answer relates to the document content you uploaded.`,
    `According to the documents in your workspace, the key information is: "${context.slice(0, 150)}". This directly addresses your question.`,
    `The uploaded documents contain relevant information: ${context.slice(0, 120)}. Based on this, I can provide the following analysis...`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// ── Chat with Document Context (RAG) ─────────────────────────────────────────
exports.chat = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { message, workspaceId, conversationId, documentIds = [] } = req.body;
    const userId = req.headers['x-user-id'];
    
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    // Check usage limits
    const usageKey = `usage:${userId}:${new Date().toISOString().slice(0, 7)}`;
    const currentUsage = parseInt(await redis.get(usageKey) || '0');
    
    const FREE_LIMIT = 100;
    if (currentUsage >= FREE_LIMIT) {
      return res.status(429).json({
        error: 'Monthly request limit reached',
        currentUsage,
        limit: FREE_LIMIT,
        upgradeUrl: '/billing/upgrade',
      });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findByPk(conversationId);
    }
    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        workspaceId,
        title: message.slice(0, 80),
        messages: [],
      });
    }

    // Build context from documents (RAG)
    let context = '';
    let documentSources = [];
    if (documentIds.length > 0) {
      const docs = await Document.findAll({
        where: { id: documentIds, workspaceId },
        attributes: ['id', 'name', 'content', 'chunks'],
      });

      // Simple keyword-based retrieval (production would use embeddings)
      for (const doc of docs) {
        const chunks = doc.chunks || splitIntoChunks(doc.content || '', 500);
        const relevantChunks = chunks
          .filter((chunk) => {
            const words = message.toLowerCase().split(' ');
            return words.some((w) => chunk.toLowerCase().includes(w));
          })
          .slice(0, 3);

        if (relevantChunks.length > 0) {
          context += `\n\n[From document: ${doc.name}]\n${relevantChunks.join('\n')}`;
          documentSources.push({ id: doc.id, name: doc.name });
        }
      }
    }

    // Build prompt
    const systemPrompt = `You are a helpful AI assistant for PromptFlow AI Platform. 
You help users understand and extract information from their uploaded documents.
Be concise, accurate, and always cite which document your information comes from.
If the context doesn't contain relevant information, say so clearly.

${context ? `DOCUMENT CONTEXT:\n${context}` : 'No specific documents provided.'}`;

    // Build conversation history
    const history = (conversation.messages || []).slice(-10);
    const messages = [
      ...history,
      { role: 'user', content: message },
    ];

    let aiResponse;
    const client = getOpenAIClient();

    if (client) {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: parseInt(process.env.MAX_TOKENS) || 1000,
        temperature: 0.7,
        stream: false,
      });
      aiResponse = completion.choices[0].message.content;
    } else {
      // Mock response for demo
      aiResponse = await mockLLMResponse(message, context || 'No documents loaded. This is a demo response.');
    }

    // Update conversation history
    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: aiResponse },
    ];
    await conversation.update({ messages: updatedMessages.slice(-50) }); // Keep last 50 messages

    // Track usage
    const tokensUsed = Math.ceil((message.length + aiResponse.length) / 4);
    await redis.incr(usageKey);
    await redis.expire(usageKey, 32 * 24 * 60 * 60);

    // Save usage record
    const latency = Date.now() - startTime;
    await Usage.create({
      userId,
      workspaceId,
      conversationId: conversation.id,
      requestType: 'chat',
      tokensUsed,
      latencyMs: latency,
      model: client ? (process.env.OPENAI_MODEL || 'gpt-3.5-turbo') : 'mock-llm',
      success: true,
    });

    // Publish analytics event
    await redis.publish('ai-events', JSON.stringify({
      type: 'AI_REQUEST_COMPLETED',
      userId,
      workspaceId,
      tokensUsed,
      latencyMs: latency,
    }));

    logger.info({
      event: 'ai_chat',
      userId,
      workspaceId,
      tokensUsed,
      latency,
      documentCount: documentSources.length,
    });

    res.json({
      response: aiResponse,
      conversationId: conversation.id,
      tokensUsed,
      sources: documentSources,
      usage: { current: currentUsage + 1, limit: FREE_LIMIT },
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    await Usage.create({
      userId: req.headers['x-user-id'],
      requestType: 'chat',
      latencyMs: latency,
      success: false,
      errorMessage: err.message,
    }).catch(() => {});
    next(err);
  }
};

// ── Get Conversation History ───────────────────────────────────────────────────
exports.getConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const userId = req.headers['x-user-id'];

    const conversation = await Conversation.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json({ conversation });
  } catch (err) {
    next(err);
  }
};

// ── List Conversations ────────────────────────────────────────────────────────
exports.listConversations = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.headers['x-user-id'];

    const conversations = await Conversation.findAll({
      where: { userId, ...(workspaceId && { workspaceId }) },
      attributes: ['id', 'title', 'workspaceId', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 50,
    });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

// ── Generate Prompt Suggestions ───────────────────────────────────────────────
exports.suggestPrompts = async (req, res, next) => {
  try {
    const { documentContent } = req.body;
    const suggestions = [
      'What are the main topics covered in this document?',
      'Can you summarize the key findings?',
      'What action items are mentioned?',
      'Who are the stakeholders mentioned in this document?',
      'What are the deadlines or important dates?',
    ];
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
};

// ── Get Usage Stats ───────────────────────────────────────────────────────────
exports.getUsage = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const month = new Date().toISOString().slice(0, 7);
    const usageKey = `usage:${userId}:${month}`;
    const current = parseInt(await redis.get(usageKey) || '0');

    res.json({
      currentMonth: month,
      requestsUsed: current,
      requestsLimit: 100,
      percentUsed: Math.round((current / 100) * 100),
    });
  } catch (err) {
    next(err);
  }
};
