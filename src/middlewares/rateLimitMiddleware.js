const rateLimitService = require('../services/rateLimitService');
const logger = require('../utils/logger');

const rateLimitMiddleware = (options = {}) => {
  const {
    skip = () => false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
    onLimitReached = null,
    exemptRoutes = []
  } = options;

  return async (req, res, next) => {
    try {
      if (!rateLimitService.config.enabled) {
        return next();
      }

      const isExempt = exemptRoutes.some(route => {
        if (typeof route === 'string') {
          return req.path === route;
        }
        if (route instanceof RegExp) {
          return route.test(req.path);
        }
        return false;
      });

      if (isExempt) {
        return next();
      }

      if (skip(req, res)) {
        return next();
      }

      const rateLimitResult = await rateLimitService.checkRateLimit(req);
      
      res.set({
        'X-RateLimit-Limit': rateLimitResult.limit,
        'X-RateLimit-Remaining': rateLimitResult.remaining,
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        'X-RateLimit-User-Type': rateLimitResult.userType
      });

      if (!rateLimitResult.allowed) {
        res.set('Retry-After', rateLimitResult.retryAfter);

        if (onLimitReached) {
          return onLimitReached(req, res, next);
        }

        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          userType: rateLimitResult.userType,
          userId: req.user?._id
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. You have exceeded the rate limit of ${rateLimitResult.limit} requests per minute.`,
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        });
      }

      const originalSend = res.send;
      const originalJson = res.json;
      
      if (skipSuccessfulRequests || skipFailedRequests) {
        let shouldSkip = false;
        
        const wrapResponse = (originalMethod) => {
          return function(...args) {
            const statusCode = res.statusCode;
            
            if (skipSuccessfulRequests && statusCode >= 200 && statusCode < 400) {
              shouldSkip = true;
            }
            
            if (skipFailedRequests && statusCode >= 400) {
              shouldSkip = true;
            }
            
            return originalMethod.apply(this, args);
          };
        };
        
        res.send = wrapResponse(originalSend);
        res.json = wrapResponse(originalJson);
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next();
    }
  };
};

const createRateLimitMiddleware = (config) => {
  return rateLimitMiddleware(config);
};

const apiRateLimitMiddleware = createRateLimitMiddleware({
  exemptRoutes: [
    '/api/health',
    '/api/status',
    '/api/docs',
    '/swagger',
    /^\/api\/docs/
  ]
});

const authRateLimitMiddleware = createRateLimitMiddleware({
  skip: (req) => {
    const sensitiveEndpoints = ['/login', '/register', '/forgot-password', '/reset-password'];
    return !sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
  }
});

const publicRateLimitMiddleware = createRateLimitMiddleware({
  skip: (req) => {
    return !!req.user;
  }
});

module.exports = {
  rateLimitMiddleware,
  createRateLimitMiddleware,
  apiRateLimitMiddleware,
  authRateLimitMiddleware,
  publicRateLimitMiddleware
};