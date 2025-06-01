const { Course} = require('../models/course');

class RecommendationRules {
    /**
     * Get recommended courses based on user's progress and performance
     * @param {string} userId - The user's ID
     * @returns {Promise<Array>} Array of recommended courses with reasons
     */
    static async getRecommendedCourses(userId) {
        const recommendations = [];
        
        // Get user's course progress
        // const userProgress = await UserProgress.findAll({
        //     where: { userId },
        //     include: [{ model: Course }]
        // });

        // // Get user's quiz results
        // const quizResults = await QuizResult.findAll({
        //     where: { userId },
        //     include: [{ model: Course }]
        // });

        // Rule 1: If user completes a course, recommend the next course in sequence
        const completedCourses = userProgress.filter(progress => progress.completed);
        for (const progress of completedCourses) {
            const nextCourse = await Course.findOne({
                where: {
                    sequence: progress.Course.sequence + 1,
                    level: progress.Course.level
                }
            });
            if (nextCourse) {
                recommendations.push({
                    courseId: nextCourse.id,
                    title: nextCourse.title,
                    reason: `Recommended as the next course after completing ${progress.Course.title}`
                });
            }
        }

        // Rule 2: If user scores low on a quiz, recommend remedial course
        const lowScores = quizResults.filter(result => result.score < 60);
        for (const result of lowScores) {
            const remedialCourse = await Course.findOne({
                where: {
                    level: result.Course.level,
                    isRemedial: true,
                    topic: result.Course.topic
                }
            });
            if (remedialCourse) {
                recommendations.push({
                    courseId: remedialCourse.id,
                    title: remedialCourse.title,
                    reason: `Recommended as a remedial course after scoring ${result.score}% in ${result.Course.title}`
                });
            }
        }

        // Rule 3: If user completes 80% of beginner courses, suggest intermediate path
        const beginnerCourses = await Course.count({ where: { level: 'beginner' } });
        const completedBeginnerCourses = userProgress.filter(
            progress => progress.completed && progress.Course.level === 'beginner'
        ).length;

        if (completedBeginnerCourses / beginnerCourses >= 0.8) {
            const intermediateCourse = await Course.findOne({
                where: { level: 'intermediate' },
                order: [['sequence', 'ASC']]
            });
            if (intermediateCourse) {
                recommendations.push({
                    courseId: intermediateCourse.id,
                    title: intermediateCourse.title,
                    reason: 'Recommended as you\'ve completed most beginner courses'
                });
            }
        }

        return recommendations;
    }
}

module.exports = RecommendationRules; 