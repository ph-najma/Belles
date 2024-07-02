const mongoose = require("mongoose");

const offerSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categories",
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
  },
  percentage: {
    type: Number,
    required: true,
  },
});
module.exports = mongoose.model("Offer", offerSchema);
