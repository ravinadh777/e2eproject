// services/auth-service/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, RefreshToken, PasswordReset } = require('../models');
const logger = require('../utils/logger');
const redis = require('../utils/redis');

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

// ── Helpers ───────────────────────────────────────────────────────────────────
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
  return { accessToken, refreshToken };
};

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role === 'admin' ? 'user' : role, // prevent self-assigning admin
      isVerified: false,
      verificationToken: crypto.randomBytes(32).toString('hex'),
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Save refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Publish event for notification service
    const event = {
      type: 'USER_REGISTERED',
      userId: user.id,
      email: user.email,
      name: user.name,
    };
    await redis.publish('user-events', JSON.stringify(event));

    logger.info({ event: 'user_registered', userId: user.id, email: user.email });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check blocked IPs in Redis
    const clientIp = req.ip;
    const failKey = `login_fails:${clientIp}`;
    const fails = await redis.get(failKey);
    if (parseInt(fails) >= 5) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user) {
      await redis.incr(failKey);
      await redis.expire(failKey, 900);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await redis.incr(failKey);
      await redis.expire(failKey, 900);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Clear fail counter on success
    await redis.del(failKey);

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    // Save refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Cache user session
    await redis.setex(`session:${user.id}`, 900, JSON.stringify({
      userId: user.id, role: user.role, email: user.email,
    }));

    logger.info({ event: 'user_login', userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken, userId: payload.userId },
    });
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired or revoked' });
    }

    // Rotate tokens
    await tokenRecord.destroy();
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId, payload.role);
    await RefreshToken.create({
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }
    if (req.userId) {
      await redis.del(`session:${req.userId}`);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Get Profile ───────────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password', 'verificationToken', 'resetToken'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// ── Password Reset Request ────────────────────────────────────────────────────
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordReset.upsert({ userId: user.id, token: resetToken, expiresAt });

    // Publish event to notification service
    await redis.publish('user-events', JSON.stringify({
      type: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      email: user.email,
      resetToken,
    }));

    logger.info({ event: 'password_reset_requested', userId: user.id });
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const resetRecord = await PasswordReset.findOne({
      where: { token, expiresAt: { [Op.gt]: new Date() } },
    });
    if (!resetRecord) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await User.update({ password: hashedPassword }, { where: { id: resetRecord.userId } });
    await resetRecord.destroy();

    // Invalidate all refresh tokens
    await RefreshToken.destroy({ where: { userId: resetRecord.userId } });

    logger.info({ event: 'password_reset', userId: resetRecord.userId });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

// ── Validate Token (internal service-to-service) ──────────────────────────────
exports.validateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ valid: false });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check session cache
    const session = await redis.get(`session:${payload.userId}`);
    if (!session) {
      const user = await User.findByPk(payload.userId, {
        attributes: ['id', 'email', 'role', 'isActive'],
      });
      if (!user || !user.isActive) return res.status(401).json({ valid: false });
    }

    res.json({ valid: true, userId: payload.userId, role: payload.role });
  } catch {
    res.status(401).json({ valid: false });
  }
};
