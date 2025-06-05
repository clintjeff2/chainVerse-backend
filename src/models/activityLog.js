const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  activityType: {
    type: String,
    enum: ['VIEW', 'DOWNLOAD', 'QUIZ_ATTEMPT', 'DISCUSSION_POST', 'DISCUSSION_COMMENT'],
    required: true
  },
  metadata: {
    quizScore: Number,
    downloadedFile: String,
    postId: mongoose.Schema.Types.ObjectId,
    commentId: mongoose.Schema.Types.ObjectId
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for querying active learners
ActivityLogSchema.index({ courseId: 1, createdAt: -1 });
ActivityLogSchema.index({ studentId: 1, courseId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);