const cron = require('node-cron');
const ChallengeUtils = require('../utils/challengeUtils');

function initializeChallengeScheduler() {
	cron.schedule('*/5 * * * *', async () => {
		console.log('Running challenge cleanup...');
		try {
			await ChallengeUtils.cleanupExpiredChallenges();
		} catch (error) {
			console.error('Challenge cleanup failed:', error);
		}
	});

	console.log('Challenge scheduler initialized');
}

module.exports = { initializeChallengeScheduler };

exports.validateSubmissionData = (req, res, next) => {
	try {
		const { answers, totalTime } = req.body;

		if (!Array.isArray(answers)) {
			return res.status(400).json({
				message: 'Answers must be provided as an array',
			});
		}

		if (typeof totalTime !== 'number' || totalTime < 0) {
			return res.status(400).json({
				message: 'Total time must be a positive number',
			});
		}

		for (let i = 0; i < answers.length; i++) {
			const answer = answers[i];
			if (!answer.questionId || !answer.selectedOption) {
				return res.status(400).json({
					message: `Answer ${i + 1} must include questionId and selectedOption`,
				});
			}
		}

		const validationErrors = ChallengeUtils.validateSubmission(
			answers,
			req.challenge.questions
		);

		if (validationErrors.length > 0) {
			return res.status(400).json({
				message: 'Validation failed',
				errors: validationErrors,
			});
		}

		next();
	} catch (error) {
		console.error('Submission validation error:', error);
		res.status(500).json({ message: 'Server error during validation' });
	}
};
