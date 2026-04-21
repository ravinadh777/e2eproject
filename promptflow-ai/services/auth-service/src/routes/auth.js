// services/auth-service/src/routes/auth.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const validate = require('../middleware/validate');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('user', 'viewer').default('user'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const resetRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: User registered successfully }
 *       409: { description: Email already exists }
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 */
router.post('/login', validate(loginSchema), authController.login);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.post('/password/reset-request', validate(resetRequestSchema), authController.requestPasswordReset);
router.post('/password/reset', validate(resetPasswordSchema), authController.resetPassword);
router.get('/validate', authController.validateToken); // Internal use

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// services/auth-service/src/routes/health.js
