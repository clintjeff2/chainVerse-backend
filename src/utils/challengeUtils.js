
const Challenge = require('../models/Challenge');
const Question = require('../models/Question');


class ChallengeUtils {

	static async createChallenge(
		playerOneId,
		playerTwoId,
		courseId,
		questionCount = 5
	) {
		try {
			const questions = await Question.aggregate([
				{ $match: { courseId: mongoose.Types.ObjectId(courseId) } },
				{ $sample: { size: questionCount } },
			]);

			if (questions.length < questionCount) {
				throw new Error(
					`Not enough questions available. Found ${questions.length}, needed ${questionCount}`
				);
			}

			const challengeQuestions = questions.map((q) => ({
				questionId: q._id,
				correctOption: q.correctOption,
			}));

			const challenge = new Challenge({
				playerOneId,
				playerTwoId,
				questions: challengeQuestions,
				status: 'pending',
			});

			return await challenge.save();
		} catch (error) {
			console.error('Error creating challenge:', error);
			throw error;
		}
	}


	static async getPlayerStats(playerId) {
		try {
			const challenges = await Challenge.find({
				$or: [{ playerOneId: playerId }, { playerTwoId: playerId }],
				status: 'completed',
			});

			const ChallengeResult = require('../models/ChallengeResult');
			const results = await ChallengeResult.find({
				challengeId: { $in: challenges.map((c) => c._id) },
			});

			let wins = 0;
			let losses = 0;
			let draws = 0;
			let totalScore = 0;
			let totalTime = 0;

			results.forEach((result) => {
				const challenge = challenges.find(
					(c) => c._id.toString() === result.challengeId.toString()
				);
				const isPlayerOne =
					challenge.playerOneId.toString() === playerId.toString();

				if (!result.winnerId) {
					draws++;
				} else if (result.winnerId.toString() === playerId.toString()) {
					wins++;
				} else {
					losses++;
				}

				totalScore += isPlayerOne
					? result.playerOneScore
					: result.playerTwoScore;
				totalTime += isPlayerOne ? result.playerOneTime : result.playerTwoTime;
			});

			const totalGames = wins + losses + draws;
			const averageScore =
				totalGames > 0 ? (totalScore / totalGames).toFixed(2) : 0;
			const averageTime =
				totalGames > 0 ? (totalTime / totalGames).toFixed(2) : 0;
			const winRate =
				totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;

			return {
				totalGames,
				wins,
				losses,
				draws,
				winRate: `${winRate}%`,
				averageScore: parseFloat(averageScore),
				averageTime: parseFloat(averageTime),
			};
		} catch (error) {
			console.error('Error getting player stats:', error);
			throw error;
		}
	}


	static validateSubmission(answers, challengeQuestions) {
		const errors = [];

		if (!Array.isArray(answers)) {
			errors.push('Answers must be an array');
			return errors;
		}

		if (answers.length !== challengeQuestions.length) {
			errors.push(
				`Expected ${challengeQuestions.length} answers, got ${answers.length}`
			);
		}

		answers.forEach((answer, index) => {
			if (!answer.questionId || !answer.selectedOption) {
				errors.push(
					`Answer ${index + 1} is missing questionId or selectedOption`
				);
			}

			const questionExists = challengeQuestions.some(
				(q) => q.questionId.toString() === answer.questionId
			);

			if (!questionExists) {
				errors.push(`Question ${answer.questionId} not found in challenge`);
			}
		});

		return errors;
	}


	static calculateRemainingTime(challenge, timeLimit = 300000) {
		if (!challenge.startedAt) {
			return timeLimit;
		}

		const elapsed = Date.now() - challenge.startedAt.getTime();
		const remaining = Math.max(0, timeLimit - elapsed);

		return remaining;
	}

	static isChallengeExpired(challenge, timeLimit = 300000) {
		return this.calculateRemainingTime(challenge, timeLimit) === 0;
	}


	static formatChallengeForClient(challenge, playerId) {
		const isPlayerOne =
			challenge.playerOneId._id.toString() === playerId.toString();

		return {
			id: challenge._id,
			opponent: isPlayerOne ? challenge.playerTwoId : challenge.playerOneId,
			questions: challenge.questions.map((q) => ({
				id: q.questionId._id,
				text: q.questionId.text,
				options: q.questionId.options,
			})),
			status: challenge.status,
			createdAt: challenge.createdAt,
			startedAt: challenge.startedAt,
			remainingTime: this.calculateRemainingTime(challenge),
		};
	}


	static async cleanupExpiredChallenges() {
		try {
			const timeLimit = 600000; // 10 minutes
			const cutoffTime = new Date(Date.now() - timeLimit);

			const expiredChallenges = await Challenge.find({
				status: { $in: ['pending', 'in_progress'] },
				createdAt: { $lt: cutoffTime },
			});

			for (const challenge of expiredChallenges) {
				await Challenge.findByIdAndUpdate(challenge._id, {
					status: 'expired',
					completedAt: new Date(),
				});
			}

			if (expiredChallenges.length > 0) {
				console.log(
					`Cleaned up ${expiredChallenges.length} expired challenges`
				);
			}
		} catch (error) {
			console.error('Error cleaning up expired challenges:', error);
		}
	}
}

module.exports = ChallengeUtils;
