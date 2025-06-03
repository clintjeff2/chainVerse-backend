const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  stock: Number,
  variations: [
    {
      variationId: String,
      size: String,
      color: String,
    },
  ],
});

module.exports = mongoose.model('Product', productSchema);
