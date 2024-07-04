const User = require("../models/userModel");
console.log(User);
const Products = require("../models/productModel");
console.log(Products);
const Address = require("../models/addressmodel");
const Orders = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const Wishlist = require("../models/wishlistModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const ObjectId = mongoose.Types.ObjectId;

const saltRounds = 10;

/*========================
=========signup===========
==========================*/
let saveOtp;
let name;
let email;
let password;
let refCode;

const sendOtp = async (req, res) => {
  try {
    const emailExist = await User.findOne({
      email: req.body.email ? req.body.email : email,
    });
    if (!emailExist) {
      if (!saveOtp) {
        let generatedOtp = generateOTP();
        saveOtp = generatedOtp;
        name = req.body.name ? req.body.name : name;
        email = req.body.email ? req.body.email : email;
        password = req.body.password ? req.body.password : password;
        refCode = req.body.referral;
        console.log(req.body);
        sendOtpMail(email, generatedOtp);
        res.render("otpForm", { footer: "" });
        setTimeout(() => {
          saveOtp = null;
        }, 60 * 1000);
      } else {
        res.render("otpForm", { footer: "" });
      }
    } else {
      res.render("sign-up", { footer: "Userdata already exists" });
    }
  } catch (error) {
    res.render("error", { message: "Something went wrong in sending OTP" });
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    return passwordHash;
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in hashing password",
    });
  }
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

const verifyOtp = async (req, res) => {
  const userExist = await User.find({ referralcode: refCode });
  if (userExist.length == 0) {
    const EnteredOtp = req.body.otp;
    if (EnteredOtp === saveOtp) {
      const referralCode = generateReferralCode(8);
      const securedPassword = await securePassword(password);
      const referralLink = `https://www.example.com/signup?ref=${referralCode}`;
      const newUser = new User({
        name: name,
        email: email,
        password: securedPassword,
        referralcode: referralCode,
        referralLink: referralLink,
      });
      req.session.user = newUser._id;
      req.session.loginSuccess = true;
      req.session.save();
      await newUser.save();
      res.redirect("/home");
    } else {
      res.render("otpForm", { footer: "Incorrect OTP" });
    }
  } else {
    const referredUserId = userExist[0]._id;
    let existingWalletAmount = userExist[0].wallet;
    let updatedWalletAmount = existingWalletAmount + 100;
    await User.findByIdAndUpdate(referredUserId, {
      $set: { wallet: updatedWalletAmount },
    });

    // Create a wallet transaction for the credit
    const topUpTransaction = new Wallet({
      userId: referredUserId,
      transactionType: "Credited",
      amount: 100,
    });

    await topUpTransaction.save();
    const EnteredOtp = req.body.otp;
    if (EnteredOtp === saveOtp) {
      const referralCode = generateReferralCode(8);
      const securedPassword = await securePassword(password);
      const referralLink = `https://www.example.com/signup?ref=${referralCode}`;
      const newUser = new User({
        name: name,
        email: email,
        password: securedPassword,
        referralcode: referralCode,
        referralLink: referralLink,
        wallet: 100,
      });
      await newUser.save();
      req.session.user = newUser._id;
      req.session.loginSuccess = true;
      req.session.save();
      res.redirect("/home");
    } else {
      res.render("otpForm", { footer: "Incorrect OTP" });
    }
  }
};

