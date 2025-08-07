import jwt from 'jsonwebtoken';
import { userDb } from '../database/db.js';

// Get JWT secret from environment or use default (for development)
const JWT_SECRET = process.env.JWT_SECRET || 'claude-ui-dev-secret-change-in-production';

// Optional API key middleware
const validateApiKey = (req, res, next) => {
  // Skip API key validation if not configured
  if (!process.env.API_KEY) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// JWT authentication middleware - DISABLED FOR NO-AUTH MODE
const authenticateToken = async (req, res, next) => {
  // Skip authentication - allow all requests
  req.user = { id: 1, username: 'default-user' };
  next();
};

// Generate JWT token (never expires)
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id, 
      username: user.username 
    },
    JWT_SECRET
    // No expiration - token lasts forever
  );
};

// WebSocket authentication function - DISABLED FOR NO-AUTH MODE
const authenticateWebSocket = (token) => {
  // Always return a valid user for WebSocket connections
  return { userId: 1, username: 'default-user' };
};

export {
  validateApiKey,
  authenticateToken,
  generateToken,
  authenticateWebSocket,
  JWT_SECRET
};