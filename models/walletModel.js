const mongoose = require("mongoose");
const wallet = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  transactionType: {
    type: String,
    enum: ["Credited", "Debited"],
    required: true,
  },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model("wallet", wallet);