function generateReferralCode(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

const renderSignup = (req, res) => {
  res.render("sign-up", { footer: "" });
};

/*========================
===========OTP============
==========================*/

const renderOtp = (req, res) => {
  res.render("otpForm", { footer: "" });
};

function generateOTP() {
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}
const resendOtp = async (req, res) => {
  try {
    const email = req.query.email;
    await otpcreation.sendemail(req, res, email);
    res.render("otpForm", { email: email });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Re-sending OTP" });
  }
};
/*========================
===========Login============
==========================*/
const renderLogin = (req, res) => {
  let emailError = "";
  let passwordError = "";

  res.render("login", { emailError, passwordError });
};
const checkLoggedIn = (req, res, next) => {
  if (req.session.loginSuccess) {
    res.redirect("/home"); // Redirect to dashboard if logged in
  } else {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // Add cache control headers
    next(); // Continue to the next middleware/route handler
  }
};

const login = async (req, res) => {
  try {
    const check = await User.findOne({
      email: req.body.email,
    });
    console.log(req.body.email);
    console.log(check);

    let emailError = "";
    let passwordError = "";

    if (!check) {
      emailError = "Email not found";
    } else {
      const productdata = await Products.find({ isDeleted: false }).sort({
        created_at: -1,
      });
      const passmatch = await bcrypt.compare(req.body.password, check.password);
      console.log(passmatch);
      if (!passmatch) {
        passwordError = "Wrong password";
      } else if (check.is_admin === 0 && check.is_blocked === false) {
        req.session.user = check;
        console.log("session user is", req.session.user);
        req.session.loginSuccess = true;
        return res.redirect("/home");
      } else {
        passwordError = "You are not a user";
      }
    }

    res.render("login", { emailError, passwordError });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Login" });
  }
};

/*========================
===========Home===========
==========================*/

const renderHome = async (req, res) => {
  if (req.session.loginSuccess) {
    const id = req.session.user._id;
    console.log("from hemoe:", req.session);
    const user = await User.findOne({ _id: id });
    const productdata = await Products.find({ isDeleted: false }).sort({
      created_at: -1,
    });
    res.render("home", { products: productdata, user: user });
  }
};

/*========================
=======User Profile=======
==========================*/
const loadMyAccount = async (req, res) => {
  try {
    console.log("helloooo");
    console.log(req.session.user);
    let session = req.session.user;
    const user = await User.findOne({ _id: session });
    console.log("this is user:", user);

    res.render("userProfile", { user: user, message: "" });
  } catch (error) {
    res.render("error", { message: "Something went wrong in loading account" });
  }
};
const editName = async (req, res) => {
  try {
    let user = req.session.user;
    let firstName = req.body.name;
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { name: firstName } },
      { new: true } // This option returns the document after update was applied
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Editing name" });
  }
};
const editsName = async (req, res) => {
  try {
    let user = req.session.user;
    let firstName = req.body.sname;
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { sname: firstName } },
      { new: true } // This option returns the document after update was applied
    );

    res.status(200).json({ message: "Name updated successfully" });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in Editing second name",
    });
  }
};

/*========================
====Address management====
==========================*/
const userAddress = async (req, res) => {
  try {
    const id = req.session.user._id;
    const address = await Address.find({ userId: id, is_deleted: false });
    res.render("addressManagement", { addresses: address });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Useraddress" });
  }
};
const renderAddaddress = (req, res) => {
  res.render("address");
};
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(req.body);
    const newAddress = new Address({
      userId: userId,
      phone: req.body.phone,
      address: req.body.address,
      postcode: req.body.postcode,
      country: req.body.country,
      state: req.body.state,
    });

    const savedAdress = await newAddress.save();

    res.redirect("/addressmanagement");
  } catch (err) {
    res.render("error", {
      message: "Something went wrong in adding new address",
    });
  }
};

const renderEditAddress = async (req, res) => {
  try {
    const id = req.query._id;
    const addressData = await Address.findById({ _id: id });
    if (addressData) {
      res.render("editAddress", { address: addressData });
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading edit address",
    });
  }
};
const editAddress = async (req, res) => {
  try {
    const addressId = req.query._id;
    console.log(addressId);
    console.log(req.body);

    const { phone, address, postcode, country, state } = req.body;
    const newAddress = await Address.findByIdAndUpdate(
      { _id: addressId },
      {
        $set: {
          phone: phone,
          address: address,
          postcode: postcode,
          country: country,
          state: state,
        },
      }
    );

    res.redirect("/addressmanagement");
  } catch (error) {
    res.render("error", { message: "Something went wrong in editing address" });
  }
};
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query._id;
    const address = await Address.findByIdAndUpdate(
      { _id: addressId },
      { $set: { is_deleted: true } }
    );
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in deleting address",
    });
  }
};
/*==================================
======= ADDRESS FROM CHECKOUT=======
===================================*/

const newAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log(req.body);
    const newAddress = new Address({
      userId: userId,
      phone: req.body.phone,
      address: req.body.address,
      postcode: req.body.postcode,
      country: req.body.country,
      state: req.body.state,
    });

    const savedAdress = await newAddress.save();

    res.redirect("/checkout");
  } catch (err) {
    res.render("error", {
      message: "Something went wrong in adding new address",
    });
  }
};

/*==================================
=======User orders==================
===================================*/

