
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor' },
  rating: Number, // 1 to 5
  comment: String,
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
