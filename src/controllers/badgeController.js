const Badge = require("../models/badge")
const StudentBadge = require("../models/studentBadge")

// Create a new badge
exports.createBadge = async (req, res) => {
  try {
    const { name, description, icon, category, criteria, pointsReward, rarity } = req.body

    // Validate required fields
    if (!name || !description || !category || !criteria) {
      return res.status(400).json({
        status: "fail",
        message: "Name, description, category, and criteria are required",
      })
    }

    // Check if badge with same name already exists
    const existingBadge = await Badge.findOne({ name })
    if (existingBadge) {
      return res.status(400).json({
        status: "fail",
        message: "Badge with this name already exists",
      })
    }

    const badge = new Badge({
      name,
      description,
      icon,
      category,
      criteria,
      pointsReward: pointsReward || 0,
      rarity: rarity || "common",
    })

    await badge.save()

    res.status(201).json({
      status: "success",
      message: "Badge created successfully",
      data: badge,
    })
  } catch (error) {
    console.error("Error creating badge:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get all badges
exports.getAllBadges = async (req, res) => {
  try {
    const { category, rarity, isActive } = req.query

    // Build filter
    const filter = {}
    if (category) filter.category = category
    if (rarity) filter.rarity = rarity
    if (isActive !== undefined) filter.isActive = isActive === "true"

    const badges = await Badge.find(filter).sort({ createdAt: -1 })

    res.status(200).json({
      status: "success",
      data: badges,
    })
  } catch (error) {
    console.error("Error getting badges:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get badge by ID
exports.getBadgeById = async (req, res) => {
  try {
    const { id } = req.params

    const badge = await Badge.findById(id)
    if (!badge) {
      return res.status(404).json({
        status: "fail",
        message: "Badge not found",
      })
    }

    // Get badge statistics
    const totalEarned = await StudentBadge.countDocuments({ badgeId: id })

    res.status(200).json({
      status: "success",
      data: {
        ...badge.toObject(),
        statistics: {
          totalEarned,
        },
      },
    })
  } catch (error) {
    console.error("Error getting badge:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Update badge
exports.updateBadge = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    const badge = await Badge.findByIdAndUpdate(id, updates, { new: true, runValidators: true })

    if (!badge) {
      return res.status(404).json({
        status: "fail",
        message: "Badge not found",
      })
    }

    res.status(200).json({
      status: "success",
      message: "Badge updated successfully",
      data: badge,
    })
  } catch (error) {
    console.error("Error updating badge:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Delete badge
exports.deleteBadge = async (req, res) => {
  try {
    const { id } = req.params

    const badge = await Badge.findByIdAndDelete(id)
    if (!badge) {
      return res.status(404).json({
        status: "fail",
        message: "Badge not found",
      })
    }

    // Also remove all student badges for this badge
    await StudentBadge.deleteMany({ badgeId: id })

    res.status(200).json({
      status: "success",
      message: "Badge deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting badge:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

// Get student badges
exports.getStudentBadges = async (req, res) => {
  try {
    const { studentId } = req.params

    const studentBadges = await StudentBadge.find({ studentId })
      .populate("badgeId", "name description icon category rarity pointsReward")
      .populate("courseId", "title")
      .sort({ earnedAt: -1 })

    res.status(200).json({
      status: "success",
      data: studentBadges,
    })
  } catch (error) {
    console.error("Error getting student badges:", error)
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    })
  }
}

module.exports = exports
