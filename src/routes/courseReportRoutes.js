const express = require("express");
const router = express.Router();
const { authenticate, isAdminOrStaff } = require("../middlewares/auth");
const {
  getCourseReport,
  getAllCourseReports,
} = require("../controllers/courseReportController");

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many report requests from this IP, please try again after an hour'
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Apply admin/staff check middleware
router.use(isAdminOrStaff);

// Get report for a single course
router.get("/course/:courseId", reportLimiter, getCourseReport);

// Get reports for all courses with optional pagination
router.get("/courses", reportLimiter, getAllCourseReports);

module.exports = router;
