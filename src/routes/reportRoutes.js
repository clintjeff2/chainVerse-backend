const mongoose = require("mongoose");
const Tutor = require("../models/Tutor");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Feedback = require("../models/Feedback");
const Discussion = require("../models/Discussion");
const Material = require("../models/Material");
const Certificate = require("../models/Certificate");


async function calculateTutorMetrics(tutorId) {
  const tutorObjectId = mongoose.Types.ObjectId(tutorId);

 
  const assignedCourses = await Course.find({ tutorId: tutorObjectId });
  const courseIds = assignedCourses.map((c) => c._id);

 
  const studentsTaught = await Enrollment.distinct("studentId", { courseId: { $in: courseIds } });
  const numberOfStudents = studentsTaught.length;

  
  const feedbacks = await Feedback.find({ tutorId: tutorObjectId });
  const avgRating =
    feedbacks.length > 0 ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length : null;
  const feedbackCount = feedbacks.length;


  const discussionsCount = await Discussion.countDocuments({ tutorId: tutorObjectId });

  
  const materialsCount = await Material.countDocuments({ tutorId: tutorObjectId });

 
  const coursesCompletedCount = await Enrollment.countDocuments({
    courseId: { $in: courseIds },
    completed: true,
  });

 
  const certificatesCount = await Certificate.countDocuments({ tutorId: tutorObjectId });

  return {
    tutorId,
    assignedCourses: assignedCourses.length,
    numberOfStudents,
    feedbackCount,
    avgRating,
    discussionsCount,
    materialsCount,
    coursesCompletedCount,
    certificatesCount,
  };
}


exports.getTutorReport = async (req, res) => {
  try {
    const { tutorId } = req.params;

 
    if (!mongoose.Types.ObjectId.isValid(tutorId)) {
      return res.status(400).json({ error: "Invalid tutorId" });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ error: "Tutor not found" });

    const metrics = await calculateTutorMetrics(tutorId);

    res.json({ tutor: tutor.name, metrics });
  } catch (err) {
    console.error("Error fetching tutor report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


exports.getAllTutorsSummary = async (req, res) => {
  try {
    const tutors = await Tutor.find({ role: "tutor" });

  
    const reports = await Promise.all(
      tutors.map(async (t) => {
        const metrics = await calculateTutorMetrics(t._id);
        return {
          tutorId: t._id,
          name: t.name,
          metrics,
        };
      })
    );

    res.json(reports);
  } catch (err) {
    console.error("Error fetching tutors report:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
