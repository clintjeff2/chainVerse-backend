const mongoose = require('mongoose');

const ChallengeSubmissionSchema = new mongoose.Schema({
	challengeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Challenge',
		required: true,
	},
	playerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Student',
		required: true,
	},
	answers: [{ questionId: String, selectedOption: String }],
	totalTime: Number,
	submittedAt: { type: Date, default: Date.now },
});

ChallengeSubmissionSchema.index(
	{ challengeId: 1, playerId: 1 },
	{ unique: true }
);

module.exports = mongoose.model(
	'ChallengeSubmission',
	ChallengeSubmissionSchema
);
