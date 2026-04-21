// services/workspace-service/src/models/index.js
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
});

const Workspace = sequelize.define('Workspace', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  plan: { type: DataTypes.ENUM('free', 'pro', 'team'), defaultValue: 'free' },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'workspaces', timestamps: true });

const WorkspaceMember = sequelize.define('WorkspaceMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  role: { type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'), defaultValue: 'member' },
  invitedBy: { type: DataTypes.UUID },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'workspace_members', timestamps: true });

const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId: { type: DataTypes.UUID, allowNull: false },
  uploadedBy: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  originalName: { type: DataTypes.STRING },
  mimeType: { type: DataTypes.STRING },
  sizeBytes: { type: DataTypes.BIGINT },
  s3Key: { type: DataTypes.STRING },          // S3 object key
  s3Bucket: { type: DataTypes.STRING },
  content: { type: DataTypes.TEXT },           // Extracted text
  chunks: { type: DataTypes.JSONB },           // Text chunks for RAG
  status: { type: DataTypes.ENUM('uploading', 'processing', 'ready', 'failed'), defaultValue: 'uploading' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, { tableName: 'documents', timestamps: true });

const Invitation = sequelize.define('Invitation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId: { type: DataTypes.UUID, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'member', 'viewer'), defaultValue: 'member' },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  invitedBy: { type: DataTypes.UUID },
  expiresAt: { type: DataTypes.DATE },
  accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'invitations', timestamps: true });

Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspaceId', as: 'members' });
Workspace.hasMany(Document, { foreignKey: 'workspaceId', as: 'documents' });
Workspace.hasMany(Invitation, { foreignKey: 'workspaceId', as: 'invitations' });

module.exports = { sequelize, Workspace, WorkspaceMember, Document, Invitation };
