// controllers/careerController.js
const Career = require('../models/careers');

const createCareer = async (req, res) => {
  try {
    const { title, slug, description, image, requirements, outcomes } = req.body;

    const career = new Career({
      title,
      slug,
      description,
      image,
      requirements,
      outcomes,
    });

    await career.save();
    res.status(201).json(career);
  } catch (error) {
    res.status(500).json({ message: 'Error creating career track', error });
  }
};

const updateCareer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const career = await Career.findByIdAndUpdate(id, updates, { new: true });

    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.status(200).json(career);
  } catch (error) {
    res.status(500).json({ message: 'Error updating career track', error });
  }
};

const deleteCareer = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findByIdAndDelete(id);

    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting career track', error });
  }
};

const getAllCareers = async (req, res) => {
  try {
    const careers = await Career.find();
    res.status(200).json(careers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching career tracks', error });
  }
};

const getCareerById = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findById(id);

    if (!career) {
      return res.status(404).json({ message: 'Career not found' });
    }

    res.status(200).json(career);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching career track', error });
  }
};

module.exports = {
  createCareer,
  updateCareer,
  deleteCareer,
  getAllCareers,
  getCareerById,
};
