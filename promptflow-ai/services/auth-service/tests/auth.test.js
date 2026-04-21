// services/auth-service/tests/auth.test.js
const request = require('supertest');

// Mock dependencies before requiring app
jest.mock('../src/models', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
  },
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  RefreshToken: {
    create: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
  PasswordReset: {
    findOne: jest.fn(),
    upsert: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/utils/redis', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue('PONG'),
}));

const app = require('../src/app');
const { User, RefreshToken } = require('../src/models');

describe('Auth Service - Register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should register a new user successfully', async () => {
    User.findOne.mockResolvedValue(null); // No existing user
    User.create.mockResolvedValue({
      id: 'test-uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    });
    RefreshToken.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    User.findOne.mockResolvedValue({ id: 'existing-id', email: 'test@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Password123!', name: 'Test' });

    expect(res.status).toBe(400);
  });

  it('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'weak', name: 'Test User' });

    expect(res.status).toBe(400);
  });
});

describe('Auth Service - Login', () => {
  const bcrypt = require('bcryptjs');

  it('should login with valid credentials', async () => {
    const hashed = await bcrypt.hash('Password123!', 12);
    User.findOne.mockResolvedValue({
      id: 'test-uuid',
      email: 'test@example.com',
      password: hashed,
      role: 'user',
      isActive: true,
      update: jest.fn().mockResolvedValue(true),
    });
    RefreshToken.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('should reject invalid credentials', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });
});

describe('Auth Service - Health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('auth-service');
  });

  it('should return liveness probe', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });
});
