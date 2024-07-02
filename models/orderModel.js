const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
  item: [
    {
      product: {
        // Define the 'product' field here
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products", // Refers to the Products model
      },
      price: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        default: "l",
      },
      status: {
        type: String,
        default: "Placed",
      },
      reason: {
        type: String,
      },
    },
  ],
  totalPrice: {
    type: Number,
  },
  orderDate: {
    type: Date,
    default: Date.now(),
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
  discountPercentage: {
    type: Number,
    default: 0,
  },
  deliveryDate: {
    type: Date,
    default: function () {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + 7); // Add 7 days
      return currentDate;
    },
  },

  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
  },
  paymentType: {
    type: String,
  },
  orderStatus: {
    type: String,
    default: "placed",
  },
});

module.exports = mongoose.model("Order", orderSchema);
