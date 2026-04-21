// services/analytics-service/src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'promptflow', username: process.env.DB_USER || 'promptflow',
  password: process.env.DB_PASSWORD || 'password', dialect: 'postgres',
  logging: (sql) => logger.debug(sql), pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
});

const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  channel:     { type: DataTypes.STRING },
  type:        { type: DataTypes.STRING, allowNull: false },
  payload:     { type: DataTypes.JSONB, defaultValue: {} },
  userId:      { type: DataTypes.UUID },
  workspaceId: { type: DataTypes.UUID },
  occurredAt:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'analytics_events', timestamps: true, indexes: [{ fields: ['type'] }, { fields: ['workspaceId'] }, { fields: ['occurredAt'] }] });

const DailyMetric = sequelize.define('DailyMetric', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  date:            { type: DataTypes.DATEONLY, allowNull: false },
  workspaceId:     { type: DataTypes.UUID },
  aiRequests:      { type: DataTypes.INTEGER, defaultValue: 0 },
  activeUsers:     { type: DataTypes.INTEGER, defaultValue: 0 },
  documentsUploaded: { type: DataTypes.INTEGER, defaultValue: 0 },
  tokensUsed:      { type: DataTypes.INTEGER, defaultValue: 0 },
  avgLatencyMs:    { type: DataTypes.FLOAT, defaultValue: 0 },
  errorCount:      { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'daily_metrics', timestamps: true, indexes: [{ fields: ['date', 'workspaceId'], unique: true }] });

module.exports = { sequelize, AnalyticsEvent, DailyMetric };
