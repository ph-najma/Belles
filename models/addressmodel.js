const mongoose = require("mongoose");
const addresses = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
  phone: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  address: {
    type: String,
    required: true,
  },
  postcode: {
    type: Number,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  is_deleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});
module.exports = mongoose.model("Address", addresses);
