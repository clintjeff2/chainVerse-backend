const mongoose = require("mongoose")

const BadgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: true,
      enum: ["course_completion", "skill_mastery", "engagement", "milestone", "special"],
    },
    criteria: {
      type: {
        type: String,
        required: true,
        enum: ["points_threshold", "course_completion", "consecutive_days", "skill_completion"],
      },
      value: {
        type: Number,
        required: true,
      },
      skillArea: {
        type: String, // For skill-based badges like "Smart Contract Expert"
      },
    },
    pointsReward: {
      type: Number,
      default: 0,
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Badge", BadgeSchema)
