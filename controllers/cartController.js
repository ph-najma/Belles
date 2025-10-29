const Cart = require("../models/cartModel");
const Products = require("../models/productModel");
const User = require("../models/userModel");
const Orders = require("../models/orderModel");
const Address = require("../models/addressmodel");
const Coupon = require("../models/couponModel");
const mongoose = require("mongoose");
const cartService = require("../services/cartService");
const userService = require("../services/userService");
const ObjectId = mongoose.Types.ObjectId;

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cartData = await cartService.getCartData(userId);

    if (cartData.updatedCartItems.length === 0) {
      return res.render("emptyCart");
    }

    res.render("cart", {
      userData: cartData.user,
      items: cartData.updatedCartItems,
      totalPrice: cartData.totalPrice,
      totalQty: cartData.totalQty,
      coupon: cartData.coupon,
      shippingCharge: cartData.shippingCharge,
    });
  } catch (err) {
    console.error("Error in loadCart Controller:", err);
    res
      .status(500)
      .render("error", { message: "Something went wrong in loading cart" });
  }
};

const addcart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;
    const { size } = req.body;

    const result = await cartService.addProductToCart(userId, productId, size);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error in addcart Controller:", error);
    res.status(500).json({ success: false });
  }
};
const removeCartItem = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const itemId = req.params.itemId;

    const updatedCart = await cartService.removeCartItem(userId, itemId);

    res.json({
      success: true,
      message: "Item removed successfully",
      cart: updatedCart,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 💳 Load checkout page
const loadCheckOut = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const checkoutData = await cartService.loadCheckoutData(
      userId,
      req.session.pendingOrder
    );

    if (!checkoutData) return res.redirect("/cart");

    if (checkoutData.isPending) delete req.session.pendingOrder;
    const userData = await userService.getUserById(userId);

    res.render("checkOut", { ...checkoutData, userData });
  } catch (error) {
    console.error("❌ Checkout error:", error);
    res
      .status(500)
      .render("error", { message: "Something went wrong during checkout." });
  }
};

// 🔄 Increment / Decrement Cart
const decrementOrIncrementCart = async (req, res) => {
  try {
    const { cartId, itemId, value } = req.body;

    const { updatedCart, totalCartPrice } =
      await cartService.updateCartQuantity(cartId, itemId, value);

    const updatedItem = updatedCart.item.find(
      (i) => i._id.toString() === itemId
    );

    res.json({
      success: true,
      qty: updatedItem?.quantity || 0,
      price: updatedItem?.price || 0,
      totalprice: totalCartPrice,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  decrementOrIncrementCart,
  loadCart,
  addcart,
  removeCartItem,
  loadCheckOut,
};
