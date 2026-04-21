// services/ai-gateway-service/src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'promptflow',
  username: process.env.DB_USER || 'promptflow',
  password: process.env.DB_PASSWORD || 'password',
  dialect: 'postgres',
  logging: (sql) => logger.debug(sql),
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  schema: 'ai',
});

const Conversation = sequelize.define('Conversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  workspaceId: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING, defaultValue: 'New Conversation' },
  messages: { type: DataTypes.JSONB, defaultValue: [] },
}, { tableName: 'conversations', timestamps: true });

const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT },
  chunks: { type: DataTypes.JSONB },
  mimeType: { type: DataTypes.STRING },
  sizeBytes: { type: DataTypes.INTEGER },
}, { tableName: 'documents', timestamps: true, schema: 'workspace' });

const Usage = sequelize.define('Usage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID },
  workspaceId: { type: DataTypes.UUID },
  conversationId: { type: DataTypes.UUID },
  requestType: { type: DataTypes.STRING, defaultValue: 'chat' },
  tokensUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
  latencyMs: { type: DataTypes.INTEGER },
  model: { type: DataTypes.STRING },
  success: { type: DataTypes.BOOLEAN, defaultValue: true },
  errorMessage: { type: DataTypes.TEXT },
}, { tableName: 'ai_usage', timestamps: true });

module.exports = { sequelize, Conversation, Document, Usage };
