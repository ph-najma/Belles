const Cart = require("../models/cartModel");
const Products = require("../models/productModel");
const User = require("../models/userModel");
const Orders = require("../models/orderModel");
const Address = require("../models/addressmodel");
const Coupon = require("../models/couponModel");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const loadCart = async (req, res) => {
  try {
    let totalPrice = 0;
    let totalQty = 0;
    console.log(req.session.user);
    let session = req.session.user._id;
    console.log(req.session.user);
    const user = await User.findOne({ _id: session });
    const cart = await Cart.findOne({ userId: session });
    const today = new Date();
    const coupon = await Coupon.find({
      expiryDate: { $gte: today },
      usedBy: { $nin: [user._id] },
    });

    const cartData = await Cart.aggregate([
      {
        $match: {
          userId: new ObjectId(session),
        },
      },
      {
        $unwind: "$item",
      },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "item.product",
        },
      },
      {
        $unwind: "$item.product",
      },
      {
        $lookup: {
          from: "categories",
          localField: "item.product.category",
          foreignField: "_id",
          as: "item.product.category",
        },
      },
      {
        $unwind: "$item.product.category",
      },
    ]);

    const updatedCartItems = [];

    for (let i = 0; i < cartData.length; i++) {
      const product = cartData[i].item.product;
      const quantity = cartData[i].item.quantity;
      const size = cartData[i].item.size;

      // Check if the product stock is sufficient for the specific size
      if (product.sizes[size] >= quantity) {
        totalPrice += product.price * quantity;
        totalQty += quantity;
        updatedCartItems.push(cartData[i]);
      } else {
        // Remove the item from the cart
        await Cart.updateOne(
          { userId: session },
          { $pull: { item: { product: product._id, size: size } } }
        );
      }
    }

    let shippingCharge = 0;
    if (totalPrice < 1000) {
      shippingCharge = 60;
      totalPrice += shippingCharge;
    }

    // Update the cart document with new total price and shipping charge
    await Cart.updateOne(
      { userId: session },
      { $set: { totalPrice: totalPrice, shippingCharge: shippingCharge } }
    );

    if (updatedCartItems.length === 0) {
      return res.render("emptyCart"); // Render empty cart page if cart is empty
    } else {
      res.render("cart", {
        userData: user,
        items: updatedCartItems,
        totalPrice,
        totalQty,
        coupon: coupon,
        shippingCharge: shippingCharge,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

const addcart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;
    const { size } = req.body;

    const product = await Products.findOne({ _id: productId });
    const userCart = await Cart.findOne({ userId: userId });

    const maxStock = product.sizes[size];

    if (userCart) {
      const itemIndex = userCart.item.findIndex(
        (item) => item.product.toString() === productId && item.size === size
      );

      if (itemIndex >= 0) {
        const currentQuantity = userCart.item[itemIndex].quantity;
        const newQuantity = currentQuantity + 1;

        if (newQuantity > maxStock) {
          return res
            .status(400)
            .json({ success: false, message: "Exceeds available stock" });
        }
        const newPrice = newQuantity * product.price;
        // If item with the same size exists in the cart, update its quantity and price
        const update = {
          $set: { "item.$.quantity": newQuantity, "item.$.price": newPrice },
          $inc: { totalQty: 1, totalPrice: product.price },
        };

        await Cart.updateOne(
          { userId: userId, "item.product": productId, "item.size": size },
          update
        );
      } else {
        if (1 > maxStock) {
          return res
            .status(400)
            .json({ success: false, message: "Exceeds available stock" });
        }
        // If item with the same size does not exist, add it to the cart
        const newItem = {
          product: productId,
          price: product.price,
          quantity: 1,
          size: size,
        };

        const updates = [
          {
            updateOne: {
              filter: { userId: userId },
              update: {
                $push: { item: newItem },
                $inc: { totalQty: 1, totalPrice: product.price },
              },
            },
          },
        ];
        await Cart.bulkWrite(updates);
      }
    } else {
      if (1 > maxStock) {
        return res
          .status(400)
          .json({ success: false, message: "Exceeds available stock" });
      }

      const newCart = {
        userId: userId,
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
      };

      await Cart.create(newCart);
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};
const removeCartItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    console.log("Received itemId:", itemId);

    const userId = req.session.user._id;
    console.log("Received userId:", userId);

    // Ensure userId and itemId are valid ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId or itemId" });
    }

    const itemObjectId = new mongoose.Types.ObjectId(itemId);

    // Find the cart to ensure it exists and log it
    const cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }
    console.log("Cart before removal:", JSON.stringify(cart, null, 2));

    // Ensure item exists in the cart
    const itemExists = cart.item.some((item) => item._id.equals(itemObjectId));
    if (!itemExists) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // Update the cart by removing the specified item
    const updatedCart = await Cart.findOneAndUpdate(
      { userId: userId },
      { $pull: { item: { _id: itemObjectId } } },
      { new: true }
    );

    if (!updatedCart) {
      return res
        .status(404)
        .json({ success: false, message: "Failed to update cart" });
    }

    console.log(
      "User's cart after removal:",
      JSON.stringify(updatedCart, null, 2)
    );

    res.json({
      success: true,
      message: "Item removed successfully",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ success: false, message: "Failed to remove item" });
  }
};
const loadCheckOut = async (req, res) => {
  let totalPrice = 0;
  let userId = new ObjectId(req.session.user._id);
  const user = await User.findOne({ _id: userId });
  const today = new Date();
  const coupon = await Coupon.find({
    expiryDate: { $gte: today },
    usedBy: { $nin: [userId] },
    percentage: { $exists: true },
  });

  // Check if there is a pending order in the session
  const pendingOrder = req.session.pendingOrder;
  if (pendingOrder) {
    totalPrice = pendingOrder.totalPrice;
    console.log(pendingOrder);
    totalPrice = pendingOrder.totalPrice;
    const discountPercentage = pendingOrder.discountPercentage;

    // Calculate discount amount
    const discountAmount = (totalPrice * discountPercentage) / 100;

    const addressData = await Address.find({
      userId: userId,
      is_deleted: false,
    }).sort({
      created_at: -1,
    });

    res.render("checkout", {
      userData: user,
      items: pendingOrder.item,
      totalPrice,
      addresses: addressData,
      coupon,
      pendingOrder: true,
      shippingCharge: pendingOrder.shippingCharge,
      Discount: discountAmount,
    });

    // Clear the pending order from the session
    delete req.session.pendingOrder;
  } else {
    const cartData = await Cart.aggregate([
      {
        $match: {
          userId: userId,
        },
      },
      {
        $unwind: "$item",
      },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "item.product",
        },
      },
      {
        $unwind: "$item.product",
      },
      {
        $lookup: {
          from: "categories",
          localField: "item.product.category",
          foreignField: "_id",
          as: "item.product.category",
        },
      },
      {
        $unwind: "$item.product.category",
      },
    ]);

    if (cartData.length > 0) {
      for (let i = 0; i < cartData.length; i++) {
        totalPrice +=
          cartData[i].item.product.price * cartData[i].item.quantity;
      }

      const addressData = await Address.find({
        userId: userId,
        is_deleted: false,
      }).sort({
        created_at: -1,
      });
      console.log(cartData);

      res.render("checkout", {
        userData: user,
        items: cartData.map((cart) => cart.item),
        totalPrice: cartData[0].totalPrice,
        addresses: addressData,
        coupon,
        shippingCharge: cartData[0].shippingCharge,
      });
    } else {
      res.redirect("/cart");
    }
  }
};

