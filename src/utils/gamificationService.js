const StudentPoints = require("../models/studentPoints")
const Badge = require("../models/badge")
const StudentBadge = require("../models/studentBadge")

class GamificationService {
  // Award points for course completion
  static async awardCourseCompletionPoints(studentId, courseId, courseName) {
    try {
      const points = 100 // Base points for course completion

      await this.addPointsToStudent(studentId, {
        activity: "course_completion",
        points,
        description: `Completed course: ${courseName}`,
        courseId,
      })

      return { success: true, points }
    } catch (error) {
      console.error("Error awarding course completion points:", error)
      return { success: false, error: error.message }
    }
  }

  // Award points for quiz completion
  static async awardQuizCompletionPoints(studentId, quizId, quizName, score) {
    try {
      // Base points + bonus for high scores
      let points = 25
      if (score >= 90)
        points += 15 // Bonus for excellent performance
      else if (score >= 80)
        points += 10 // Bonus for good performance
      else if (score >= 70) points += 5 // Bonus for satisfactory performance

      await this.addPointsToStudent(studentId, {
        activity: "quiz_completion",
        points,
        description: `Completed quiz: ${quizName} (Score: ${score}%)`,
        courseId: quizId,
      })

      return { success: true, points }
    } catch (error) {
      console.error("Error awarding quiz completion points:", error)
      return { success: false, error: error.message }
    }
  }

  // Award points for assignment completion
  static async awardAssignmentCompletionPoints(studentId, assignmentId, assignmentName) {
    try {
      const points = 50

      await this.addPointsToStudent(studentId, {
        activity: "assignment_completion",
        points,
        description: `Completed assignment: ${assignmentName}`,
        courseId: assignmentId,
      })

      return { success: true, points }
    } catch (error) {
      console.error("Error awarding assignment completion points:", error)
      return { success: false, error: error.message }
    }
  }

  // Generic method to add points to student
  static async addPointsToStudent(studentId, pointData) {
    try {
      let studentPoints = await StudentPoints.findOne({ studentId })

      if (!studentPoints) {
        studentPoints = new StudentPoints({ studentId })
      }

      // Add to history
      studentPoints.pointsHistory.push({
        activity: pointData.activity,
        points: pointData.points,
        description: pointData.description,
        courseId: pointData.courseId || null,
      })

      // Update total points
      studentPoints.totalPoints += pointData.points

      await studentPoints.save()

      // Check for new badges
      await this.checkAndAwardBadges(studentId, studentPoints.totalPoints, pointData.activity, pointData.courseId)

      return studentPoints
    } catch (error) {
      throw new Error(`Failed to add points: ${error.message}`)
    }
  }

  // Check and award badges
  static async checkAndAwardBadges(studentId, totalPoints, activity, courseId) {
    try {
      const badges = await Badge.find({ isActive: true })

      for (const badge of badges) {
        // Check if student already has this badge
        const existingBadge = await StudentBadge.findOne({
          studentId,
          badgeId: badge._id,
        })

        if (existingBadge) continue

        let eligible = false

        // Check eligibility based on criteria
        switch (badge.criteria.type) {
          case "points_threshold":
            eligible = totalPoints >= badge.criteria.value
            break

          case "course_completion":
            if (activity === "course_completion") {
              const completedCourses = await this.getCompletedCoursesCount(studentId)
              eligible = completedCourses >= badge.criteria.value
            }
            break

          case "skill_completion":
            if (activity === "course_completion" && courseId && badge.criteria.skillArea) {
              const Course = require("../models/course")
              const course = await Course.findById(courseId)
              eligible = course && course.category === badge.criteria.skillArea
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

          // Award bonus points for earning badge
          if (badge.pointsReward > 0) {
            await this.addPointsToStudent(studentId, {
              activity: "badge_earned",
              points: badge.pointsReward,
              description: `Earned badge: ${badge.name}`,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error checking and awarding badges:", error)
    }
  }

  // Get completed courses count for a student
  static async getCompletedCoursesCount(studentId) {
    try {
      const result = await StudentPoints.aggregate([
        { $match: { studentId } },
        { $unwind: "$pointsHistory" },
        { $match: { "pointsHistory.activity": "course_completion" } },
        { $group: { _id: "$pointsHistory.courseId" } },
        { $count: "total" },
      ])

      return result[0]?.total || 0
    } catch (error) {
      console.error("Error getting completed courses count:", error)
      return 0
    }
  }

  // Get student's current rank
  static async getStudentRank(studentId) {
    try {
      const studentPoints = await StudentPoints.findOne({ studentId })
      if (!studentPoints) return null

      const rank =
        (await StudentPoints.countDocuments({
          totalPoints: { $gt: studentPoints.totalPoints },
        })) + 1

      return rank
    } catch (error) {
      console.error("Error getting student rank:", error)
      return null
    }
  }

  // Update all leaderboard ranks
  static async updateLeaderboardRanks() {
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

      return true
    } catch (error) {
      console.error("Error updating leaderboard ranks:", error)
      return false
    }
  }
}

module.exports = GamificationService
