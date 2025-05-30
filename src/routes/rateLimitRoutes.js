const express = require('express');
const router = express.Router();
const rateLimitController = require('../controllers/rateLimitController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { adminAuthorization } = require('../middlewares/adminAuthorization');

/**
 * @swagger
 * /api/rate-limit/health:
 *   get:
 *     summary: Health check for rate limiting service
 *     tags: [Rate Limiting]
 *     responses:
 *       200:
 *         description: Service health status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         redisConnected:
 *                           type: boolean
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         environment:
 *                           type: string
 *       500:
 *         description: Service health check failed
 */
router.get('/health', rateLimitController.healthCheck);

/**
 * @swagger
 * /api/rate-limit/metrics:
 *   get:
 *     summary: Get rate limiting metrics (Admin only)
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/metrics', authMiddleware, adminAuthorization, rateLimitController.getMetrics);

/**
 * components:
 *   schemas:
 *     RateLimitConfig:
 *       type: object
 *       properties:
 *         enabled:
 *           type: boolean
 *           description: Whether rate limiting is enabled
 *         limits:
 *           type: object
 *           properties:
 *             guest:
 *               type: object
 *               properties:
 *                 windowMs:
 *                   type: integer
 *                   description: Time window in milliseconds
 *                 maxRequests:
 *                   type: integer
 *                   description: Maximum requests allowed in window
 *             authenticated:
 *               type: object
 *               properties:
 *                 windowMs:
 *                   type: integer
 *                 maxRequests:
 *                   type: integer
 *             premium:
 *               type: object
 *               properties:
 *                 windowMs:
 *                   type: integer
 *                 maxRequests:
 *                   type: integer
 *             admin:
 *               type: object
 *               properties:
 *                 windowMs:
 *                   type: integer
 *                 maxRequests:
 *                   type: integer
 *     RateLimitStatus:
 *       type: object
 *       properties:
 *         userType:
 *           type: string
 *           enum: [guest, authenticated, premium, admin]
 *         limit:
 *           type: integer
 *         remaining:
 *           type: integer
 *         resetTime:
 *           type: string
 *           format: date-time
 *         windowMs:
 *           type: integer
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/rate-limit/config:
 *   get:
 *     summary: Get current rate limit configuration
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rate limit configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RateLimitConfig'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/config', authMiddleware, rateLimitController.getConfig);

/**
 * @swagger
 * /api/rate-limit/config:
 *   put:
 *     summary: Update rate limit configuration (Admin only)
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               limits:
 *                 type: object
 *                 properties:
 *                   guest:
 *                     type: object
 *                     properties:
 *                       windowMs:
 *                         type: integer
 *                         minimum: 1000
 *                       maxRequests:
 *                         type: integer
 *                         minimum: 1
 *                   authenticated:
 *                     type: object
 *                     properties:
 *                       windowMs:
 *                         type: integer
 *                         minimum: 1000
 *                       maxRequests:
 *                         type: integer
 *                         minimum: 1
 *                   premium:
 *                     type: object
 *                     properties:
 *                       windowMs:
 *                         type: integer
 *                         minimum: 1000
 *                       maxRequests:
 *                         type: integer
 *                         minimum: 1
 *                   admin:
 *                     type: object
 *                     properties:
 *                       windowMs:
 *                         type: integer
 *                         minimum: 1000
 *                       maxRequests:
 *                         type: integer
 *                         minimum: 1
 *               skipSuccessfulRequests:
 *                 type: boolean
 *               skipFailedRequests:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.put('/config', authMiddleware, adminAuthorization, rateLimitController.updateConfig);

/**
 * @swagger
 * /api/rate-limit/status:
 *   get:
 *     summary: Get current user's rate limit status
 *     tags: [Rate Limiting]
 *     responses:
 *       200:
 *         description: Rate limit status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RateLimitStatus'
 *       500:
 *         description: Internal server error
 */
router.get('/status', rateLimitController.getStatus);

/**
 * @swagger
 * /api/rate-limit/stats/{identifier}:
 *   get:
 *     summary: Get rate limit statistics for specific identifier (Admin only)
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID or IP address identifier
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       400:
 *         description: Invalid identifier
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/stats/:identifier', authMiddleware, adminAuthorization, rateLimitController.getStats);

/**
 * @swagger
 * /api/rate-limit/clear/{identifier}:
 *   delete:
 *     summary: Clear rate limit for specific identifier (Admin only)
 *     tags: [Rate Limiting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID or IP address identifier
 *     responses:
 *       200:
 *         description: Rate limit cleared successfully
 *       400:
 *         description: Invalid identifier
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.delete('/clear/:identifier', authMiddleware, adminAuthorization, rateLimitController.clearRateLimit);

/**
 * @swagger
 */
 
module.exports = router;
