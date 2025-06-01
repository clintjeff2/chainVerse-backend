const request = require("supertest");
const { expect } = require("chai");
const app = require("../../index");
const { User, Course, UserProgress, QuizResult } = require("../../models");
const { generateToken } = require("../../utils/token");

describe("Recommendation API Integration Tests", () => {
  let authToken;
  let testUser;
  let testCourses;

  before(async () => {
    // Create test user
    testUser = await User.create({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    // Generate auth token
    authToken = generateToken(testUser);

    // Create test courses
    testCourses = await Course.bulkCreate([
      {
        title: "Beginner Course 1",
        level: "beginner",
        sequence: 1,
        topic: "basics",
      },
      {
        title: "Beginner Course 2",
        level: "beginner",
        sequence: 2,
        topic: "basics",
      },
      {
        title: "Intermediate Course 1",
        level: "intermediate",
        sequence: 1,
        topic: "advanced",
      },
      {
        title: "Remedial Course",
        level: "beginner",
        sequence: 1,
        isRemedial: true,
        topic: "basics",
      },
    ]);
  });

  after(async () => {
    // Clean up test data
    await UserProgress.destroy({ where: { userId: testUser.id } });
    await QuizResult.destroy({ where: { userId: testUser.id } });
    await Course.destroy({ where: { id: testCourses.map((c) => c.id) } });
    await User.destroy({ where: { id: testUser.id } });
  });

  describe("GET /api/recommendation/next-courses", () => {
    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .get("/api/recommendation/next-courses")
        .expect(401);
    });

    it("should return default recommendation for new user", async () => {
      const response = await request(app)
        .get("/api/recommendation/next-courses")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.data.recommendations).to.have.lengthOf(1);
      expect(response.body.data.recommendations[0].courseId).to.be.null;
    });

    it("should recommend next course after completion", async () => {
      // Mark first course as completed
      await UserProgress.create({
        userId: testUser.id,
        courseId: testCourses[0].id,
        completed: true,
      });

      const response = await request(app)
        .get("/api/recommendation/next-courses")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.data.recommendations).to.have.lengthOf(1);
      expect(response.body.data.recommendations[0].courseId).to.equal(
        testCourses[1].id
      );
    });

    it("should recommend remedial course after low quiz score", async () => {
      // Add low quiz score
      await QuizResult.create({
        userId: testUser.id,
        courseId: testCourses[0].id,
        score: 50,
      });

      const response = await request(app)
        .get("/api/recommendation/next-courses")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.data.recommendations).to.have.lengthOf(2);
      expect(response.body.data.recommendations[1].courseId).to.equal(
        testCourses[3].id
      );
    });

    it("should recommend intermediate course after completing beginner courses", async () => {
      // Mark second beginner course as completed
      await UserProgress.create({
        userId: testUser.id,
        courseId: testCourses[1].id,
        completed: true,
      });

      const response = await request(app)
        .get("/api/recommendation/next-courses")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).to.equal("success");
      expect(response.body.data.recommendations).to.have.lengthOf(3);
      expect(response.body.data.recommendations[2].courseId).to.equal(
        testCourses[2].id
      );
    });
  });
});