const showOrder = async (req, res) => {
  try {
    const id = req.session.user._id;
    console.log(id);
    const orderdata = await Orders.find({ userId: id })
      .populate("item.product")
      .sort({ orderDate: -1 });

    console.log(orderdata);
    res.render("userOrder", { orders: orderdata });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Showing orders" });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const productId = req.query.productId;
    console.log(orderId);

    const order = await Orders.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const itemToCancel = order.item.find(
      (item) => item.product.toString() === productId
    );

    if (!itemToCancel) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    itemToCancel.status = "Cancelled";

    await order.save();

    // Calculate the amount to credit back to the wallet
    const cancelledProductPrice = itemToCancel.price;
    const totalAmountToCredit = parseFloat(cancelledProductPrice);

    const topUpTransaction = new Wallet({
      userId: order.userId,
      transactionType: "Credited",
      amount: totalAmountToCredit,
    });

    await topUpTransaction.save();

    // Update user's wallet by adding the credited amount

    const user = await User.findOneAndUpdate(
      { _id: req.session.user._id },
      { $inc: { wallet: totalAmountToCredit } },
      { new: true }
    );
    await user.save();

    // Redirect with a query parameter to indicate success
    return res.redirect("/showorders?cancelSuccess=true");
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in Cancelling order",
    });
  }
};

const renderReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.query;
    res.render("returnForm", { orderId, productId });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading return form",
    });
  }
};

const returnProduct = async (req, res) => {
  try {
    const { orderId, productId, reason } = req.body;
    console.log(
      `Received return request for orderId: ${orderId}, productId: ${productId}, reason: ${reason}`
    );

    const order = await Orders.findById(orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return res.status(404).json({ message: "Order not found" });
    }

    const product = order.item.find((p) => p.product.equals(productId));
    if (!product) {
      console.error(`Product not found in order: ${productId}`);
      return res.status(404).json({ message: "Product not found in order" });
    }

    product.status = "return_requested";
    product.reason = reason;

    await order.save();
    console.log("Order updated and saved successfully");

    res.status(201).json({ success: true });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in Returning product",
    });
  }
};

/*==================================
=======Change Password=============
===================================*/

const changePassword = async (req, res) => {
  try {
    const id = req.session.user._id;
    const userdata = await User.findById({ _id: id });

    res.render("changepassword", { user: userdata });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading change password",
    });
  }
};
const changeNewPasssword = async (req, res) => {
  try {
    const id = req.session.user._id;
    console.log(req.body);
    const { password, newpassword, conpassword } = req.body;
    const user = await User.findById(id);
    const oldpass = user.password;
    const passwordMatch = await bcrypt.compare(password, oldpass);
    if (!passwordMatch) {
      return res.status(400).json({ success: false });
    }
    if (newpassword == conpassword) {
      const hashedpass = await bcrypt.hash(newpassword, saltRounds);
      const userdata = await User.findByIdAndUpdate(
        { _id: id },
        {
          $set: {
            password: hashedpass,
          },
        }
      );
    }

    res.status(201).json({ success: true });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in changing password",
    });
  }
};

/*==================================
=======Place order==================
===================================*/

const placeOrder = async (req, res) => {
  try {
    let totalPrice = 0;
    const addressId = req.body.addressId;
    const paymentMethod = req.body.paymentMethod;
    const wallet = parseInt(req.body.wallet, 10);
    const userId = new ObjectId(req.session.user._id);
    const userData = await User.findOne({ _id: userId });

    // Calculate the total price before wallet and coupon
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
    ]);

    for (let i = 0; i < cartData.length; i++) {
      totalPrice += cartData[i].item.product.price * cartData[i].item.quantity;
    }

    // Apply coupon discount if any
    const couponId = req.body.couponId;
    let discountPercentage = 0;
    if (couponId) {
      const couponData = await Coupon.findById({ _id: couponId });
      discountPercentage = couponData.percentage;
      totalPrice = totalPrice - (totalPrice * discountPercentage) / 100;
      await Coupon.findByIdAndUpdate(couponId, { $push: { usedBy: userId } });
    }

    // Deduct wallet amount if applicable
    const walletAmountUsed = Math.min(wallet, totalPrice);
    totalPrice -= walletAmountUsed;

    // Save wallet transaction if any amount is used
    if (walletAmountUsed > 0) {
      const update = await User.findByIdAndUpdate(userId, {
        $set: { wallet: userData.wallet - walletAmountUsed },
      });

      const walletTransaction = new Wallet({
        userId: userId,
        transactionType: "Debited",
        amount: walletAmountUsed,
      });

      await walletTransaction.save();
    }

    const addressData = await Address.findOne({ _id: addressId });
    const orderData = new Orders({
      userId: userId,
      item: [],
      totalPrice: totalPrice,
      address: addressData,
      paymentType: paymentMethod,
      discountPercentage: discountPercentage,
    });

    // Populate orderData.item with cartData items
    for (let i = 0; i < cartData.length; i++) {
      orderData.item.push({
        product: cartData[i].item.product._id,
        quantity: cartData[i].item.quantity,
        price: cartData[i].item.product.price,
        size: cartData[i].item.size,
      });
    }

    // Save the order instance
    await orderData.save();
    const deleteCart = await Cart.deleteOne({ userId: userId });

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
    console.log("fom place order:", orderData);

    req.session.orderData = orderData;

    res.render("orderSuccess", { orderdata: orderData });
  } catch (error) {
    console.log(error);
    res.render("orderFailure");
  }
};

