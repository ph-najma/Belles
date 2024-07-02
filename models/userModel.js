const mongoose = require("mongoose");
const users = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sname: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  is_admin: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  is_blocked: {
    type: Boolean,
    default: false,
  },
  googleId: { type: String },
  wallet: {
    type: Number,
    default: 0,
  },
  referralcode: {
    type: String,
  },
  referralLink: {
    type: String,
  },
  referredBy: {
    type: String,
  },
});
module.exports = mongoose.model("Users", users);
