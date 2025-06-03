const ChallengeResultSchema = new mongoose.Schema({
	challengeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Challenge',
		required: true,
		unique: true,
	},
	playerOneId: mongoose.Schema.Types.ObjectId,
	playerTwoId: mongoose.Schema.Types.ObjectId,
	playerOneScore: Number,
	playerTwoScore: Number,
	playerOneTime: Number,
	playerTwoTime: Number,
	winnerId: mongoose.Schema.Types.ObjectId, // or null for draw
	completedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChallengeResult', ChallengeResultSchema);
