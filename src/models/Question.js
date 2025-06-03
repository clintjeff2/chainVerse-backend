const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
	text: {
		type: String,
		required: true,
	},
	options: [
		{
			label: { type: String, required: true }, // e.g., "A", "B", "C", "D"
			value: { type: String, required: true }, // option content
		},
	],
	correctOption: {
		type: String,
		required: true, // should match one of the option labels (e.g., "B")
	},
	courseId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Course',
		required: true,
	},
	difficulty: {
		type: String,
		enum: ['easy', 'medium', 'hard'],
		default: 'medium',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

QuestionSchema.index({ courseId: 1 });
QuestionSchema.index({ topicId: 1 });

module.exports = mongoose.model('Question', QuestionSchema);
