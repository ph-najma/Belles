const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const cartController = require("../controllers/cartController");
const connectToDatabase = require("../db");
connectToDatabase();

router.get("/cart", auth.userLogin, cartController.loadCart);
router.post("/addtoCart/:id", auth.userLogin, cartController.addcart);
router.post(
  "/decrementOrIncrementCart",
  auth.userLogin,
  cartController.decrementOrIncrementCart
);
router.delete("/cart/:itemId", auth.userLogin, cartController.removeCartItem);
router.get("/checkout", auth.userLogin, cartController.loadCheckOut);
module.exports = router;
