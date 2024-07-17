const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },

  percentage: {
    type: Number,
    required: true,
  },

  expiryDate: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    default: "Active",
  },
  maxLimit: {
    type: Number,
    required: true,
  },

  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],
});

module.exports = mongoose.model("Coupon", couponSchema);
