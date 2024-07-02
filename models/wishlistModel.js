const mongoose = require("mongoose");

const wishlistSchema = mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  item: [
    {
      product: {
        type: mongoose.Types.ObjectId,
        ref: "Products",
        required: true,
      },
    },
  ],
});

module.exports = mongoose.model("Wishlist", wishlistSchema);
