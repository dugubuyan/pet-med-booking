const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware to prevent abuse
 */
const createRateLimiter = () => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutes
  const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.'
      }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

module.exports = createRateLimiter;
