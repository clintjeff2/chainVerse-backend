const CourseUpdate = require('../models/courseUpdate');
const Course = require('../models/course');
const Student = require('../models/student');
const { sendEmail } = require('../services/emailService');

// POST /tutor/course/:id/update
exports.createCourseUpdate = async (req, res) => {
  const { id } = req.params;
  const { title, message, attachments } = req.body;
  const tutorId = req.tutor._id;

  try {
    // Verify course ownership
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    if (course.tutorId.toString() !== tutorId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to post updates for this course' });
    }

    // Create the course update
    const courseUpdate = new CourseUpdate({
      courseId: id,
      title,
      message,
      attachments: attachments || []
    });
    await courseUpdate.save();

    // Notify enrolled students
    const enrolledStudents = await Student.find({ enrolledCourses: id });
    for (const student of enrolledStudents) {
      const emailSubject = `New Update in ${course.title}`;
      const emailText = `Title: ${title}\n\nMessage: ${message}\n\nView the full update at: ${process.env.FRONTEND_URL}/student/course/${id}/updates`;
      await sendEmail(student.email, emailSubject, emailText);
    }

    return res.status(201).json(courseUpdate);
  } catch (error) {
    console.error('Error creating course update:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /student/course/:id/updates
exports.getCourseUpdates = async (req, res) => {
  const { id } = req.params;
  const studentId = req.user._id;

  try {
    // Verify student enrollment
    const student = await Student.findById(studentId);
    if (!student || !student.enrolledCourses.includes(id)) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Retrieve course updates
    const updates = await CourseUpdate.find({ courseId: id }).sort({ createdAt: -1 });
    return res.status(200).json(updates);
  } catch (error) {
    console.error('Error retrieving course updates:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 