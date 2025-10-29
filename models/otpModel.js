// models/otpModel.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 }, // auto delete after 1 min
});

module.exports = mongoose.model("Otp", otpSchema);
