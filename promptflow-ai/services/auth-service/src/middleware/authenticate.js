// services/auth-service/src/middleware/authenticate.js
const jwt = require('jsonwebtoken');
const redis = require('../utils/redis');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.role = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