const decrementOrIncrementCart = async (req, res) => {
  try {
    const cartId = req.body.cartId;
    const itemId = req.body.itemId;
    const value = parseInt(req.body.value);

    const cartDoc = await Cart.findOne({ _id: cartId });
    const item = cartDoc.item.find((i) => i._id.toString() === itemId);
    const product = await Products.findOne({ _id: item.product });

    // Calculate updated quantity
    const updatedQuantity = item.quantity + value;
    let updatedPrice;

    // Check if the updated quantity is within the available stock
    if (updatedQuantity > product.sizes[item.size]) {
      return res
        .status(400)
        .json({ error: "Quantity exceeds available stock." });
    }

    // If quantity becomes zero or negative, remove the item from the cart
    if (updatedQuantity <= 0) {
      await Cart.updateOne(
        { _id: cartId },
        { $pull: { item: { _id: new ObjectId(item._id) } } }
      );
      updatedPrice = 0;
    } else {
      updatedPrice = updatedQuantity * product.price; // Calculate price based on updated quantity
    }

    // Calculate the difference in price caused by quantity change
    const priceDifference = updatedPrice - item.quantity * product.price;

    // Update the cart item if quantity is within valid range
    if (updatedQuantity > 0) {
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

    // Fetch updated cart data
    const updatedCart = await Cart.findOne({ _id: cartId });

    // Calculate total price of the cart by summing up the prices of all items
    const totalCartPrice = updatedCart.item.reduce(
      (acc, cur) => acc + cur.price,
      0
    );

    const totalQty = updatedCart.item.reduce(
      (acc, cur) => acc + cur.quantity,
      0
    );

    // Update the total price of the cart
    await Cart.updateOne(
      { _id: cartId },
      { $set: { totalPrice: totalCartPrice, totalQty: totalQty } }
    );

    res.json({
      success: true,
      qty: updatedQuantity,
      price: updatedPrice,
      totalprice: totalCartPrice,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  decrementOrIncrementCart,
  loadCart,
  addcart,
  removeCartItem,
  loadCheckOut,
};
