// services/billing-service/src/models/index.js
const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'promptflow', username: process.env.DB_USER || 'promptflow',
  password: process.env.DB_PASSWORD || 'password', dialect: 'postgres',
  logging: (sql) => logger.debug(sql), pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
});

const PLANS = {
  free:  { name: 'Free',  price: 0,    requests: 100,  storage: 100,  members: 1  },
  pro:   { name: 'Pro',   price: 2900, requests: 1000, storage: 5120, members: 5  },
  team:  { name: 'Team',  price: 9900, requests: 10000,storage: 51200,members: 25 },
};

const Subscription = sequelize.define('Subscription', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId:  { type: DataTypes.UUID, allowNull: false, unique: true },
  userId:       { type: DataTypes.UUID, allowNull: false },
  plan:         { type: DataTypes.ENUM('free', 'pro', 'team'), defaultValue: 'free' },
  status:       { type: DataTypes.ENUM('active', 'cancelled', 'past_due', 'trialing'), defaultValue: 'active' },
  currentPeriodStart: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  currentPeriodEnd:   { type: DataTypes.DATE },
  cancelAtPeriodEnd:  { type: DataTypes.BOOLEAN, defaultValue: false },
  stripeCustomerId:   { type: DataTypes.STRING },
  stripeSubId:        { type: DataTypes.STRING },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
}, { tableName: 'subscriptions', timestamps: true });

const Invoice = sequelize.define('Invoice', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subscriptionId: { type: DataTypes.UUID, allowNull: false },
  workspaceId:  { type: DataTypes.UUID, allowNull: false },
  amount:       { type: DataTypes.INTEGER, allowNull: false }, // in cents
  currency:     { type: DataTypes.STRING, defaultValue: 'usd' },
  status:       { type: DataTypes.ENUM('draft', 'open', 'paid', 'void', 'uncollectible'), defaultValue: 'draft' },
  period:       { type: DataTypes.STRING }, // e.g. "2024-01"
  lineItems:    { type: DataTypes.JSONB, defaultValue: [] },
  paidAt:       { type: DataTypes.DATE },
  invoiceNumber: { type: DataTypes.STRING, unique: true },
}, { tableName: 'invoices', timestamps: true });

const UsageMeter = sequelize.define('UsageMeter', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workspaceId:  { type: DataTypes.UUID, allowNull: false },
  period:       { type: DataTypes.STRING, allowNull: false }, // "2024-01"
  aiRequests:   { type: DataTypes.INTEGER, defaultValue: 0 },
  storageBytes: { type: DataTypes.BIGINT, defaultValue: 0 },
  membersCount: { type: DataTypes.INTEGER, defaultValue: 1 },
}, { tableName: 'usage_meters', timestamps: true, indexes: [{ fields: ['workspaceId', 'period'], unique: true }] });

Subscription.hasMany(Invoice, { foreignKey: 'subscriptionId' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

module.exports = { sequelize, Subscription, Invoice, UsageMeter, PLANS };
