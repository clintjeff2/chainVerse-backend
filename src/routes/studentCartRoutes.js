const express = require('express');
const router = express.Router();
const { authenticate, hasRole } = require('../middlewares/auth');
const { getCartItems, addCartItem, updateCartItem, deleteCartItem } = require('../controllers/studentCartController');

router.get('/student/cart', authenticate, hasRole(['student']), getCartItems);
router.post('/student/cart/:courseId', authenticate, hasRole(['student']), addCartItem);
router.put('/student/cart/:courseId', authenticate, hasRole(['student']), updateCartItem);
router.delete('/student/cart/:courseId', authenticate, hasRole(['student']), deleteCartItem);

module.exports = router;