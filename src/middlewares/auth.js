
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
require('dotenv').config();

const handleError = (res, statusCode, message) => {
  return res.status(statusCode).json({ error: message });
};

/**
 * Authentication middleware
 * Verifies JWT token, loads user from DB, attaches user to req
 */
exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleError(res, 401, 'Access denied, no token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return handleError(res, 401, 'Invalid token');
      } else if (err.name === 'TokenExpiredError') {
        return handleError(res, 401, 'Token expired');
      }
      return handleError(res, 500, 'Internal server error');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return handleError(res, 401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Role-based access control middleware
 * @param {Array} roles - allowed roles array
 */
exports.hasRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return handleError(res, 401, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      return handleError(res, 403, 'Forbidden');
    }

    next();
  };
};
