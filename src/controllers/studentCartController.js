const Student = require("../models/student");
const Course = require("../models/course");
const mongoose = require("mongoose");
const createStudent = require("../utils/createStudent");

const getCartItems = async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Unauthorized: Missing user.' });
  }
  
  try {
    const user = req.user;
    let student = await Student.findById(user._id)
      .populate({
        path: "cart",
        model: "Course"
      });
    
    if (!student) {
      student = await createStudent(user._id, user.email);
      return res.send({ message: "Cart is empty" });
    }
    return res.send(student.cart);
  } catch (error) {
    console.error('Error getting cart items:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

const addCartItem = async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Unauthorized: Missing user.' });
  }
  
  try {
    const user = req.user;
    const courseId = req.params.courseId;
    
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).send(
        { message: "Invalid Course ID format" }
      );
    }
    
    const course = await Course.findById(courseId);
    if (!course)
      return res.status(404).send(
        { message: "Course not found" }
      );
    
    let student = await Student.findById(user._id);
    if (!student) {
      student = await createStudent(user._id, user.email);
    }
    
    if (!student.cart.includes(courseId)) {
      student.cart.push(courseId);
      student = await student.save();
    }
    res.status(201).send(student.cart);
  } catch (error) {
    console.error('Error adding cart item:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateCartItem = async (req, res) => {
  res.send("updateCart");
};

const deleteCartItem = async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).json({ message: 'Unauthorized: Missing user.' });
  }
  
  try{
    const user = req.user;
    console.log(user);
    const courseId = req.params.courseId;
    if (!(courseId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).send(
        { message: "Invalid Course ID format" }
      );
    }
    
    let student = await Student.findById(user._id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    student.cart = student.cart.filter(
      (id) => id.toString() !== courseId
    );
    
    await student.save();
    return res.send(student.cart);
    
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
  
};

module.exports = {
  getCartItems,
  addCartItem,
  updateCartItem,
  deleteCartItem,
};