const createPendingOrder = async (req, res) => {
  try {
    let totalPrice = 0;
    const addressId = req.body.addressId;
    const paymentMethod = req.body.paymentMethod;
    const wallet = parseInt(req.body.wallet, 10);
    const userId = new ObjectId(req.session.user._id);
    const userData = await User.findOne({ _id: userId });

    // Calculate the total price before wallet and coupon
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
    ]);

    for (let i = 0; i < cartData.length; i++) {
      totalPrice += cartData[i].item.product.price * cartData[i].item.quantity;
    }

    // Apply coupon discount if any
    const couponId = req.body.couponId;
    let discountPercentage = 0;
    if (couponId) {
      const couponData = await Coupon.findById({ _id: couponId });
      discountPercentage = couponData.percentage;
      totalPrice = totalPrice - (totalPrice * discountPercentage) / 100;
      await Coupon.findByIdAndUpdate(couponId, { $push: { usedBy: userId } });
    }

    const addressData = await Address.findOne({ _id: addressId });
    const orderData = new Orders({
      userId: userId,
      item: [],
      totalPrice: totalPrice,
      address: addressData,
      paymentType: paymentMethod,
      discountPercentage: discountPercentage,
      orderStatus: "pending",
    });

    // Populate orderData.item with cartData items
    for (let i = 0; i < cartData.length; i++) {
      orderData.item.push({
        product: cartData[i].item.product._id,
        quantity: cartData[i].item.quantity,
        price: cartData[i].item.product.price,
        size: cartData[i].item.size,
        status: "pending",
      });
    }

    // Save the order instance
    await orderData.save();
    const deleteCart = await Cart.deleteOne({ userId: userId });

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
    console.log("fom place order:", orderData);

    req.session.orderData = orderData;

    res.json({ success: false });
  } catch (error) {
    console.log(error);
    res.render("orderFailure");
  }
};

/*==================================
===========Coupon==================
===================================*/

const applyCoupon = async (req, res) => {
  const userId = req.session.user._id;
  const couponId = req.body.couponId;
  const couponData = await Coupon.findById({ _id: couponId });
  await Coupon.findByIdAndUpdate(couponId, { $push: { usedBy: userId } });
  const percentage = couponData.percentage;

  const order = await Orders.findOneAndUpdate(
    { userId: userId },
    { $set: { discountPercentage: percentage, couponId: couponId } },
    { new: true, upsert: true }
  );
  res.json(percentage);
};

const cancelSelection = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const selectedCouponId = req.body.selectedCouponId;

    const couponData = await Coupon.findById(selectedCouponId);
    if (!couponData) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    // Remove the user from the coupon's usedBy array
    await Coupon.findByIdAndUpdate(selectedCouponId, {
      $pull: { usedBy: userId },
    });

    // Calculate the new total price
    const percentage = couponData.percentage;
    const userCart = await Cart.findOne({ userId: userId });
    if (!userCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const totalPrice = userCart.totalPrice;
    const updatedTotalPrice = Math.round(totalPrice / (1 - percentage / 100));

    // Update the cart with the new total price
    userCart.totalPrice = updatedTotalPrice;
    await userCart.save();

    res.json({ updatedTotalPrice });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in cancelling coupon",
    });
  }
};

/*==================================
===========Payment==================
===================================*/

const razorpay = new Razorpay({
  key_id: "rzp_test_sHq1xf34I99z5x",
  key_secret: "kgjoNUSGoxu5oxGXgImjBG7i",
});

