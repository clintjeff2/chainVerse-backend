const request = require('supertest');
const app = require('../../src/index');
const rateLimitService = require('../../src/services/rateLimitService');

describe('Rate Limiting Integration Tests', () => {
  beforeEach(async () => {
    if (rateLimitService.memoryStore) {
      rateLimitService.memoryStore.clear();
    }
  });

  afterAll(async () => {
    await rateLimitService.close();
  });

  describe('Guest User Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const endpoint = '/api/courses';
      
      for (let i = 0; i < 20; i++) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(429);
        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    test('should enforce rate limit for guest users', async () => {
      const endpoint = '/api/courses';
      const requests = [];
      
      for (let i = 0; i < 35; i++) {
        requests.push(request(app).get(endpoint));
      }
      
      const responses = await Promise.all(requests);
      
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.body).toHaveProperty('error', 'Rate limit exceeded');
      expect(rateLimitedResponse.body).toHaveProperty('retryAfter');
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    test('should include proper rate limit headers', async () => {
      const response = await request(app).get('/api/courses');
      
      expect(response.headers['x-ratelimit-limit']).toBe('30');
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(response.headers['x-ratelimit-user-type']).toBe('guest');
    });
  });

  describe('Authenticated User Rate Limiting', () => {
    const mockToken = 'mock-jwt-token-for-testing';
    
    test('should have higher limits for authenticated users', async () => {
      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(parseInt(response.headers['x-ratelimit-limit'])).toBeGreaterThan(30);
    });

    test('should differentiate between user types', async () => {
      const guestResponse = await request(app).get('/api/courses');
      const authResponse = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(guestResponse.headers['x-ratelimit-user-type']).toBe('guest');
    });
  });

  describe('Rate Limit Service Functionality', () => {
    test('should track requests correctly', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        user: null,
        path: '/api/test'
      };
      
      const result1 = await rateLimitService.checkRateLimit(mockReq);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(29); 
      
      const result2 = await rateLimitService.checkRateLimit(mockReq);
      expect(result2.remaining).toBe(28); 
    });

    test('should reset limits after window expires', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        user: null,
        path: '/api/test'
      };
      
      for (let i = 0; i < 30; i++) {
        await rateLimitService.checkRateLimit(mockReq);
      }
      
      const limitedResult = await rateLimitService.checkRateLimit(mockReq);
      expect(limitedResult.allowed).toBe(false);
      
    });
  });

  describe('Exempt Routes', () => {
    test('should not apply rate limiting to health endpoints', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });

    test('should not apply rate limiting to documentation endpoints', async () => {
      const response = await request(app).get('/api/docs');
      
      expect(response.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection failures gracefully', async () => {
      const originalRedisConnected = rateLimitService.isRedisConnected;
      rateLimitService.isRedisConnected = false;
      
      const response = await request(app).get('/api/courses');
      
      expect(response.status).not.toBe(500);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      
      rateLimitService.isRedisConnected = originalRedisConnected;
    });

    test('should continue working if rate limiting service fails', async () => {
      const originalCheckRateLimit = rateLimitService.checkRateLimit;
      rateLimitService.checkRateLimit = jest.fn().mockRejectedValue(new Error('Service error'));
      
      const response = await request(app).get('/api/courses');
      
      expect(response.status).not.toBe(500);
      
      rateLimitService.checkRateLimit = originalCheckRateLimit;
    });
  });
});