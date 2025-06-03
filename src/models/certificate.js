const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  issueDate: Date,
});

module.exports = mongoose.model('Certificate', CertificateSchema);
