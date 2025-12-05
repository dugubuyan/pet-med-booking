const { verifyToken } = require('../services/authService');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided.' 
    });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId };
    req.userId = decoded.userId; // Keep for backward compatibility
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Invalid or expired token' 
    });
  }
}

/**
 * Optional JWT Authentication Middleware
 * Verifies JWT token if provided, but allows request to continue without it
 * Used for endpoints that support both authenticated and guest users
 */
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    // No token provided - continue as guest
    req.user = null;
    return next();
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    // Invalid token - continue as guest
    req.user = null;
    next();
  }
}

module.exports = { authenticateToken, optionalAuthenticateToken };
