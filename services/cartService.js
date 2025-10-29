const User = require("../models/userModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Products = require("../models/productModel");
const Address = require("../models/addressmodel");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

const getCartData = async (userId) => {
  let totalPrice = 0;
  let totalQty = 0;

  const user = await User.findById(userId);
  const cart = await Cart.findOne({ userId: userId });
  const today = new Date();

  const coupon = await Coupon.find({
    expiryDate: { $gte: today },
    usedBy: { $nin: [user._id] },
  });

  const cartData = await Cart.aggregate([
    { $match: { userId: new ObjectId(userId) } },
    { $unwind: "$item" },
    {
      $lookup: {
        from: "products",
        localField: "item.product",
        foreignField: "_id",
        as: "item.product",
      },
    },
    { $unwind: "$item.product" },
    {
      $lookup: {
        from: "categories",
        localField: "item.product.category",
        foreignField: "_id",
        as: "item.product.category",
      },
    },
    { $unwind: "$item.product.category" },
  ]);

  const updatedCartItems = [];

  for (let i = 0; i < cartData.length; i++) {
    const product = cartData[i].item.product;
    const quantity = cartData[i].item.quantity;
    const size = cartData[i].item.size;

    // Check stock availability
    if (product.sizes[size] >= quantity) {
      totalPrice += product.price * quantity;
      totalQty += quantity;
      updatedCartItems.push(cartData[i]);
    } else {
      // Remove unavailable item
      await Cart.updateOne(
        { userId },
        { $pull: { item: { product: product._id, size: size } } }
      );
    }
  }

  let shippingCharge = 0;
  if (totalPrice < 1000 && updatedCartItems.length > 0) {
    shippingCharge = 60;
    totalPrice += shippingCharge;
  }

  await Cart.updateOne({ userId }, { $set: { totalPrice, shippingCharge } });

  return {
    user,
    updatedCartItems,
    totalPrice,
    totalQty,
    coupon,
    shippingCharge,
  };
};

// -----------------------------------------------------------

const addProductToCart = async (userId, productId, size) => {
  const product = await Products.findById(productId);
  const userCart = await Cart.findOne({ userId });
  const maxStock = product.sizes[size];

  if (userCart) {
    const itemIndex = userCart.item.findIndex(
      (item) => item.product.toString() === productId && item.size === size
    );

    if (itemIndex >= 0) {
      const currentQuantity = userCart.item[itemIndex].quantity;
      const newQuantity = currentQuantity + 1;

      if (newQuantity > maxStock) {
        return { success: false, message: "Exceeds available stock" };
      }

      const newPrice = newQuantity * product.price;

      await Cart.updateOne(
        { userId, "item.product": productId, "item.size": size },
        {
          $set: { "item.$.quantity": newQuantity, "item.$.price": newPrice },
          $inc: { totalQty: 1, totalPrice: product.price },
        }
      );
    } else {
      if (1 > maxStock) {
        return { success: false, message: "Exceeds available stock" };
      }

      const newItem = {
        product: productId,
        price: product.price,
        quantity: 1,
        size: size,
      };

      await Cart.updateOne(
        { userId },
        {
          $push: { item: newItem },
          $inc: { totalQty: 1, totalPrice: product.price },
        },
        { upsert: true }
      );
    }
  } else {
    if (1 > maxStock) {
      return { success: false, message: "Exceeds available stock" };
    }

    const newCart = new Cart({
      userId,
      item: [
        {
          product: productId,
          price: product.price,
          quantity: 1,
          size: size,
        },
      ],
      totalPrice: product.price,
      totalQty: 1,
    });

    await newCart.save();
  }

  return { success: true };
};
const removeCartItem = async (userId, itemId) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(itemId)
  ) {
    throw new Error("Invalid userId or itemId");
  }

  const cart = await Cart.findOne({ userId });
  if (!cart) throw new Error("Cart not found");

  const itemObjectId = new mongoose.Types.ObjectId(itemId);
  const itemExists = cart.item.some((i) => i._id.equals(itemObjectId));
  if (!itemExists) throw new Error("Item not found in cart");

  const updatedCart = await Cart.findOneAndUpdate(
    { userId },
    { $pull: { item: { _id: itemObjectId } } },
    { new: true }
  );

  if (!updatedCart) throw new Error("Failed to update cart");

  return updatedCart;
};

// 🧩 Load checkout page data
const loadCheckoutData = async (userId, pendingOrder) => {
  const user = await User.findById(userId);
  const today = new Date();
  const coupon = await Coupon.find({
    expiryDate: { $gte: today },
    usedBy: { $nin: [userId] },
    percentage: { $exists: true },
  });

  if (pendingOrder) {
    const addressData = await Address.find({ userId, is_deleted: false }).sort({
      created_at: -1,
    });
    return {
      user,
      coupon,
      addresses: addressData,
      items: pendingOrder.item,
      totalPrice: pendingOrder.totalPrice,
      discount:
        (pendingOrder.totalPrice * pendingOrder.discountPercentage) / 100,
      shippingCharge: pendingOrder.shippingCharge,
      isPending: true,
    };
  } else {
    const cartData = await Cart.aggregate([
      { $match: { userId } },
      { $unwind: "$item" },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "item.product",
        },
      },
      { $unwind: "$item.product" },
      {
        $lookup: {
          from: "categories",
          localField: "item.product.category",
          foreignField: "_id",
          as: "item.product.category",
        },
      },
      { $unwind: "$item.product.category" },
    ]);

    if (!cartData.length) return null;

    const totalPrice = cartData.reduce(
      (acc, cur) => acc + cur.item.product.price * cur.item.quantity,
      0
    );

    const addressData = await Address.find({ userId, is_deleted: false }).sort({
      created_at: -1,
    });
    return {
      user,
      coupon,
      addresses: addressData,
      items: cartData.map((cart) => cart.item),
      totalPrice,
      shippingCharge: cartData[0].shippingCharge,
      isPending: false,
    };
  }
};

// 🧩 Increment or Decrement Cart Item Quantity
const updateCartQuantity = async (cartId, itemId, value) => {
  const cartDoc = await Cart.findById(cartId);
  const item = cartDoc.item.find((i) => i._id.toString() === itemId);
  const product = await Products.findById(item.product);

  const updatedQuantity = item.quantity + parseInt(value, 10);
  if (updatedQuantity > product.sizes[item.size])
    throw new Error("Quantity exceeds available stock.");

  if (updatedQuantity <= 0) {
    await Cart.updateOne({ _id: cartId }, { $pull: { item: { _id: itemId } } });
  } else {
    const updatedPrice = updatedQuantity * product.price;
    const priceDifference = updatedPrice - item.quantity * product.price;

    await Cart.updateOne(
      { _id: cartId, "item._id": itemId },
      {
        $set: {
          "item.$.quantity": updatedQuantity,
          "item.$.price": updatedPrice,
        },
        $inc: { totalPrice: priceDifference },
      }
    );
  }

  const updatedCart = await Cart.findById(cartId);
  const totalCartPrice = updatedCart.item.reduce(
    (acc, cur) => acc + cur.price,
    0
  );
  const totalQty = updatedCart.item.reduce((acc, cur) => acc + cur.quantity, 0);

  await Cart.updateOne(
    { _id: cartId },
    { $set: { totalPrice: totalCartPrice, totalQty: totalQty } }
  );

  return { updatedCart, totalCartPrice };
};

module.exports = {
  getCartData,
  addProductToCart,
  removeCartItem,
  loadCheckoutData,
  updateCartQuantity,
};
