// services/orderService.js

const User = require("../models/userModel.js");
const Cart = require("../models/cartModel.js");
const Coupon = require("../models/couponModel.js");
const Wallet = require("../models/walletModel.js");
const Address = require("../models/addressmodel.js");
const Orders = require("../models/orderModel.js");
const Products = require("../models/productModel.js");
const WishList = require("../models/wishlistModel.js");
const nodemailer = require("nodemailer");
const Otp = require("../models/otpModel.js");
const { formatDate } = require("../utils/formDate.js");
const { generateReferralCode } = require("../utils/generateReferralCode.js");
const { securePassword } = require("../utils/securePassword.js");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const ObjectId = mongoose.Types.ObjectId;
const dotenv = require("dotenv");
dotenv.config();

const saltRounds = 10;

const loginService = async (email, password) => {
  let emailError = "";
  let passwordError = "";

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    emailError = "Email not found";
    return { success: false, emailError, passwordError };
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    passwordError = "Wrong password";
    return { success: false, emailError, passwordError };
  }

  // Check if user is valid (not admin or blocked)
  if (user.is_admin === 0 && user.is_blocked === false) {
    // ✅ Success case
    return { success: true, user, emailError, passwordError };
  } else {
    passwordError = "You are not a user";
    return { success: false, emailError, passwordError };
  }
};
const saveOtpToDB = async (email, otp) => {
  await Otp.deleteMany({ email }); // clear old otp
  const newOtp = new Otp({ email, otp });
  await newOtp.save();
};

async function sendOtpMail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        // TODO: replace `user` and `pass` values from <https://forwardemail.net>
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        // Reject unauthorized servers or not
        rejectUnauthorized: true,
        secure: true, // Change to true in production
      },
    });
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "Your OTP for user verification",
      text: `Your OTP is ${otp}. Please enter this code to verify your account.`,
    };

    const result = await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
  }
}

const verifyOtpService = async (req, enteredOtp) => {
  const { refCode, saveOtp, name, email, password } = req.session;

  const userExist = await User.find({ referralcode: refCode });

  // Helper to create a new user
  const createUser = async (walletAmount = 0) => {
    const referralCode = generateReferralCode(8);
    const securedPassword = await securePassword(password);
    const referralLink = `https://www.example.com/signup?ref=${referralCode}`;

    const newUser = new User({
      name,
      email,
      password: securedPassword,
      referralcode: referralCode,
      referralLink,
      wallet: walletAmount,
    });

    await newUser.save();

    req.session.user = newUser._id;
    req.session.loginSuccess = true;
    req.session.save();

    return { success: true };
  };

  // If referral code doesn’t exist
  if (userExist.length === 0) {
    if (enteredOtp === saveOtp) {
      return await createUser();
    } else {
      return { success: false, message: "Incorrect OTP" };
    }
  }

  // Referral code exists
  const referredUser = userExist[0];
  const updatedWalletAmount = referredUser.wallet + 100;

  await User.findByIdAndUpdate(referredUser._id, {
    $set: { wallet: updatedWalletAmount },
  });

  const topUpTransaction = new Wallet({
    userId: referredUser._id,
    transactionType: "Credited",
    amount: 100,
  });

  await topUpTransaction.save();

  if (enteredOtp === saveOtp) {
    return await createUser(100);
  } else {
    return { success: false, message: "Incorrect OTP" };
  }
};

const changePasswordService = async (
  userId,
  oldPassword,
  newPassword,
  confirmPassword
) => {
  try {
    // 1️⃣ Find user
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // 2️⃣ Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return { success: false, message: "Old password is incorrect" };

    // 3️⃣ Validate new password confirmation
    if (newPassword !== confirmPassword)
      return { success: false, message: "New passwords do not match" };

    // 4️⃣ Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Error in changePasswordService:", error.message);
    throw error;
  }
};

const getHomeData = async (userId) => {
  // Fetch the user data
  const user = await User.findOne({ _id: userId });

  // Fetch the products data (not deleted and sorted by creation date)
  const products = await Products.find({ isDeleted: false }).sort({
    created_at: -1,
  });

  return { user, products };
};

const getUserById = async (userId) => {
  if (!userId) throw new Error("User ID not found in session");
  const user = await User.findOne({ _id: userId });
  return user;
};

