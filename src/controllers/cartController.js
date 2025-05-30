const getCartItems = async (req, res) => {
  res.send("getCart");
}

const addCartItem = async (req, res) => {
  res.send("addToCart");
};

const updateCartItem = async (req, res) => {
  res.send("updateCart");
};

const deleteCartItem = async (req, res) => {
  res.send("deleteCart");
};

module.exports = {
  getCartItems,
  addCartItem,
  updateCartItem,
  deleteCartItem,
};