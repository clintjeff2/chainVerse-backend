const mongoose = require("mongoose")

const StudentBadgeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
  },
  {
    timestamps: true,
  },
)

// Ensure a student can't earn the same badge multiple times
StudentBadgeSchema.index({ studentId: 1, badgeId: 1 }, { unique: true })

module.exports = mongoose.model("StudentBadge", StudentBadgeSchema)
