const StudentPoints = require("../models/studentPoints")
const Student = require("../models/student")
const Badge = require("../models/badge")
const StudentBadge = require("../models/studentBadge")
const Course = require("../models/course")
const mongoose = require("mongoose") // Import mongoose

// Point values for different activities
const POINT_VALUES = {
  course_completion: 100,
  quiz_completion: 25,
  assignment_completion: 50,
  badge_earned: 75,
  milestone_reached: 200,
}

// Add points to a student
exports.addPoints = async (req, res) => {
  try {
    const { id: studentId } = req.params
    const { activity, points, description, courseId } = req.body

    // Validate input
    if (!activity || !description) {
      return res.status(400).json({
        status: "fail",
        message: "Activity and description are required",
      })
    }

    // Validate activity type
    const validActivities = [
      "course_completion",
      "quiz_completion",
      "assignment_completion",
      "badge_earned",
      "milestone_reached",
    ]
    if (!validActivities.includes(activity)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid activity type",
      })
    }

    // Check if student exists
    const student = await Student.findById(studentId)
    if (!student) {
      return res.status(404).json({
        status: "fail",
        message: "Student not found",
      })
    }

    // Calculate points (use provided points or default values)
    const pointsToAdd = points || POINT_VALUES[activity]

    // Find or create student points record
    let studentPoints = await StudentPoints.findOne({ studentId })
    if (!studentPoints) {
      studentPoints = new StudentPoints({ studentId })
    }

    // Add points to history and total
    studentPoints.pointsHistory.push({
      activity,
      points: pointsToAdd,
      description,
      courseId: courseId || null,
    })

    studentPoints.totalPoints += pointsToAdd

    await studentPoints.save()

    // Check for badge eligibility
    await checkBadgeEligibility(studentId, studentPoints.totalPoints, activity, courseId)

    // Update leaderboard ranks
    await updateLeaderboardRanks()

    res.status(200).json({
      status: "success",
      message: "Points added successfully",
      data: {
        totalPoints: studentPoints.totalPoints,
        pointsAdded: pointsToAdd,
        activity,
        description,
      },
    })
  } catch (error) {
    console.error("Error adding points:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get student points
exports.getStudentPoints = async (req, res) => {
  try {
    const { id: studentId } = req.params
    const requestingUserId = req.user.sub
    const userRole = req.user.role

    // Check authorization - students can only view their own points, tutors can view any
    if (userRole === "student" && requestingUserId !== studentId) {
      return res.status(403).json({
        status: "fail",
        message: "You can only view your own points",
      })
    }

    // Check if student exists
    const student = await Student.findById(studentId)
    if (!student) {
      return res.status(404).json({
        status: "fail",
        message: "Student not found",
      })
    }

    // Get student points
    const studentPoints = await StudentPoints.findOne({ studentId }).populate("pointsHistory.courseId", "title")

    if (!studentPoints) {
      return res.status(200).json({
        status: "success",
        data: {
          studentId,
          totalPoints: 0,
          rank: null,
          pointsHistory: [],
          badges: [],
        },
      })
    }

    // Get student badges
    const studentBadges = await StudentBadge.find({ studentId })
      .populate("badgeId", "name description icon category rarity")
      .sort({ earnedAt: -1 })

    res.status(200).json({
      status: "success",
      data: {
        studentId,
        studentName: student.name,
        totalPoints: studentPoints.totalPoints,
        rank: studentPoints.rank,
        pointsHistory: studentPoints.pointsHistory.slice(-10), // Last 10 activities
        badges: studentBadges,
        lastUpdated: studentPoints.lastUpdated,
      },
    })
  } catch (error) {
    console.error("Error getting student points:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query
    const skip = (page - 1) * limit

    // Get top students with points
    const leaderboard = await StudentPoints.find({ totalPoints: { $gt: 0 } })
      .populate("studentId", "name email profileImage")
      .sort({ totalPoints: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    // Get total count for pagination
    const totalStudents = await StudentPoints.countDocuments({ totalPoints: { $gt: 0 } })

    // Format leaderboard data
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: skip + index + 1,
      studentId: entry.studentId._id,
      studentName: entry.studentId.name,
      studentEmail: entry.studentId.email,
      profileImage: entry.studentId.profileImage,
      totalPoints: entry.totalPoints,
      lastUpdated: entry.lastUpdated,
    }))

    res.status(200).json({
      status: "success",
      data: {
        leaderboard: formattedLeaderboard,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalStudents / limit),
          totalStudents,
          hasNextPage: skip + limit < totalStudents,
          hasPrevPage: page > 1,
        },
      },
    })
  } catch (error) {
    console.error("Error getting leaderboard:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get student's rank
exports.getStudentRank = async (req, res) => {
  try {
    const { id: studentId } = req.params

    const studentPoints = await StudentPoints.findOne({ studentId })
    if (!studentPoints) {
      return res.status(404).json({
        status: "fail",
        message: "Student points not found",
      })
    }

    // Calculate rank
    const rank =
      (await StudentPoints.countDocuments({
        totalPoints: { $gt: studentPoints.totalPoints },
      })) + 1

    res.status(200).json({
      status: "success",
      data: {
        studentId,
        totalPoints: studentPoints.totalPoints,
        rank,
      },
    })
  } catch (error) {
    console.error("Error getting student rank:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Helper function to check badge eligibility
async function checkBadgeEligibility(studentId, totalPoints, activity, courseId) {
  try {
    // Get all active badges
    const badges = await Badge.find({ isActive: true })

    for (const badge of badges) {
      // Check if student already has this badge
      const existingBadge = await StudentBadge.findOne({
        studentId,
        badgeId: badge._id,
      })

      if (existingBadge) continue

      let eligible = false

      // Check eligibility based on badge criteria
      switch (badge.criteria.type) {
        case "points_threshold":
          eligible = totalPoints >= badge.criteria.value
          break

        case "course_completion":
          if (activity === "course_completion") {
            // Check if student has completed required number of courses
            const completedCourses = await StudentPoints.aggregate([
              { $match: { studentId: mongoose.Types.ObjectId(studentId) } },
              { $unwind: "$pointsHistory" },
              { $match: { "pointsHistory.activity": "course_completion" } },
              { $group: { _id: "$pointsHistory.courseId" } },
              { $count: "total" },
            ])
            eligible = completedCourses[0]?.total >= badge.criteria.value
          }
          break

        case "skill_completion":
          if (activity === "course_completion" && courseId) {
            // Check if completed course matches skill area
            const course = await Course.findById(courseId)
            if (course && course.category === badge.criteria.skillArea) {
              eligible = true
            }
          }
          break
      }

      // Award badge if eligible
      if (eligible) {
        await StudentBadge.create({
          studentId,
          badgeId: badge._id,
          courseId: courseId || null,
        })

        // Add bonus points for earning badge
        if (badge.pointsReward > 0) {
          const studentPoints = await StudentPoints.findOne({ studentId })
          studentPoints.pointsHistory.push({
            activity: "badge_earned",
            points: badge.pointsReward,
            description: `Earned badge: ${badge.name}`,
          })
          studentPoints.totalPoints += badge.pointsReward
          await studentPoints.save()
        }
      }
    }
  } catch (error) {
    console.error("Error checking badge eligibility:", error)
  }
}

// Helper function to update leaderboard ranks
async function updateLeaderboardRanks() {
  try {
    const students = await StudentPoints.find({ totalPoints: { $gt: 0 } }).sort({ totalPoints: -1 })

    const bulkOps = students.map((student, index) => ({
      updateOne: {
        filter: { _id: student._id },
        update: { rank: index + 1 },
      },
    }))

    if (bulkOps.length > 0) {
      await StudentPoints.bulkWrite(bulkOps)
    }
  } catch (error) {
    console.error("Error updating leaderboard ranks:", error)
  }
}

module.exports = exports
