// services/auth-service/src/models/index.js
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
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});

// ── User Model ────────────────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'viewer'),
    defaultValue: 'user',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [{ fields: ['email'] }, { fields: ['role'] }],
});

// ── Refresh Token Model ───────────────────────────────────────────────────────
const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [{ fields: ['userId'] }, { fields: ['token'] }],
});

// ── Password Reset Model ──────────────────────────────────────────────────────
const PasswordReset = sequelize.define('PasswordReset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'password_resets',
  timestamps: true,
});

// ── Associations ──────────────────────────────────────────────────────────────
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(PasswordReset, { foreignKey: 'userId', onDelete: 'CASCADE' });
PasswordReset.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, RefreshToken, PasswordReset };
