const Tutor = require("../models/tutors");

// Get all tutors with pagination
exports.getAllTutors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const tutors = await Tutor.find()
      .select(
        "id firstName lastName bio rating numberOfCourses numberOfStudents primaryExpertise"
      )
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json(tutors);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get tutor by ID
exports.getTutorById = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }
    res.status(200).json(tutor);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