const updateUserName = async (userId, newName) => {
  if (!userId) throw new Error("User not logged in");
  await User.findOneAndUpdate(
    { _id: userId },
    { $set: { name: newName } },
    { new: true }
  );
};

const updateUserSecondName = async (userId, newSecondName) => {
  if (!userId) throw new Error("User not logged in");
  await User.findOneAndUpdate(
    { _id: userId },
    { $set: { sname: newSecondName } },
    { new: true }
  );
};

const getUserAddresses = async (userId) => {
  if (!userId) throw new Error("User ID not found in session");

  const addresses = await Address.find({
    userId: userId,
    is_deleted: false,
  });

  return addresses;
};

// Add a new address
const addNewAddress = async (userId, addressData) => {
  const newAddress = new Address({
    userId,
    phone: addressData.phone,
    address: addressData.address,
    postcode: addressData.postcode,
    country: addressData.country,
    state: addressData.state,
  });
  return await newAddress.save();
};

const softDeleteAddress = async (addressId) => {
  return await Address.findByIdAndUpdate(
    addressId,
    { $set: { is_deleted: true } },
    { new: true }
  );
};
// Get an address by ID
const getAddressById = async (id) => {
  return await Address.findById(id);
};

// Edit an existing address
const updateAddress = async (addressId, addressData) => {
  return await Address.findByIdAndUpdate(
    addressId,
    {
      $set: {
        phone: addressData.phone,
        address: addressData.address,
        postcode: addressData.postcode,
        country: addressData.country,
        state: addressData.state,
      },
    },
    { new: true }
  );
};

const getUserOrdersWithBreakdown = async (userId) => {
  const orders = await Orders.find({ userId })
    .populate("item.product")
    .sort({ orderDate: -1 });

  const ordersWithBreakdown = orders.map((order) => {
    if (order.couponId) {
      const originalPrice = order.item.reduce((sum, item) => {
        return sum + item.price * item.quantity;
      }, 0);
      const discountAmount = (originalPrice * order.discountPercentage) / 100;
      const discountedPrice = originalPrice - discountAmount;

      return {
        ...order.toObject(),
        originalPrice,
        discountAmount,
        discountedPrice,
      };
    }
    return order.toObject();
  });

  return ordersWithBreakdown;
};

/**
 * Cancel an order item and restock product
 */
const cancelOrderItem = async (orderId, productId) => {
  const order = await Orders.findById(orderId);

  if (!order) throw new Error("Order not found");

  const itemToCancel = order.item.find(
    (item) => item.product.toString() === productId
  );

  if (!itemToCancel) throw new Error("Item not found in order");

  // Update item status
  itemToCancel.status = "Cancelled";
  await order.save();

  // Restock the product
  const product = await Products.findById(productId);
  if (!product) throw new Error("Product not found");

  const size = itemToCancel.size?.toLowerCase();
  if (size && product.sizes[size] !== undefined) {
    product.sizes[size] += itemToCancel.quantity;
  } else {
    product.quantity += itemToCancel.quantity; // For products without size
  }

  await product.save();

  return true;
};

const placeOrder = async ({
  addressId,
  paymentMethod,
  wallet,
  couponId,
  userId,
}) => {
  let totalPrice = 0;
  const objectUserId = new ObjectId(userId);

  const userData = await User.findById(objectUserId);

  // Fetch and calculate cart total
  const cartData = await Cart.aggregate([
    { $match: { userId: objectUserId } },
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
  ]);

  for (const item of cartData) {
    totalPrice += item.item.product.price * item.item.quantity;
  }

  // Apply coupon discount
  let discountPercentage = 0;
  if (couponId) {
    const couponData = await Coupon.findById(couponId);
    if (couponData) {
      discountPercentage = couponData.percentage;
      totalPrice -= (totalPrice * discountPercentage) / 100;
      await Coupon.findByIdAndUpdate(couponId, {
        $push: { usedBy: objectUserId },
      });
    }
  }

  // Deduct wallet amount
  const walletAmountUsed = Math.min(wallet, totalPrice);
  totalPrice -= walletAmountUsed;

  if (walletAmountUsed > 0) {
    await User.findByIdAndUpdate(objectUserId, {
      $set: { wallet: userData.wallet - walletAmountUsed },
    });

    const walletTransaction = new Wallet({
      userId: objectUserId,
      transactionType: "Debited",
      amount: walletAmountUsed,
    });

    await walletTransaction.save();
  }

  // Fetch address and create order
  const addressData = await Address.findById(addressId);
  const orderData = new Orders({
    userId: objectUserId,
    item: [],
    totalPrice,
    address: addressData,
    paymentType: paymentMethod,
    discountPercentage,
  });

  // Add items to order
  for (const item of cartData) {
    orderData.item.push({
      product: item.item.product._id,
      quantity: item.item.quantity,
      price: item.item.product.price,
      size: item.item.size,
    });
  }

  await orderData.save();

  // Delete cart
  await Cart.deleteOne({ userId: objectUserId });

  // Update product stock
  const updates = cartData.map((cartItem) => ({
    updateOne: {
      filter: { _id: cartItem.item.product._id },
      update: {
        $inc: {
          [`sizes.${cartItem.item.size}`]: -cartItem.item.quantity,
        },
      },
    },
  }));

  await Products.bulkWrite(updates);

  return orderData;
};
const requestProductReturn = async (orderId, productId, reason) => {
  const order = await Orders.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  const product = order.item.find((p) => p.product.equals(productId));
  if (!product) {
    throw new Error("Product not found in order");
  }

  product.status = "return_requested";
  product.reason = reason;

  await order.save();
  return true;
};

