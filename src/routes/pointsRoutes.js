const express = require("express")
const pointsController = require("../controllers/pointsController")
const badgeController = require("../controllers/badgeController")
const { authMiddleware, roleMiddleware } = require("../middlewares/authMiddleware")

const router = express.Router()

// Points routes
router.post("/students/:id/points", authMiddleware, roleMiddleware("tutor"), pointsController.addPoints)

router.get("/students/:id/points", authMiddleware, pointsController.getStudentPoints)

router.get("/students/:id/rank", authMiddleware, pointsController.getStudentRank)

router.get("/students/leaderboard", authMiddleware, pointsController.getLeaderboard)

// Badge management routes (admin only)
router.post("/badges", authMiddleware, roleMiddleware("admin"), badgeController.createBadge)

router.get("/badges", authMiddleware, badgeController.getAllBadges)

router.get("/badges/:id", authMiddleware, badgeController.getBadgeById)

router.put("/badges/:id", authMiddleware, roleMiddleware("admin"), badgeController.updateBadge)

router.delete("/badges/:id", authMiddleware, roleMiddleware("admin"), badgeController.deleteBadge)

// Student badge routes
router.get("/students/:studentId/badges", authMiddleware, badgeController.getStudentBadges)

module.exports = router
