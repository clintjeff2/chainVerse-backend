const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');

exports.validateChallengeAccess = async (req, res, next) => {
	try {
		const { challengeId } = req.params;
		const playerId = req.user._id;

		const challenge = await Challenge.findById(challengeId);

		if (!challenge) {
			return res.status(404).json({ message: 'Challenge not found' });
		}

		if (
			challenge.playerOneId.toString() !== playerId.toString() &&
			challenge.playerTwoId.toString() !== playerId.toString()
		) {
			return res.status(403).json({
				message: 'Access denied. Not a participant in this challenge.',
			});
		}

		req.challenge = challenge;
		next();
	} catch (error) {
		console.error('Challenge access validation error:', error);
		res.status(500).json({ message: 'Server error during access validation' });
	}
};

exports.preventLateSubmission = async (req, res, next) => {
	try {
		const { challengeId } = req.params;
		const playerId = req.user._id;

		if (req.challenge.status === 'completed') {
			return res.status(400).json({
				message:
					'Challenge has already been completed. No more submissions accepted.',
			});
		}

		const existingSubmission = await ChallengeSubmission.findOne({
			challengeId,
			playerId,
		});

		if (existingSubmission) {
			return res.status(400).json({
				message: 'You have already submitted answers for this challenge.',
			});
		}

		next();
	} catch (error) {
		console.error('Late submission check error:', error);
		res
			.status(500)
			.json({ message: 'Server error during submission validation' });
	}
};
