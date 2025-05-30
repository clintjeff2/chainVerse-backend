const Redis = require('redis');
const { promisify } = require('util');
const logger = require('../utils/logger');

class RateLimitService {
  constructor() {
    this.redisClient = null;
    this.isRedisConnected = false;
    this.config = this.loadConfig();
    this.initRedis();
  }

  loadConfig() {
    return {
      guest: {
        windowMs: parseInt(process.env.RATE_LIMIT_GUEST_WINDOW_MS) || 60000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_GUEST_MAX) || 30,
      },
      authenticated: {
        windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 60000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 100,
      },
      premium: {
        windowMs: parseInt(process.env.RATE_LIMIT_PREMIUM_WINDOW_MS) || 60000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_PREMIUM_MAX) || 200,
      },
      admin: {
        windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS) || 60000, // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN_MAX) || 500,
      },
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
      skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      keyPrefix: process.env.RATE_LIMIT_KEY_PREFIX || 'rl:',
    };
  }

  async initRedis() {
    try {
      if (process.env.NODE_ENV === 'development' && !process.env.FORCE_REDIS) {
        logger.info('Rate limiting using in-memory store (development mode)');
        return;
      }

      this.redisClient = Redis.createClient({
        url: this.config.redisUrl,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for rate limiting');
        this.isRedisConnected = true;
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis error:', err);
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting:', error);
      this.isRedisConnected = false;
    }
  }

  getUserType(req) {
    if (req.user) {
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return 'admin';
      }
      if (req.user.subscriptionPlan === 'premium') {
        return 'premium';
      }
      return 'authenticated';
    }
    return 'guest';
  }

  getKeyIdentifier(req) {
    const userType = this.getUserType(req);
    
    if (req.user && req.user._id) {
      return `user:${req.user._id}`;
    }
    
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               'unknown';
    
    return `ip:${ip}`;
  }

  async getRateLimitData(key) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        logger.error('Redis get error:', error);
        return null;
      }
    }
    
    if (!this.memoryStore) {
      this.memoryStore = new Map();
    }
    return this.memoryStore.get(key) || null;
  }

  async setRateLimitData(key, data, ttl) {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(data));
        return true;
      } catch (error) {
        logger.error('Redis set error:', error);
        return false;
      }
    }
    
    if (!this.memoryStore) {
      this.memoryStore = new Map();
    }
    this.memoryStore.set(key, data);
    setTimeout(() => {
      if (this.memoryStore.has(key)) {
        this.memoryStore.delete(key);
      }
    }, ttl * 1000);
    
    return true;
  }

  async checkRateLimit(req) {
    if (!this.config.enabled) {
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: 0,
        retryAfter: 0
      };
    }

    const userType = this.getUserType(req);
    const limits = this.config[userType];
    const identifier = this.getKeyIdentifier(req);
    const key = `${this.config.keyPrefix}${identifier}`;
    
    const now = Date.now();
    const windowStart = now - limits.windowMs;
    
    let rateLimitData = await this.getRateLimitData(key);
    
    if (!rateLimitData || rateLimitData.resetTime <= now) {
      rateLimitData = {
        count: 1,
        resetTime: now + limits.windowMs,
        requests: [now]
      };
    } else {
      rateLimitData.requests = rateLimitData.requests.filter(time => time > windowStart);
      rateLimitData.requests.push(now);
      rateLimitData.count = rateLimitData.requests.length;
    }
    
    const remaining = Math.max(0, limits.maxRequests - rateLimitData.count);
    const allowed = rateLimitData.count <= limits.maxRequests;
    const retryAfter = allowed ? 0 : Math.ceil((rateLimitData.resetTime - now) / 1000);
    
    const ttl = Math.ceil((rateLimitData.resetTime - now) / 1000);
    await this.setRateLimitData(key, rateLimitData, ttl);
    
    if (!allowed) {
      logger.warn(`Rate limit exceeded for ${userType} ${identifier}`, {
        userType,
        identifier,
        limit: limits.maxRequests,
        count: rateLimitData.count,
        retryAfter
      });
    }
    
    return {
      allowed,
      limit: limits.maxRequests,
      remaining,
      resetTime: rateLimitData.resetTime,
      retryAfter,
      userType
    };
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Rate limit configuration updated', newConfig);
  }

  async getStats(identifier) {
    const key = `${this.config.keyPrefix}${identifier}`;
    return await this.getRateLimitData(key);
  }

  async clearRateLimit(identifier) {
    const key = `${this.config.keyPrefix}${identifier}`;
    
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return true;
      } catch (error) {
        logger.error('Redis delete error:', error);
        return false;
      }
    }
    
    if (this.memoryStore) {
      this.memoryStore.delete(key);
    }
    
    return true;
  }

  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new RateLimitService();