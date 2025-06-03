const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variationId: { type: String, required: true },
  quantity: { type: Number, required: true },
});

cartItemSchema.index({ userId: 1, productId: 1, variationId: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
