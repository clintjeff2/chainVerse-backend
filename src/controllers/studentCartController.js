const Student = require("../models/student");
const Course = require("../models/course");
const mongoose = require("mongoose");
const createStudent = require("../utils/createStudent");

const getCartItems = async (req, res) => {
  try {
    const user = req.user;
    let student = await Student.findById(user._id).populate({
      path: "cart",
      model: "Course",
    });
    
    if (!student) {
      await createStudent(user._id, user.email);
      return res.json({ cart: [], message: "Cart is empty" });
    }
    return res.json({ cart: student.cart });
  } catch (error) {
    console.error("Error getting cart items:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const addCartItem = async (req, res) => {
  try {
    const user = req.user;
    const courseId = req.params.courseId;
    
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid Course ID format" });
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    let student = await Student.findById(user._id);
    if (!student) {
      student = await createStudent(user._id, user.email);
    }
    
    await Student.updateOne({ _id: student._id }, { $addToSet: { cart: courseId } });
    
    student = await Student.findById(user._id).populate("cart");
    return res.status(201).json({ cart: student.cart });
  } catch (error) {
    console.error("Error adding cart item:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { courseIds, action } = req.body;
    const userId = req.user._id;
    
    if (!Array.isArray(courseIds) || !["add", "remove"].includes(action)) {
      return res.status(400).json({ message: "Invalid input" });
    }
    
    const validIds = courseIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const existingCourses = await Course.find({ _id: { $in: validIds } }).select("_id");
    const existingIdsSet = new Set(existingCourses.map((c) => c._id.toString()));
    
    let student = await Student.findById(userId);
    if (!student) {
      student = await createStudent(userId, req.user.email);
    }
    
    if (action === "add") {
      await Student.updateOne(
        { _id: student._id },
        { $addToSet: { cart: { $each: [...existingIdsSet] } } }
      );
    } else if (action === "remove") {
      await Student.updateOne(
        { _id: student._id },
        { $pull: { cart: { $in: [...existingIdsSet] } } }
      );
    }
    
    student = await Student.findById(userId).populate("cart");
    return res.status(200).json({ cart: student.cart });
  } catch (error) {
    console.error("Cart update error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const user = req.user;
    const courseId = req.params.courseId;
    
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid Course ID format" });
    }
    
    let student = await Student.findById(user._id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    await Student.updateOne({ _id: student._id }, { $pull: { cart: courseId } });
    
    student = await Student.findById(user._id).populate("cart");
    return res.json({ cart: student.cart });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = {
  getCartItems,
  addCartItem,
  updateCartItem,
  deleteCartItem,
};
