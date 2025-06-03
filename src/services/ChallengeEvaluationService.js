const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const ChallengeResult = require('../models/ChallengeResult');
const StudentPoints = require('../models/studentPoints');
const Question = require('../models/Question');
const { sendEmail } = require('../services/emailService');
const { mintNFT } = require('../utils/nftService');

class ChallengeEvaluationService {
	async evaluateChallenge(challengeId) {
		try {
			console.log(`Starting evaluation for challenge: ${challengeId}`);

			const challenge = await Challenge.findById(challengeId)
				.populate('playerOneId playerTwoId')
				.populate('questions.questionId');

			if (!challenge) {
				throw new Error('Challenge not found');
			}

			const submissions = await ChallengeSubmission.find({ challengeId });

			if (submissions.length !== 2) {
				throw new Error('Both players must submit before evaluation');
			}

			const playerOneSubmission = submissions.find(
				(s) => s.playerId.toString() === challenge.playerOneId._id.toString()
			);
			const playerTwoSubmission = submissions.find(
				(s) => s.playerId.toString() === challenge.playerTwoId._id.toString()
			);

			const playerOneScore = await this.calculateScore(
				playerOneSubmission,
				challenge.questions
			);
			const playerTwoScore = await this.calculateScore(
				playerTwoSubmission,
				challenge.questions
			);

			const result = this.determineWinner(
				challenge.playerOneId._id,
				challenge.playerTwoId._id,
				playerOneScore,
				playerTwoScore,
				playerOneSubmission.totalTime,
				playerTwoSubmission.totalTime
			);

			const challengeResult = await this.saveResults(challengeId, {
				playerOneId: challenge.playerOneId._id,
				playerTwoId: challenge.playerTwoId._id,
				playerOneScore,
				playerTwoScore,
				playerOneTime: playerOneSubmission.totalTime,
				playerTwoTime: playerTwoSubmission.totalTime,
				winnerId: result.winnerId,
			});

			await Challenge.findByIdAndUpdate(challengeId, {
				status: 'completed',
				completedAt: new Date(),
			});

			await this.updateLeaderboards(
				challenge,
				result,
				playerOneScore,
				playerTwoScore
			);

			await this.distributeRewards(challenge, result);

			await this.sendNotifications(
				challenge,
				result,
				playerOneScore,
				playerTwoScore
			);

			console.log(`Challenge ${challengeId} evaluation completed successfully`);
			return challengeResult;
		} catch (error) {
			console.error(`Error evaluating challenge ${challengeId}:`, error);
			await this.handleEvaluationError(challengeId, error);
			throw error;
		}
	}

	async calculateScore(submission, challengeQuestions) {
		let correctAnswers = 0;

		for (const answer of submission.answers) {
			const challengeQuestion = challengeQuestions.find(
				(q) => q.questionId._id.toString() === answer.questionId
			);

			if (
				challengeQuestion &&
				answer.selectedOption === challengeQuestion.correctOption
			) {
				correctAnswers++;
			}
		}

		return correctAnswers;
	}

	determineWinner(
		playerOneId,
		playerTwoId,
		scoreOne,
		scoreTwo,
		timeOne,
		timeTwo
	) {
		let winnerId = null;
		let isDraw = false;

		if (scoreOne > scoreTwo) {
			winnerId = playerOneId;
		} else if (scoreTwo > scoreOne) {
			winnerId = playerTwoId;
		} else {
			if (timeOne < timeTwo) {
				winnerId = playerOneId;
			} else if (timeTwo < timeOne) {
				winnerId = playerTwoId;
			} else {
				isDraw = true;
			}
		}

		return { winnerId, isDraw };
	}

	async saveResults(challengeId, resultData) {
		const challengeResult = new ChallengeResult({
			challengeId,
			...resultData,
		});

		return await challengeResult.save();
	}

	async updateLeaderboards(challenge, result, playerOneScore, playerTwoScore) {
		const updates = [];

		const winnerPoints = 50;
		const loserPoints = 10;
		const drawPoints = 25;

		let playerOnePoints, playerTwoPoints;

		if (result.isDraw) {
			playerOnePoints = playerTwoPoints = drawPoints;
		} else if (
			result.winnerId.toString() === challenge.playerOneId._id.toString()
		) {
			playerOnePoints = winnerPoints;
			playerTwoPoints = loserPoints;
		} else {
			playerOnePoints = loserPoints;
			playerTwoPoints = winnerPoints;
		}

		updates.push(
			this.updatePlayerPoints(
				challenge.playerOneId._id,
				playerOnePoints,
				'quiz_completion',
				`Challenge match - Score: ${playerOneScore}`,
				challenge.questions[0]?.questionId?.courseId
			)
		);

		updates.push(
			this.updatePlayerPoints(
				challenge.playerTwoId._id,
				playerTwoPoints,
				'quiz_completion',
				`Challenge match - Score: ${playerTwoScore}`,
				challenge.questions[0]?.questionId?.courseId
			)
		);

		await Promise.all(updates);

		await this.updateAllRanks();
	}

