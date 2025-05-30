describe('Rate Limit Service Unit Tests', () => {
  let service;
  
  beforeEach(() => {
    const RateLimitService = require('../../src/services/rateLimitService').constructor;
    service = new RateLimitService();
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Configuration Loading', () => {
    test('should load default configuration', () => {
      expect(service.config).toHaveProperty('guest');
      expect(service.config).toHaveProperty('authenticated');
      expect(service.config.guest.maxRequests).toBe(30);
      expect(service.config.authenticated.maxRequests).toBe(100);
    });

    test('should update configuration', async () => {
      const newConfig = {
        guest: { maxRequests: 50, windowMs: 60000 }
      };
      
      await service.updateConfig(newConfig);
      expect(service.config.guest.maxRequests).toBe(50);
    });
  });

  describe('User Type Detection', () => {
    test('should identify guest users', () => {
      const req = { user: null };
      expect(service.getUserType(req)).toBe('guest');
    });

    test('should identify authenticated users', () => {
      const req = { user: { _id: '123', role: 'user' } };
      expect(service.getUserType(req)).toBe('authenticated');
    });

    test('should identify admin users', () => {
      const req = { user: { _id: '123', role: 'admin' } };
      expect(service.getUserType(req)).toBe('admin');
    });

    test('should identify premium users', () => {
      const req = { user: { _id: '123', subscriptionPlan: 'premium' } };
      expect(service.getUserType(req)).toBe('premium');
    });
  });

  describe('Key Generation', () => {
    test('should generate IP-based keys for guests', () => {
      const req = { ip: '192.168.1.1', user: null };
      const key = service.getKeyIdentifier(req);
      expect(key).toBe('ip:192.168.1.1');
    });

    test('should generate user-based keys for authenticated users', () => {
      const req = { 
        ip: '192.168.1.1', 
        user: { _id: 'user123' }
      };
      const key = service.getKeyIdentifier(req);
      expect(key).toBe('user:user123');
    });

    test('should handle missing IP addresses', () => {
      const req = { user: null };
      const key = service.getKeyIdentifier(req);
      expect(key).toContain('ip:');
    });
  });

  describe('Rate Limit Logic', () => {
    test('should allow requests within limit', async () => {
      const req = { ip: '127.0.0.1', user: null, path: '/test' };
      
      const result = await service.checkRateLimit(req);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
      expect(result.limit).toBe(30);
    });

    test('should block requests exceeding limit', async () => {
      const req = { ip: '127.0.0.1', user: null, path: '/test' };
      
      // Use up all requests
      for (let i = 0; i < 30; i++) {
        await service.checkRateLimit(req);
      }
      
      const result = await service.checkRateLimit(req);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Storage Operations', () => {
    test('should store and retrieve rate limit data', async () => {
      const key = 'test:key';
      const data = { count: 5, resetTime: Date.now() + 60000 };
      
      await service.setRateLimitData(key, data, 60);
      const retrieved = await service.getRateLimitData(key);
      
      expect(retrieved).toEqual(data);
    });

    test('should handle missing data gracefully', async () => {
      const result = await service.getRateLimitData('nonexistent:key');
      expect(result).toBeNull();
    });
  });

  describe('Administrative Functions', () => {
    test('should clear rate limits', async () => {
      const req = { ip: '127.0.0.1', user: null, path: '/test' };
      
      // Make some requests
      await service.checkRateLimit(req);
      await service.checkRateLimit(req);
      
      // Clear the rate limit
      const identifier = service.getKeyIdentifier(req);
      await service.clearRateLimit(identifier);
      
      const result = await service.checkRateLimit(req);
      expect(result.remaining).toBe(29); 
    });

    test('should provide statistics', async () => {
      const req = { ip: '127.0.0.1', user: null, path: '/test' };
      
      await service.checkRateLimit(req);
      
      const identifier = service.getKeyIdentifier(req);
      const stats = await service.getStats(identifier);
      
      expect(stats).toBeDefined();
      expect(stats.count).toBe(1);
    });
  });
});