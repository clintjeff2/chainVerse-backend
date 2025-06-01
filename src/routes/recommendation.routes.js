const express = require("express");
const auth = require("../middlewares/auth");
const recommendationController = require("../controllers/recommendation.controller");

const router = express.Router();

/**
 * @swagger
 * /api/recommendation/next-courses:
 *   get:
 *     summary: Get recommended courses for the authenticated user
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended courses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           courseId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           reason:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/next-courses",
  auth(),
  recommendationController.getRecommendedCourses
);

module.exports = router;
