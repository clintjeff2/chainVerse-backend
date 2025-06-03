const mongoose = require("mongoose");

const ChallengeSchema = new mongoose.Schema({
  playerOneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  playerTwoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  questions: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
      correctOption: {
        type: String,
        required: true,
      },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: Date,
  completedAt: Date,
});

ChallengeSchema.index({ playerOneId: 1 });
ChallengeSchema.index({ playerTwoId: 1 });

module.exports = mongoose.model("Challenge", ChallengeSchema);
