const express = require('express');
const router = express.Router();
const courseUpdateController = require('../controllers/courseUpdateController');
const tutorAuth = require('../middlewares/tutorAuth');
const auth = require('../middlewares/auth');
const courseUpdateValidator = require('../validators/courseUpdateValidator');
const { rateLimitMiddleware } = require('../middlewares/rateLimitMiddleware');

// POST /tutor/course/:id/update
router.post('/tutor/course/:id/update',
  tutorAuth.authenticateTutor,
  tutorAuth.tutorRoleCheck,
  courseUpdateValidator.validateCourseUpdateCreation,
  courseUpdateValidator.validateResults,
  rateLimitMiddleware({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 requests per hour
  courseUpdateController.createCourseUpdate
);

// GET /student/course/:id/updates
router.get('/student/course/:id/updates',
  auth.authenticate,
  auth.hasRole(['student']),
  rateLimitMiddleware({ windowMs: 60 * 60 * 1000, max: 30 }), // 30 requests per hour
  courseUpdateController.getCourseUpdates
);

module.exports = router; 