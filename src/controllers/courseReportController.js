const CourseReport = require("../models/courseReport");
const Course = require("../models/course");
const { isAdmin } = require("../middlewares/auth");
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

// Cache metrics for 5 minutes
const metricsCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

// Error handler
const handleError = (res, statusCode, message) => {
  logger.error(`Course Report Error: ${message}`);
  return res.status(statusCode).json({
    status: "error",
    message
  });
};

// Helper function to calculate metrics with caching
const calculateMetrics = async (courseId) => {
  // Check cache first
  const cachedMetrics = metricsCache.get(courseId);
  if (cachedMetrics) {
    return cachedMetrics;
  }

  const course = await Course.findById(courseId)
    .select('enrollments status')
    .lean();

  if (!course) {
    throw new Error("Course not found");
  }

  const enrollments = course.enrollments || [];
  const totalEnrollments = enrollments.length;
  
  // Use reduce instead of multiple filters for better performance
  const { completed, active } = enrollments.reduce((acc, e) => {
    if (e.status === "COMPLETED") acc.completed++;
    else if (e.status === "ACTIVE") acc.active++;
    return acc;
  }, { completed: 0, active: 0 });

  // Calculate rates
  const completionRate = totalEnrollments > 0 ? (completed / totalEnrollments) * 100 : 0;
  const dropOffRate = totalEnrollments > 0 ? 
    ((totalEnrollments - completed - active) / totalEnrollments) * 100 : 0;

  const metrics = {
    totalEnrollments,
    completionRate: Math.round(completionRate * 100) / 100,
    dropOffRate: Math.round(dropOffRate * 100) / 100,
    activeLearners: active,
    lastCalculated: new Date()
  };

  // Cache the results
  metricsCache.set(courseId, metrics);

  return metrics;
};

// Get report for a single course
exports.getCourseReport = async (req, res) => {
  try {
    if (!isAdmin(req.user) && !req.user.isStaff) {
      return handleError(res, 403, "Unauthorized access");
    }

    const { courseId } = req.params;
    if (!courseId?.match(/^[0-9a-fA-F]{24}$/)) {
      return handleError(res, 400, "Invalid course ID format");
    }

    // Get or create report with optimized query
    const [report, metrics] = await Promise.all([
      CourseReport.findOne({ courseId })
        .populate('courseId', 'title description')
        .lean(),
      calculateMetrics(courseId)
    ]);

    const updatedReport = report ? 
      { ...report, ...metrics } : 
      new CourseReport({ courseId, ...metrics });

    // Save in background to improve response time
    CourseReport.updateOne(
      { courseId }, 
      updatedReport, 
      { upsert: true }
    ).exec();

    res.status(200).json({
      status: "success",
      data: updatedReport
    });
  } catch (error) {
    handleError(res, 500, error.message);
  }
};

// Get reports for all courses
exports.getAllCourseReports = async (req, res) => {
  try {
    if (!isAdmin(req.user) && !req.user.isStaff) {
      return handleError(res, 403, "Unauthorized access");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    // Use aggregation for better performance
    const [{ reports = [], total = 0 } = {}] = await CourseReport.aggregate([
      {
        $facet: {
          reports: [
            { $sort: { lastUpdated: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'courses',
                localField: 'courseId',
                foreignField: '_id',
                pipeline: [{ $project: { title: 1, description: 1 } }],
                as: 'courseId'
              }
            },
            { $unwind: '$courseId' }
          ],
          total: [{ $count: 'count' }]
        }
      },
      { $unwind: '$total' },
      { 
        $project: { 
          reports: 1, 
          total: '$total.count' 
        } 
      }
    ]);

    // Update metrics in background
    reports.forEach(report => {
      calculateMetrics(report.courseId._id).then(metrics => {
        CourseReport.updateOne(
          { _id: report._id },
          { $set: metrics }
        ).exec();
      }).catch(error => {
        logger.error(`Error updating metrics for course ${report.courseId}: ${error.message}`);
      });
    });

    res.status(200).json({
      status: "success",
      data: reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    handleError(res, 500, error.message);
  }
};

// Update engagement metrics
exports.updateEngagementMetrics = async (courseId, metrics) => {
  try {
    if (!courseId?.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error("Invalid course ID format");
    }

    const result = await CourseReport.updateOne(
      { courseId },
      { 
        $set: { 
          'engagementMetrics': metrics,
          'lastUpdated': new Date() 
        }
      },
      { upsert: true }
    );

    // Invalidate cache on successful update
    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      metricsCache.del(courseId);
    }

    return result;
  } catch (error) {
    logger.error(`Error updating engagement metrics: ${error.message}`);
    throw error;
  }
};
