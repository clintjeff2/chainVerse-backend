const rateLimitService = require('../services/rateLimitService');
const logger = require('../utils/logger');

class RateLimitController {
  async getConfig(req, res) {
    try {
      const config = rateLimitService.config;
      
      const publicConfig = {
        enabled: config.enabled,
        limits: {
          guest: config.guest,
          authenticated: config.authenticated,
          premium: config.premium,
          admin: config.admin
        },
        settings: {
          skipSuccessfulRequests: config.skipSuccessfulRequests,
          skipFailedRequests: config.skipFailedRequests
        }
      };

      res.json({
        success: true,
        data: publicConfig
      });
    } catch (error) {
      logger.error('Error getting rate limit config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit configuration'
      });
    }
  }

  async updateConfig(req, res) {
    try {
      const { limits, enabled, skipSuccessfulRequests, skipFailedRequests } = req.body;

      const updateData = {};
      
      if (typeof enabled === 'boolean') {
        updateData.enabled = enabled;
      }
      
      if (typeof skipSuccessfulRequests === 'boolean') {
        updateData.skipSuccessfulRequests = skipSuccessfulRequests;
      }
      
      if (typeof skipFailedRequests === 'boolean') {
        updateData.skipFailedRequests = skipFailedRequests;
      }

      if (limits && typeof limits === 'object') {
        ['guest', 'authenticated', 'premium', 'admin'].forEach(userType => {
          if (limits[userType]) {
            const { windowMs, maxRequests } = limits[userType];
            if (windowMs && maxRequests) {
              updateData[userType] = { windowMs, maxRequests };
            }
          }
        });
      }

      await rateLimitService.updateConfig(updateData);

      logger.info('Rate limit configuration updated by admin', {
        adminId: req.user._id,
        updates: updateData
      });

      res.json({
        success: true,
        message: 'Rate limit configuration updated successfully',
        data: updateData
      });
    } catch (error) {
      logger.error('Error updating rate limit config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rate limit configuration'
      });
    }
  }

  async getStatus(req, res) {
    try {
      const rateLimitResult = await rateLimitService.checkRateLimit(req);
      
      res.json({
        success: true,
        data: {
          userType: rateLimitResult.userType,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: new Date(rateLimitResult.resetTime).toISOString(),
          windowMs: rateLimitService.config[rateLimitResult.userType].windowMs
        }
      });
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit status'
      });
    }
  }

  async getStats(req, res) {
    try {
      const { identifier } = req.params;
      
      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'Identifier is required'
        });
      }

      const stats = await rateLimitService.getStats(identifier);
      
      res.json({
        success: true,
        data: stats || { message: 'No rate limit data found for this identifier' }
      });
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limit statistics'
      });
    }
  }

  async clearRateLimit(req, res) {
    try {
      const { identifier } = req.params;
      
      if (!identifier) {
        return res.status(400).json({
          success: false,
          error: 'Identifier is required'
        });
      }

      const result = await rateLimitService.clearRateLimit(identifier);
      
      if (result) {
        logger.info('Rate limit cleared by admin', {
          adminId: req.user._id,
          identifier
        });

        res.json({
          success: true,
          message: `Rate limit cleared for identifier: ${identifier}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to clear rate limit'
        });
      }
    } catch (error) {
      logger.error('Error clearing rate limit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear rate limit'
      });
    }
  }

  async healthCheck(req, res) {
    try {
      const health = {
        enabled: rateLimitService.config.enabled,
        redisConnected: rateLimitService.isRedisConnected,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Rate limit health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Rate limiting service health check failed'
      });
    }
  }

  async getMetrics(req, res) {
    try {
      const metrics = {
        message: 'Rate limiting metrics endpoint',
        note: 'Integrate with your preferred metrics system (Prometheus, DataDog, etc.)',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting rate limit metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve rate limiting metrics'
      });
    }
  }
}

module.exports = new RateLimitController();