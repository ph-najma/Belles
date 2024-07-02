const mongoose = require("mongoose");

const products = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  desc: {
    type: String,
    required: true,
  },
  images: [{ type: String }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categories",
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  offerprice: {
    type: Number,
    required: true,
  },
  sizes: {
    s: {
      type: Number,
      default: 0,
    },
    m: {
      type: Number,
      default: 0,
    },
    l: {
      type: Number,
      default: 0,
    },
    xl: {
      type: Number,
      default: 0,
    },
    xxl: {
      type: Number,
      default: 0,
    },
  },

  created_at: {
    type: Date,
    default: Date.now,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },

  ratings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ratings",
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },
  offerPercentage: {
    type: Number,
    default: 0,
  },
});
module.exports = mongoose.model("Products", products);
