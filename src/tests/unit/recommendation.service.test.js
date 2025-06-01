const { expect } = require("chai");
const sinon = require("sinon");
const RecommendationService = require("../../services/recommendation.service");
const RecommendationRules = require("../../services/recommendation.rules");
const { User } = require("../../models");
const ApiError = require("../../utils/ApiError");

describe("RecommendationService", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getRecommendedCourses", () => {
    it("should throw 404 if user not found", async () => {
      sandbox.stub(User, "findByPk").resolves(null);

      try {
        await RecommendationService.getRecommendedCourses("non-existent-id");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.instanceOf(ApiError);
        expect(error.statusCode).to.equal(404);
        expect(error.message).to.equal("User not found");
      }
    });

    it("should return default recommendation when no recommendations found", async () => {
      sandbox.stub(User, "findByPk").resolves({ id: "test-user" });
      sandbox.stub(RecommendationRules, "getRecommendedCourses").resolves([]);

      const result = await RecommendationService.getRecommendedCourses(
        "test-user"
      );

      expect(result).to.deep.equal([
        {
          courseId: null,
          title: "No specific recommendations available",
          reason: "Complete more courses to get personalized recommendations",
        },
      ]);
    });

    it("should return recommendations from rules", async () => {
      const mockUser = { id: "test-user" };
      const mockRecommendations = [
        {
          courseId: "course-1",
          title: "Test Course 1",
          reason: "Test reason 1",
        },
      ];

      sandbox.stub(User, "findByPk").resolves(mockUser);
      sandbox
        .stub(RecommendationRules, "getRecommendedCourses")
        .resolves(mockRecommendations);

      const result = await RecommendationService.getRecommendedCourses(
        "test-user"
      );

      expect(result).to.deep.equal(mockRecommendations);
    });

    it("should handle errors gracefully", async () => {
      sandbox.stub(User, "findByPk").resolves({ id: "test-user" });
      sandbox
        .stub(RecommendationRules, "getRecommendedCourses")
        .rejects(new Error("Test error"));

      try {
        await RecommendationService.getRecommendedCourses("test-user");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).to.be.instanceOf(ApiError);
        expect(error.statusCode).to.equal(500);
        expect(error.message).to.include("Error generating recommendations");
      }
    });
  });
});
