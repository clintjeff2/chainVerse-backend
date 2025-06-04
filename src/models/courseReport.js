const mongoose = require('mongoose');

/**
 * Course Report Schema
 * Stores analytics and metrics for course performance
 */
const courseReportSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    unique: true
  },
  totalEnrollments: {
    type: Number,
    default: 0,
    min: [0, 'Total enrollments cannot be negative']
  },
  completionRate: {
    type: Number,
    default: 0,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100%']
  },
  dropOffRate: {
    type: Number,
    default: 0,
    min: [0, 'Drop-off rate cannot be negative'],
    max: [100, 'Drop-off rate cannot exceed 100%']
  },
  averageCompletionTime: {
    type: Number,
    default: 0,
    min: [0, 'Average completion time cannot be negative'],
    get: v => Math.round(v),
    set: v => Math.round(v)
  },
  activeLearners: {
    type: Number,
    default: 0,
    min: [0, 'Active learners cannot be negative']
  },
  engagementMetrics: {
    discussions: {
      totalPosts: { type: Number, default: 0, min: 0 },
      totalComments: { type: Number, default: 0, min: 0 },
      averageResponseTime: { type: Number, default: 0, min: 0 }
    },
    quizzes: {
      totalAttempts: { type: Number, default: 0, min: 0 },
      averageScore: { 
        type: Number, 
        default: 0,
        min: [0, 'Average score cannot be negative'],
        max: [100, 'Average score cannot exceed 100%'],
        get: v => Math.round(v * 10) / 10 // Round to 1 decimal place
      },
      passRate: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 100
      }
    },
    downloads: {
      totalDownloads: { type: Number, default: 0, min: 0 },
      uniqueUsers: { type: Number, default: 0, min: 0 }
    }
  },
  certificatesGenerated: {
    type: Number,
    default: 0,
    min: [0, 'Certificates generated cannot be negative']
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { getters: true, virtuals: true },
  toObject: { getters: true, virtuals: true }
});

// Virtual for total engagement score
courseReportSchema.virtual('totalEngagementScore').get(function() {
  const metrics = this.engagementMetrics;
  return (
    (metrics.discussions.totalPosts * 2) +
    (metrics.discussions.totalComments) +
    (metrics.quizzes.totalAttempts * 3) +
    (metrics.downloads.totalDownloads)
  );
});

// Virtual for overall course health score (0-100)
courseReportSchema.virtual('courseHealthScore').get(function() {
  const weights = {
    completionRate: 0.3,
    activeLearners: 0.2,
    engagementScore: 0.3,
    certificatesRate: 0.2
  };

  const engagementScore = Math.min(100, (this.totalEngagementScore / this.totalEnrollments) * 20);
  const certificatesRate = this.totalEnrollments > 0 ? 
    (this.certificatesGenerated / this.totalEnrollments) * 100 : 0;
  const normalizedActiveLearners = Math.min(100, (this.activeLearners / this.totalEnrollments) * 100);

  return Math.round(
    (this.completionRate * weights.completionRate) +
    (normalizedActiveLearners * weights.activeLearners) +
    (engagementScore * weights.engagementScore) +
    (certificatesRate * weights.certificatesRate)
  );
});

// Compound indexes for common queries
courseReportSchema.index({ courseId: 1 }, { unique: true });
courseReportSchema.index({ lastUpdated: -1, courseId: 1 });
courseReportSchema.index({ completionRate: -1 });
courseReportSchema.index({ 'engagementMetrics.quizzes.averageScore': -1 });

// Pre-save middleware to ensure data consistency
courseReportSchema.pre('save', function(next) {
  // Round numeric values
  this.completionRate = Math.round(this.completionRate * 100) / 100;
  this.dropOffRate = Math.round(this.dropOffRate * 100) / 100;
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('CourseReport', courseReportSchema);