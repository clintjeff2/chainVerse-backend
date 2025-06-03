const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middlewares/authMiddleware');

router.post('/merge', auth, cartController.mergeCart);

module.exports = router;
