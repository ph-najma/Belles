const mongoose = require("mongoose");
const Cart = mongoose.Schema({
  created_at: {
    type: Date,
    default: Date.now,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  item: [
    {
      product: {
        type: mongoose.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  totalQty: {
    type: Number,
    required: true,
    default: 0,
  },
  shippingCharge: {
    type: Number,
    default: 0,
  },
});
module.exports = mongoose.model("Cart", Cart);
