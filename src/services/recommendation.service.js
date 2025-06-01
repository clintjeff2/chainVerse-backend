const RecommendationRules = require("./recommendation.rules");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");

class RecommendationService {
  /**
   * Get course recommendations for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} Array of recommended courses
   */
  static async getRecommendedCourses(userId) {
    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    try {
      // Get recommendations using rules
      const recommendations = await RecommendationRules.getRecommendedCourses(
        userId
      );

      // If no recommendations found, return a default recommendation
      if (recommendations.length === 0) {
        return [
          {
            courseId: null,
            title: "No specific recommendations available",
            reason: "Complete more courses to get personalized recommendations",
          },
        ];
      }

      return recommendations;
    } catch (error) {
      throw new ApiError(
        500,
        "Error generating recommendations: " + error.message
      );
    }
  }
}

module.exports = RecommendationService;
