const request = require("supertest")
const app = require("../../app")
const Student = require("../../models/student")
const StudentPoints = require("../../models/studentPoints")
const Badge = require("../../models/badge")
const jwt = require("jsonwebtoken")

describe("Gamification API Integration Tests", () => {
  let studentToken
  let tutorToken
  let adminToken
  let studentId
  let tutorId
  let adminId

  beforeEach(async () => {
    // Create test users
    const student = new Student({
      name: "Test Student",
      email: "student@test.com",
    })
    await student.save()
    studentId = student._id

    const tutor = new Student({
      name: "Test Tutor",
      email: "tutor@test.com",
      role: "tutor",
    })
    await tutor.save()
    tutorId = tutor._id

    const admin = new Student({
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
    })
    await admin.save()
    adminId = admin._id

    // Generate tokens
    studentToken = jwt.sign({ sub: studentId, role: "student" }, process.env.JWT_ACCESS_TOKEN)

    tutorToken = jwt.sign({ sub: tutorId, role: "tutor" }, process.env.JWT_ACCESS_TOKEN)

    adminToken = jwt.sign({ sub: adminId, role: "admin" }, process.env.JWT_ACCESS_TOKEN)
  })

  afterEach(async () => {
    await Student.deleteMany({})
    await StudentPoints.deleteMany({})
    await Badge.deleteMany({})
  })

  describe("POST /students/:id/points", () => {
    test("should allow tutor to add points to student", async () => {
      const response = await request(app)
        .post(`/students/${studentId}/points`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          activity: "course_completion",
          description: "Completed JavaScript Basics",
          points: 100,
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.totalPoints).toBe(100)
      expect(response.body.data.pointsAdded).toBe(100)
    })

    test("should not allow student to add points", async () => {
      const response = await request(app)
        .post(`/students/${studentId}/points`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          activity: "course_completion",
          description: "Completed JavaScript Basics",
        })

      expect(response.status).toBe(403)
    })

    test("should validate required fields", async () => {
      const response = await request(app)
        .post(`/students/${studentId}/points`)
        .set("Authorization", `Bearer ${tutorToken}`)
        .send({
          activity: "course_completion",
          // Missing description
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain("description")
    })
  })

  describe("GET /students/:id/points", () => {
    beforeEach(async () => {
      // Add some points to student
      await StudentPoints.create({
        studentId,
        totalPoints: 150,
        pointsHistory: [
          {
            activity: "course_completion",
            points: 100,
            description: "Completed Course 1",
          },
          {
            activity: "quiz_completion",
            points: 50,
            description: "Completed Quiz 1",
          },
        ],
      })
    })

    test("should allow student to view own points", async () => {
      const response = await request(app)
        .get(`/students/${studentId}/points`)
        .set("Authorization", `Bearer ${studentToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.totalPoints).toBe(150)
      expect(response.body.data.pointsHistory).toHaveLength(2)
    })

    test("should allow tutor to view any student points", async () => {
      const response = await request(app)
        .get(`/students/${studentId}/points`)
        .set("Authorization", `Bearer ${tutorToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.totalPoints).toBe(150)
    })

    test("should not allow student to view other student points", async () => {
      const otherStudent = new Student({
        name: "Other Student",
        email: "other@test.com",
      })
      await otherStudent.save()

      const response = await request(app)
        .get(`/students/${otherStudent._id}/points`)
        .set("Authorization", `Bearer ${studentToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe("GET /students/leaderboard", () => {
    beforeEach(async () => {
      // Create multiple students with points
      const students = []
      for (let i = 0; i < 5; i++) {
        const student = new Student({
          name: `Student ${i}`,
          email: `student${i}@test.com`,
        })
        await student.save()
        students.push(student)

        await StudentPoints.create({
          studentId: student._id,
          totalPoints: (i + 1) * 100,
        })
      }
    })

    test("should return leaderboard sorted by points", async () => {
      const response = await request(app).get("/students/leaderboard").set("Authorization", `Bearer ${studentToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.leaderboard).toHaveLength(5)

      // Check if sorted by points (descending)
      const leaderboard = response.body.data.leaderboard
      expect(leaderboard[0].totalPoints).toBe(500)
      expect(leaderboard[4].totalPoints).toBe(100)

      // Check ranks
      expect(leaderboard[0].rank).toBe(1)
      expect(leaderboard[4].rank).toBe(5)
    })

    test("should support pagination", async () => {
      const response = await request(app)
        .get("/students/leaderboard?limit=3&page=1")
        .set("Authorization", `Bearer ${studentToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.leaderboard).toHaveLength(3)
      expect(response.body.data.pagination.currentPage).toBe(1)
      expect(response.body.data.pagination.totalPages).toBe(2)
    })
  })

  describe("Badge Management", () => {
    test("should allow admin to create badge", async () => {
      const response = await request(app)
        .post("/badges")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
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

      expect(response.status).toBe(201)
      expect(response.body.data.name).toBe("Smart Contract Expert")
      expect(response.body.data.rarity).toBe("epic")
    })

    test("should not allow non-admin to create badge", async () => {
      const response = await request(app)
        .post("/badges")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          name: "Test Badge",
          description: "Test description",
          category: "milestone",
          criteria: { type: "points_threshold", value: 100 },
        })

      expect(response.status).toBe(403)
    })

    test("should get all badges", async () => {
      // Create test badge
      await Badge.create({
        name: "Test Badge",
        description: "Test description",
        category: "milestone",
        criteria: { type: "points_threshold", value: 100 },
      })

      const response = await request(app).get("/badges").set("Authorization", `Bearer ${studentToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe("Test Badge")
    })
  })
})
