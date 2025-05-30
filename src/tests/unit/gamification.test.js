const mongoose = require("mongoose")
const StudentPoints = require("../../models/studentPoints")
const Badge = require("../../models/badge")
const StudentBadge = require("../../models/studentBadge")
const Student = require("../../models/student")
const GamificationService = require("../../utils/gamificationService")

// Mock database connection
jest.mock("../../config/database/connection")

describe("Gamification System", () => {
  let studentId
  let badgeId

  beforeEach(async () => {
    // Create test student
    const student = new Student({
      name: "Test Student",
      email: "test@example.com",
    })
    await student.save()
    studentId = student._id

    // Create test badge
    const badge = new Badge({
      name: "First Steps",
      description: "Complete your first course",
      category: "milestone",
      criteria: {
        type: "course_completion",
        value: 1,
      },
      pointsReward: 50,
    })
    await badge.save()
    badgeId = badge._id
  })

  afterEach(async () => {
    await Student.deleteMany({})
    await StudentPoints.deleteMany({})
    await Badge.deleteMany({})
    await StudentBadge.deleteMany({})
  })

  describe("StudentPoints Model", () => {
    test("should create student points record", async () => {
      const studentPoints = new StudentPoints({
        studentId,
        totalPoints: 100,
      })

      await studentPoints.save()
      expect(studentPoints.totalPoints).toBe(100)
      expect(studentPoints.studentId).toEqual(studentId)
    })

    test("should add points to history", async () => {
      const studentPoints = new StudentPoints({ studentId })

      studentPoints.pointsHistory.push({
        activity: "course_completion",
        points: 100,
        description: "Completed JavaScript Basics",
      })

      studentPoints.totalPoints += 100
      await studentPoints.save()

      expect(studentPoints.pointsHistory).toHaveLength(1)
      expect(studentPoints.pointsHistory[0].points).toBe(100)
      expect(studentPoints.totalPoints).toBe(100)
    })
  })

  describe("Badge Model", () => {
    test("should create badge with valid criteria", async () => {
      const badge = new Badge({
        name: "Smart Contract Expert",
        description: "Master blockchain development",
        category: "skill_mastery",
        criteria: {
          type: "skill_completion",
          value: 1,
          skillArea: "blockchain",
        },
        pointsReward: 200,
        rarity: "epic",
      })

      await badge.save()
      expect(badge.name).toBe("Smart Contract Expert")
      expect(badge.criteria.skillArea).toBe("blockchain")
      expect(badge.rarity).toBe("epic")
    })
  })

  describe("GamificationService", () => {
    test("should award course completion points", async () => {
      const result = await GamificationService.awardCourseCompletionPoints(
        studentId,
        new mongoose.Types.ObjectId(),
        "JavaScript Basics",
      )

      expect(result.success).toBe(true)
      expect(result.points).toBe(100)

      const studentPoints = await StudentPoints.findOne({ studentId })
      expect(studentPoints.totalPoints).toBe(100)
      expect(studentPoints.pointsHistory).toHaveLength(1)
    })

    test("should award quiz completion points with bonus", async () => {
      const result = await GamificationService.awardQuizCompletionPoints(
        studentId,
        new mongoose.Types.ObjectId(),
        "JavaScript Quiz",
        95,
      )

      expect(result.success).toBe(true)
      expect(result.points).toBe(40) // 25 base + 15 bonus for 95% score

      const studentPoints = await StudentPoints.findOne({ studentId })
      expect(studentPoints.totalPoints).toBe(40)
    })

    test("should award assignment completion points", async () => {
      const result = await GamificationService.awardAssignmentCompletionPoints(
        studentId,
        new mongoose.Types.ObjectId(),
        "Build a Calculator",
      )

      expect(result.success).toBe(true)
      expect(result.points).toBe(50)

      const studentPoints = await StudentPoints.findOne({ studentId })
      expect(studentPoints.totalPoints).toBe(50)
    })

    test("should calculate student rank correctly", async () => {
      // Create multiple students with different points
      const student2 = new Student({
        name: "Student 2",
        email: "student2@example.com",
      })
      await student2.save()

      const student3 = new Student({
        name: "Student 3",
        email: "student3@example.com",
      })
      await student3.save()

      // Add points to students
      await StudentPoints.create({ studentId, totalPoints: 100 })
      await StudentPoints.create({ studentId: student2._id, totalPoints: 200 })
      await StudentPoints.create({ studentId: student3._id, totalPoints: 150 })

      const rank = await GamificationService.getStudentRank(studentId)
      expect(rank).toBe(3) // Should be 3rd place with 100 points
    })
  })

  describe("Badge System", () => {
    test("should award badge when criteria is met", async () => {
      // Award course completion points (should trigger badge)
      await GamificationService.awardCourseCompletionPoints(
        studentId,
        new mongoose.Types.ObjectId(),
        "JavaScript Basics",
      )

      // Check if badge was awarded
      const studentBadge = await StudentBadge.findOne({ studentId, badgeId })
      expect(studentBadge).toBeTruthy()

      // Check if bonus points were awarded
      const studentPoints = await StudentPoints.findOne({ studentId })
      expect(studentPoints.totalPoints).toBe(150) // 100 + 50 bonus
    })

    test("should not award same badge twice", async () => {
      // Award course completion twice
      await GamificationService.awardCourseCompletionPoints(studentId, new mongoose.Types.ObjectId(), "Course 1")

      await GamificationService.awardCourseCompletionPoints(studentId, new mongoose.Types.ObjectId(), "Course 2")

      // Should only have one badge
      const studentBadges = await StudentBadge.find({ studentId, badgeId })
      expect(studentBadges).toHaveLength(1)
    })
  })
})