const createOrder = async (req, res) => {
  console.log(req.body);
  const amount = req.body.amount;
  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: `order_rcptid_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({
      key: "rzp_test_sHq1xf34I99z5x",
      amount: order.amount,
      order_id: order.id,
    });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in creating razorpay order",
    });
  }
};

const capturepayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } =
    req.body;

  try {
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    if (paymentDetails.status === "captured") {
      return res.json({ status: "success", payment: paymentDetails });
    }

    const payment = await razorpay.payments.capture(
      razorpay_payment_id,
      amount
    );

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", "kgjoNUSGoxu5oxGXgImjBG7i")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ status: "success", payment });
    } else {
      res.status(400).json({ status: "failed", message: "Invalid signature" });
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in capturing payment",
    });
  }
};

const continuePayment = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const order = await Orders.findById(orderId)
      .populate("item.product")
      .exec();

    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (order.orderStatus !== "pending") {
      return res.status(400).send("Order is not pending");
    }

    // Store order details in session or pass it directly as query parameters
    req.session.pendingOrder = order;

    // Redirect to the checkout page with necessary details
    res.redirect(`/checkout?orderId=${order._id}`);
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in continue payment",
    });
  }
};

/*==================================
======= order Success===============
===================================*/

const renderOrdersuccess = async (req, res) => {
  const orderdata = req.session.orderData;
  const orderData = await Orders.findById(orderdata._id)
    .populate("item.product")
    .exec();
  console.log("from:;;;", orderdata);
  res.render("orderSuccess", { orderdata: orderData });
};
const renderOrderFailure = async (req, res) => {
  const orderdata = req.session.orderData;
  const orderData = await Orders.findById(orderdata._id)
    .populate("item.product")
    .exec();
  console.log("from:;;;", orderdata);
  res.render("orderFailure", { orderdata: orderData });
};

/*==================================
======= WishList===============
===================================*/

const loadWishlist = async (req, res) => {
  try {
    let userId = req.session.user._id;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).render("failure", { message: "Invalid user ID" });
    }

    const userData = await User.findById(userId);

    const wishlistData = await Wishlist.aggregate([
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

    if (!wishlistData.length) {
      res.render("wishlist", { userData: userData, items: [] });
    } else {
      res.render("wishlist", {
        userData: userData,
        items: wishlistData[0].items,
      });
    }
  } catch (err) {
    res.render("error", {
      message: "Something went wrong in loading wishlist",
    });
  }
};
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;
    console.log(productId);

    const productObj = await Products.aggregate([
      {
        $match: {
          _id: new ObjectId(productId),
        },
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

    const userWishlist = await Wishlist.findOne({ userId: userId });

    if (userWishlist) {
      const itemIndex = userWishlist.item.find(
        (item) => item.product.toString() === productId
      );
      if (itemIndex) {
        return res.json({
          success: false,
          message: "Item is already in the wishlist",
        });
      } else {
        await Wishlist.updateOne(
          { userId: new ObjectId(userId) },
          { $push: { item: { product: productId } } }
        );
        return res.json({
          success: true,
          message: "Item added to wishlist",
        });
      }
    } else {
      await Wishlist.create({
        userId: userId,
        item: [
          {
            product: productId,
          },
        ],
      });
      return res.json({
        success: true,
        message: "Wishlist created and item added",
      });
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in adding to wishlist",
    });
  }
};

const removeWishlistItem = async (req, res) => {
  try {
    const itemId = req.body.itemId;
    const userId = req.session.user._id;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res
        .status(400)
        .render("failure", { message: "Invalid user or item ID" });
    }
    const result = await Wishlist.updateOne(
      { userId: userId },
      { $pull: { item: { product: itemId } } }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .render("failure", { message: "Item not found in wishlist" });
    }
    res.json({ success: true });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in removing wishlist item",
    });
  }
};

/*==================================
================Wallet===============
===================================*/

const renderWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.find({ _id: userId });
    const walletData = await Wallet.find({ userId: userId });
    const formattedWalletdate = walletData.map((wallet) => ({
      timestamp: formatDate(wallet.timestamp),
    }));

    res.render("wallet", {
      userData: userData,
      walletData: walletData,
      date: formattedWalletdate,
    });
  } catch (error) {
    res.render("error", { message: "Something went wrong in loading wallet" });
  }
};

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/*==================================
================Logout===============
===================================*/
const setNoCache = (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }

    // Clear session cookie

    // Redirect to a different page after logout
    res.redirect("/login");
  });
};

module.exports = {
  sendOtp,
  verifyOtp,
  renderSignup,
  renderLogin,
  login,
  renderHome,
  checkLoggedIn,

  renderOtp,
  resendOtp,
  loadMyAccount,
  userAddress,
  addAddress,
  renderEditAddress,
  editAddress,
  deleteAddress,
  newAddress,
  showOrder,
  cancelOrder,
  renderReturn,
  returnProduct,
  changePassword,
  changeNewPasssword,
  editName,
  editsName,
  placeOrder,
  applyCoupon,
  cancelSelection,
  renderAddaddress,
  loadWishlist,
  addToWishlist,
  removeWishlistItem,
  createOrder,
  renderOrdersuccess,
  renderOrderFailure,
  createPendingOrder,
  capturepayment,
  renderWallet,
  continuePayment,
  setNoCache,
  logout,
};
