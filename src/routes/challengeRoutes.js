const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/:challengeId/submit', challengeController.submitAnswers);

router.get('/:challengeId/result', challengeController.getChallengeResult);

router.get('/history', challengeController.getChallengeHistory);

router.get('/leaderboard', challengeController.getLeaderboard);

router.post('/:challengeId/evaluate', challengeController.evaluateChallenge);

module.exports = router;
