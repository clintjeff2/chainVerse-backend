const ChallengeEvaluationService = require('../services/ChallengeEvaluationService');
const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const ChallengeResult = require('../models/ChallengeResult');

exports.submitAnswers = async (req, res) => {
	try {
		const { challengeId } = req.params;
		const { answers, totalTime } = req.body;
		const playerId = req.user._id;

		const challenge = await Challenge.findById(challengeId);
		if (!challenge) {
			return res.status(404).json({ message: 'Challenge not found' });
		}

		if (
			challenge.playerOneId.toString() !== playerId.toString() &&
			challenge.playerTwoId.toString() !== playerId.toString()
		) {
			return res
				.status(403)
				.json({ message: 'Not authorized for this challenge' });
		}

		if (challenge.status === 'completed') {
			return res.status(400).json({ message: 'Challenge already completed' });
		}

		const existingSubmission = await ChallengeSubmission.findOne({
			challengeId,
			playerId,
		});

		if (existingSubmission) {
			return res.status(400).json({ message: 'Answers already submitted' });
		}

		const submission = new ChallengeSubmission({
			challengeId,
			playerId,
			answers,
			totalTime,
		});

		await submission.save();

		if (challenge.status === 'pending') {
			await Challenge.findByIdAndUpdate(challengeId, {
				status: 'in_progress',
				startedAt: new Date(),
			});
		}

		const totalSubmissions = await ChallengeSubmission.countDocuments({
			challengeId,
		});

		if (totalSubmissions === 2) {
			setTimeout(async () => {
				try {
					await ChallengeEvaluationService.evaluateChallenge(challengeId);
				} catch (error) {
					console.error('Async evaluation failed:', error);
				}
			}, 100);

			res.status(200).json({
				message: 'Answers submitted successfully. Evaluation in progress...',
				bothPlayersSubmitted: true,
			});
		} else {
			res.status(200).json({
				message: 'Answers submitted successfully. Waiting for opponent...',
				bothPlayersSubmitted: false,
			});
		}
	} catch (error) {
		console.error('Error submitting answers:', error);
		res.status(500).json({ message: 'Error submitting answers' });
	}
};

exports.getChallengeResult = async (req, res) => {
	try {
		const { challengeId } = req.params;
		const playerId = req.user._id;

		// Verify player is part of the challenge
		const challenge = await Challenge.findById(challengeId);
		if (!challenge) {
			return res.status(404).json({ message: 'Challenge not found' });
		}

		if (
			challenge.playerOneId.toString() !== playerId.toString() &&
			challenge.playerTwoId.toString() !== playerId.toString()
		) {
			return res
				.status(403)
				.json({ message: 'Not authorized for this challenge' });
		}

		const result = await ChallengeResult.findOne({ challengeId }).populate({
			path: 'challengeId',
			populate: [
				{ path: 'playerOneId', select: 'name email' },
				{ path: 'playerTwoId', select: 'name email' },
			],
		});

		if (!result) {
			return res.status(404).json({ message: 'Challenge not yet completed' });
		}

		// Determine if current user won
		const isWinner =
			result.winnerId && result.winnerId.toString() === playerId.toString();
		const isDraw = !result.winnerId;

		res.status(200).json({
			challengeId,
			playerOne: {
				id: result.playerOneId,
				name: result.challengeId.playerOneId.name,
				score: result.playerOneScore,
				time: result.playerOneTime,
			},
			playerTwo: {
				id: result.playerTwoId,
				name: result.challengeId.playerTwoId.name,
				score: result.playerTwoScore,
				time: result.playerTwoTime,
			},
			winnerId: result.winnerId,
			isWinner,
			isDraw,
			completedAt: result.completedAt,
		});
	} catch (error) {
		console.error('Error getting challenge result:', error);
		res.status(500).json({ message: 'Error fetching challenge result' });
	}
};

exports.getChallengeHistory = async (req, res) => {
	try {
		const playerId = req.user._id;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		const challenges = await Challenge.find({
			$or: [{ playerOneId: playerId }, { playerTwoId: playerId }],
			status: 'completed',
		})
			.populate('playerOneId playerTwoId', 'name')
			.sort({ completedAt: -1 })
			.skip(skip)
			.limit(limit);

		const challengeIds = challenges.map((c) => c._id);
		const results = await ChallengeResult.find({
			challengeId: { $in: challengeIds },
		});

		// Combine challenge and result data
		const history = challenges.map((challenge) => {
			const result = results.find(
				(r) => r.challengeId.toString() === challenge._id.toString()
			);

			const isPlayerOne =
				challenge.playerOneId._id.toString() === playerId.toString();
			const opponent = isPlayerOne
				? challenge.playerTwoId
				: challenge.playerOneId;
			const playerScore = isPlayerOne
				? result?.playerOneScore
				: result?.playerTwoScore;
			const opponentScore = isPlayerOne
				? result?.playerTwoScore
				: result?.playerOneScore;

			let outcome = 'draw';
			if (result?.winnerId) {
				outcome =
					result.winnerId.toString() === playerId.toString() ? 'won' : 'lost';
			}

			return {
				challengeId: challenge._id,
				opponent: opponent.name,
				playerScore,
				opponentScore,
				outcome,
				completedAt: challenge.completedAt,
			};
		});

		const totalChallenges = await Challenge.countDocuments({
			$or: [{ playerOneId: playerId }, { playerTwoId: playerId }],
			status: 'completed',
		});

		res.status(200).json({
			history,
			pagination: {
				page,
				limit,
				totalPages: Math.ceil(totalChallenges / limit),
				totalChallenges,
			},
		});
	} catch (error) {
		console.error('Error getting challenge history:', error);
		res.status(500).json({ message: 'Error fetching challenge history' });
	}
};

exports.getLeaderboard = async (req, res) => {
	try {
		const { courseId, type = 'global' } = req.query;
		const limit = parseInt(req.query.limit) || 10;

		let leaderboard;
		if (type === 'course' && courseId) {
			leaderboard = await ChallengeEvaluationService.getCourseLeaderboard(
				courseId,
				limit
			);
		} else {
			leaderboard = await ChallengeEvaluationService.getGlobalLeaderboard(
				limit
			);
		}

		res.status(200).json({ leaderboard, type, courseId });
	} catch (error) {
		console.error('Error getting leaderboard:', error);
		res.status(500).json({ message: 'Error fetching leaderboard' });
	}
};

exports.evaluateChallenge = async (req, res) => {
	try {
		const { challengeId } = req.params;

		if (!req.user.isAdmin) {
			return res.status(403).json({ message: 'Admin access required' });
		}

		const result = await ChallengeEvaluationService.evaluateChallenge(
			challengeId
		);

		res.status(200).json({
			message: 'Challenge evaluation completed',
			result,
		});
	} catch (error) {
		console.error('Error in manual evaluation:', error);
		res.status(500).json({ message: error.message });
	}
};
