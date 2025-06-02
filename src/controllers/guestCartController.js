const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const GuestCart = require('../models/guestCart');

// Generate a new guest cart with unique cartKey
exports.createGuestCart = async (req, res) => {
  try {
    const cartKey = `guest_${uuidv4()}`;

    const newCart = new GuestCart({
      cartKey,
      items: []
    });

    await newCart.save();

    return res.status(201).json({ cartKey });
  } catch (error) {
    console.error('Error creating guest cart:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/guest/cart/:cartKey
exports.getGuestCart = async (req, res) => {
  try {
    const { cartKey } = req.params;

    const cartDoc = await GuestCart.findOne({ cartKey }).populate('items.courseId', 'title description');
    if (!cartDoc) {
      return res.status(404).json({ message: 'Guest cart not found.' });
    }

    // Transform cart object
    const cart = {
      cartKey: cartDoc.cartKey,
      items: cartDoc.items.map(item => {
        if (!item.courseId) return null; // course might be deleted
        return {
          courseId: item.courseId._id,
          title: item.courseId.title,
          description: item.courseId.description,
          quantity: item.quantity
        };
      }).filter(Boolean), // remove nulls
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt
    };

    return res.status(200).json(cart);
  } catch (error) {
    console.error('Error retrieving guest cart:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



// Add a course to the guest cart by cartKey
exports.addCourseToGuestCart = async (req, res) => {
  try {
    const { cartKey } = req.params;
    const { courseId, quantity } = req.body;

    // Validate input
    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required.' });
    }

    const cart = await GuestCart.findOne({ cartKey });
    if (!cart) {
      return res.status(404).json({ message: 'Guest cart not found.' });
    }

    // Check if course already exists in cart, update quantity if so
    const existingItem = cart.items.find(item => item.courseId.toString() === courseId);
    if (existingItem) {
      existingItem.quantity += quantity ? quantity : 1;
    } else {
      cart.items.push({ courseId, quantity: quantity ? quantity : 1 });
    }

    await cart.save();

    return res.status(200).json(cart);
  } catch (error) {
    console.error('Error adding course to guest cart:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.updateGuestCart = async (req, res) => {
  try {
    const { cartKey } = req.params;
    const { items: updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'Invalid update format.' });
    }

    const cart = await GuestCart.findOne({ cartKey });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    updates.forEach(update => {
      const index = cart.items.findIndex(item =>
        item.courseId.toString() === update.courseId
      );

      if (index !== -1) {
        // Update quantity
        cart.items[index].quantity = update.quantity;
      } else {
        // Optional: Add as new item if not found
        cart.items.push({
          courseId: update.courseId,
          quantity: update.quantity
        });
      }
    });

    await cart.save();
    return res.status(200).json(cart);
  } catch (err) {
    console.error('Error updating guest cart:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};


exports.removeItemFromCart = async (req, res) => {
  try {
    const { cartKey } = req.params;
    const { courseId } = req.body;

    const cart = await GuestCart.findOne({ cartKey });
    if (!cart) {
      return res.status(404).json({ message: 'Guest cart not found' });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item.courseId.toString() !== courseId);

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: 'Course not found in cart' });
    }

    await cart.save();

    return res.status(200).json({ message: 'Item removed from cart', cart });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



