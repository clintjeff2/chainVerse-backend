
const mongoose = require('mongoose');

const DiscussionSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  content: String,
  responded: Boolean, // or count responses if nested
});

module.exports = mongoose.model('Discussion', DiscussionSchema);
