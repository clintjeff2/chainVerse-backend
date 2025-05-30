const express = require("express")
const tutorRoutes = require("./tutorRoutes")
const subscriptionPlanRoutes = require("./subscriptionPlanRoutes")
const organizationRoutes = require("./organization")
const certificateRoutes = require("./certificateRoutes")
const reportAbuseRoutes = require("./reportAbuseRoute")
const pointsRoutes = require("./pointsRoutes")
const router = express.Router();
const authRoutes = require('./authRoute');
const courseRoutes = require('./courseRoute');
const rateLimitRoutes = require('./rateLimitRoutes');

router.use("/", tutorRoutes)
router.use("/", subscriptionPlanRoutes)
router.use("/", organizationRoutes)
router.use("/certificates", certificateRoutes)
router.use("/reports/abuse", reportAbuseRoutes)
router.use("/", pointsRoutes)
router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/rate-limit', rateLimitRoutes);

module.exports = router