const createPendingOrderService = async (reqBody, sessionUser) => {
  try {
    let totalPrice = 0;
    const { addressId, paymentMethod, wallet, couponId } = reqBody;
    const userId = new ObjectId(sessionUser._id);

    // Fetch user and cart
    const userData = await User.findOne({ _id: userId });
    const cartData = await Cart.aggregate([
      { $match: { userId: userId } },
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
    ]);

    // Calculate total
    for (const cartItem of cartData) {
      totalPrice += cartItem.item.product.price * cartItem.item.quantity;
    }

    // Apply coupon (if any)
    let discountPercentage = 0;
    if (couponId) {
      const couponData = await Coupon.findById(couponId);
      if (couponData) {
        discountPercentage = couponData.percentage;
        totalPrice -= (totalPrice * discountPercentage) / 100;
        await Coupon.findByIdAndUpdate(couponId, { $push: { usedBy: userId } });
      }
    }

    // Get address
    const addressData = await Address.findOne({ _id: addressId });

    // Create new order
    const orderData = new Orders({
      userId,
      item: [],
      totalPrice,
      address: addressData,
      paymentType: paymentMethod,
      discountPercentage,
      orderStatus: "pending",
    });

    // Populate items
    for (const cartItem of cartData) {
      orderData.item.push({
        product: cartItem.item.product._id,
        quantity: cartItem.item.quantity,
        price: cartItem.item.product.price,
        size: cartItem.item.size,
        status: "pending",
      });
    }

    // Save order and clear cart
    await orderData.save();
    await Cart.deleteOne({ userId });

    // Update product stock
    const updates = cartData.map((cartItem) => ({
      updateOne: {
        filter: { _id: cartItem.item.product._id },
        update: {
          $inc: { [`sizes.${cartItem.item.size}`]: -cartItem.item.quantity },
        },
      },
    }));
    await Products.bulkWrite(updates);

    return { success: true, orderData };
  } catch (error) {
    console.error("Error in createPendingOrderService:", error.message);
    throw error;
  }
};
const applyCouponService = async (userId, couponId) => {
  try {
    const couponData = await Coupon.findById({ _id: couponId });
    if (!couponData) {
      throw new Error("Coupon not found");
    }

    // Mark the coupon as used by the user
    await Coupon.findByIdAndUpdate(couponId, { $push: { usedBy: userId } });

    const percentage = couponData.percentage;

    // Apply the coupon to the user's order
    await Orders.findOneAndUpdate(
      { userId: userId },
      {
        $set: { discountPercentage: percentage, couponId: couponId },
      },
      { new: true, upsert: true }
    );

    return percentage;
  } catch (error) {
    console.error("Error in applyCouponService:", error.message);
    throw error;
  }
};
const cancelCouponSelectionService = async (userId, selectedCouponId) => {
  try {
    const couponData = await Coupon.findById(selectedCouponId);
    if (!couponData) {
      throw new Error("Coupon not found");
    }

    // Remove user from the coupon's used list
    await Coupon.findByIdAndUpdate(selectedCouponId, {
      $pull: { usedBy: userId },
    });

    // Fetch the user's cart
    const userCart = await Cart.findOne({ userId });
    if (!userCart) {
      throw new Error("Cart not found");
    }

    // Calculate the new total price
    const percentage = couponData.percentage;
    const totalPrice = userCart.totalPrice;
    const updatedTotalPrice = Math.round(totalPrice / (1 - percentage / 100));

    // Update the cart with the new total
    userCart.totalPrice = updatedTotalPrice;
    await userCart.save();

    return { updatedTotalPrice };
  } catch (error) {
    console.error("Error in cancelCouponSelectionService:", error.message);
    throw error;
  }
};
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const createRazorpayOrder = async (amount) => {
  try {
    const options = {
      amount: amount * 100, // amount in paisa
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return {
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_sHq1xf34I99z5x",
      amount: order.amount,
      order_id: order.id,
    };
  } catch (error) {
    console.error("Error in createRazorpayOrder:", error.message);
    throw error;
  }
};

const captureRazorpayPayment = async ({
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
  amount,
}) => {
  try {
    // Fetch payment details
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    // If already captured
    if (paymentDetails.status === "captured") {
      return { status: "success", payment: paymentDetails };
    }

    // Capture the payment
    const payment = await razorpay.payments.capture(
      razorpay_payment_id,
      amount
    );

    // Verify signature
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_SECRET || "kgjoNUSGoxu5oxGXgImjBG7i"
      )
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      return { status: "success", payment };
    } else {
      return { status: "failed", message: "Invalid signature" };
    }
  } catch (error) {
    console.error("Error in captureRazorpayPayment:", error.message);
    throw error;
  }
};
const getOrderById = async (orderId) => {
  const order = await Orders.findById(orderId).populate("item.product").exec();
  return order;
};
const validateOrderStatus = (order) => {
  if (!order) {
    return { valid: false, message: "Order not found", status: 404 };
  }

  if (order.orderStatus !== "pending") {
    return { valid: false, message: "Order is not pending", status: 400 };
  }

  return { valid: true };
};

