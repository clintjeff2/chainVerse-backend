const express = require('express');
const router = express.Router();
const { getCartItems, addCartItem, updateCartItem, deleteCartItem } = require('../controllers/studentCartController');

router.get('/student/cart', getCartItems);
router.post('/student/cart', addCartItem);
router.put('/student/cart', updateCartItem);
router.delete('/student/cart', deleteCartItem);

module.exports = router;