	async updatePlayerPoints(studentId, points, activity, description, courseId) {
		let studentPoints = await StudentPoints.findOne({ studentId });

		if (!studentPoints) {
			studentPoints = new StudentPoints({ studentId });
		}

		studentPoints.totalPoints += points;
		studentPoints.pointsHistory.push({
			activity,
			points,
			description,
			courseId,
			earnedAt: new Date(),
		});

		return await studentPoints.save();
	}

	async updateAllRanks() {
		const students = await StudentPoints.find().sort({ totalPoints: -1 });

		const updatePromises = students.map((student, index) => {
			student.rank = index + 1;
			return student.save();
		});

		await Promise.all(updatePromises);
	}

	async distributeRewards(challenge, result) {
		if (result.isDraw) {
			console.log('Match was a draw - no special rewards distributed');
			return;
		}

		try {
			const winner =
				result.winnerId.toString() === challenge.playerOneId._id.toString()
					? challenge.playerOneId
					: challenge.playerTwoId;

			if (winner.walletAddress) {
				const metadata = {
					name: 'Challenge Victory NFT',
					description: `Victory in quiz challenge on ${new Date().toDateString()}`,
					attributes: [
						{ trait_type: 'Achievement', value: 'Challenge Winner' },
						{ trait_type: 'Date', value: new Date().toISOString() },
					],
				};

				console.log(`NFT reward prepared for winner: ${winner._id}`);
			}

			console.log(
				`Reward distributed to winner: ${winner._id} for challenge: ${challenge._id}`
			);
		} catch (error) {
			console.error('Error distributing rewards:', error);
		}
	}

	async sendNotifications(challenge, result, playerOneScore, playerTwoScore) {
		try {
			const playerOne = challenge.playerOneId;
			const playerTwo = challenge.playerTwoId;

			let resultMessage;
			if (result.isDraw) {
				resultMessage = 'The match ended in a draw!';
			} else {
				const winner =
					result.winnerId.toString() === playerOne._id.toString()
						? playerOne.name
						: playerTwo.name;
				resultMessage = `${winner} won the challenge!`;
			}

			await sendEmail(
				playerOne.email,
				'Quiz Challenge Results',
				`Hi ${playerOne.name},\n\nYour quiz challenge has been completed!\n\n` +
					`Your Score: ${playerOneScore}\n` +
					`Opponent's Score: ${playerTwoScore}\n\n` +
					`Result: ${resultMessage}\n\n` +
					`Check your leaderboard position for updated rankings!`
			);

			await sendEmail(
				playerTwo.email,
				'Quiz Challenge Results',
				`Hi ${playerTwo.name},\n\nYour quiz challenge has been completed!\n\n` +
					`Your Score: ${playerTwoScore}\n` +
					`Opponent's Score: ${playerOneScore}\n\n` +
					`Result: ${resultMessage}\n\n` +
					`Check your leaderboard position for updated rankings!`
			);
		} catch (error) {
			console.error('Error sending notifications:', error);
		}
	}

	async handleEvaluationError(challengeId, error) {
		try {
			console.error(`Challenge evaluation failed for ${challengeId}:`, error);

			await Challenge.findByIdAndUpdate(challengeId, {
				status: 'error',
				errorMessage: error.message,
				errorAt: new Date(),
			});
		} catch (updateError) {
			console.error(
				'Failed to update challenge with error status:',
				updateError
			);
		}
	}

	async getCourseLeaderboard(courseId, limit = 10) {
		try {
			const leaderboard = await StudentPoints.find({
				'pointsHistory.courseId': courseId,
			})
				.populate('studentId', 'name email')
				.sort({ totalPoints: -1 })
				.limit(limit);

			return leaderboard;
		} catch (error) {
			console.error('Error fetching course leaderboard:', error);
			throw error;
		}
	}

	async getGlobalLeaderboard(limit = 10) {
		try {
			const leaderboard = await StudentPoints.find()
				.populate('studentId', 'name email')
				.sort({ totalPoints: -1 })
				.limit(limit);

			return leaderboard;
		} catch (error) {
			console.error('Error fetching global leaderboard:', error);
			throw error;
		}
	}
}

module.exports = new ChallengeEvaluationService();
