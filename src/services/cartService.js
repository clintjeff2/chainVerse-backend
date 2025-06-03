const CartItem = require('../models/CartItem');
const Product = require('../models/Product');

exports.mergeGuestCart = async (userId, guestCart) => {
  if (!Array.isArray(guestCart) || guestCart.length === 0) {
    return await CartItem.find({ userId });
  }

  const session = await CartItem.startSession();
  session.startTransaction();

  try {
    const userCartItems = await CartItem.find({ userId }).session(session);
    const updatedItems = [];

    for (const item of guestCart) {
      const { productId, variationId, quantity } = item;

      if (!productId || !variationId || !quantity || quantity < 1) {
        throw new Error('Invalid guest cart item structure');
      }

      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error(`Product ${productId} not found`);

      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for product ${productId}`);
      }

      const existing = userCartItems.find(
        (cartItem) =>
          cartItem.productId.toString() === productId &&
          cartItem.variationId === variationId
      );

      if (existing) {
        existing.quantity += quantity;
        updatedItems.push(await existing.save({ session }));
      } else {
        const newItem = new CartItem({ userId, productId, variationId, quantity });
        updatedItems.push(await newItem.save({ session }));
      }
    }

    await session.commitTransaction();
    session.endSession();

    return updatedItems;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