const getWishlistData = async (userId) => {
  return await WishList.aggregate([
    {
      $match: {
        userId: new ObjectId(userId),
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
    {
      $group: {
        _id: "$_id",
        userId: { $first: "$userId" },
        items: { $push: "$item" },
      },
    },
  ]);
};
const getProductWithCategory = async (productId) => {
  return await Products.aggregate([
    {
      $match: { _id: new ObjectId(productId) },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: "$categoryDetails",
    },
  ]);
};
const findUserWishlist = async (userId) => {
  return await Wishlist.findOne({ userId });
};

/**
 * Add an item to an existing wishlist
 */
const addItemToWishlist = async (userId, productId) => {
  return await Wishlist.updateOne(
    { userId: new ObjectId(userId) },
    { $push: { item: { product: productId } } }
  );
};

/**
 * Create a new wishlist with the given product
 */
const createWishlist = async (userId, productId) => {
  return await Wishlist.create({
    userId,
    item: [{ product: productId }],
  });
};

/**
 * Remove an item from the wishlist
 */
const removeWishlistItem = async (userId, itemId) => {
  return await Wishlist.updateOne(
    { userId },
    { $pull: { item: { product: itemId } } }
  );
};

const getWalletDataByUserId = async (userId) => {
  const walletData = await Wallet.find({ userId });

  // Format the timestamp using reusable util
  const formattedWalletDates = walletData.map((wallet) => ({
    ...wallet.toObject(),
    formattedDate: formatDate(wallet.timestamp),
  }));

  return formattedWalletDates;
};
module.exports = {
  placeOrder,
  saveOtpToDB,
  sendOtpMail,
  verifyOtpService,
  loginService,
  getHomeData,
  getUserById,
  updateUserName,
  updateUserSecondName,
  getUserAddresses,
  addNewAddress,
  getAddressById,
  updateAddress,
  softDeleteAddress,
  cancelOrderItem,
  getUserOrdersWithBreakdown,
  requestProductReturn,
  changePasswordService,
  createPendingOrderService,
  applyCouponService,
  cancelCouponSelectionService,
  createRazorpayOrder,
  captureRazorpayPayment,
  getOrderById,
  validateOrderStatus,
  getWishlistData,
  getProductWithCategory,
  findUserWishlist,
  addItemToWishlist,
  createWishlist,
  removeWishlistItem,
  getWalletDataByUserId,
};
