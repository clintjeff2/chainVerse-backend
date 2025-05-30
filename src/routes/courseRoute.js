const express = require('express');
const router = express.Router();
const isAdmin = require('../middlewares/admin');
const auth = require("./../middlewares/auth");
const { publicRateLimitMiddleware } = require('../middlewares/rateLimitMiddleware');

const courseController = require('../controllers/courseController'); 
const { authMiddleware, roleMiddleware } = require('../middlewares/auth');
const { completeCourse, getCertificate } = require('../controllers/certificateController');
const { mintNft } = require('../controllers/nftController');

console.log('courseController:', courseController);
router.post('/courses', isAdmin.ensureAdmin, courseController.createCourse);
router.post('/:id/complete',  auth.authenticate, completeCourse);
router.get('/:id/certificate',  auth.authenticate, getCertificate);
router.post('/:id/mint-nft',  auth.authenticate, mintNft);
router.get('/courses/public', publicRateLimitMiddleware, courseController.getPublicCourses);
module.exports = router;
