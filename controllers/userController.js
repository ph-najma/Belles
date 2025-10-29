const User = require("../models/userModel");

const userService = require("../services/userService");

require("dotenv").config();
const { generateOTP } = require("../utils/generateOtp");

const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const ObjectId = mongoose.Types.ObjectId;

/*========================
=========signup===========
==========================*/

const sendOtp = async (req, res) => {
  try {
    const { email, name, password, referral } = req.body;

    // check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("sign-up", { footer: "User already exists" });
    }

    // generate OTP and save it to DB
    const generatedOtp = generateOTP();
    await userService.saveOtpToDB(email, generatedOtp);

    // send OTP mail
    await userService.sendOtpMail(email, generatedOtp);

    // temporarily store data in session instead of globals
    req.session.tempUser = { name, email, password, referral };

    return res.render("otpForm", { footer: "" });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return res.render("error", {
      message: "Something went wrong in sending OTP",
    });
  }
};

// async function sendOtpMail(email, otp) {
//   try {
//     const transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: process.env.SMTP_PORT,
//       secure: false,
//       requireTLS: true,
//       auth: {
//         // TODO: replace `user` and `pass` values from <https://forwardemail.net>
//         user: process.env.SMTP_MAIL,
//         pass: process.env.SMTP_PASSWORD,
//       },
//       tls: {
//         // Reject unauthorized servers or not
//         rejectUnauthorized: true,
//         secure: true, // Change to true in production
//       },
//     });
//     const mailOptions = {
//       from: process.env.SMTP_MAIL,
//       to: email,
//       subject: "Your OTP for user verification",
//       text: `Your OTP is ${otp}. Please enter this code to verify your account.`,
//     };

//     const result = await transporter.sendMail(mailOptions);
//   } catch (error) {
//     console.log(error);
//   }
// }

// const verifyOtp = async (req, res) => {
//   const userExist = await User.find({ referralcode: refCode });
//   if (userExist.length == 0) {
//     const EnteredOtp = req.body.otp;
//     if (EnteredOtp === saveOtp) {
//       const referralCode = generateReferralCode(8);
//       const securedPassword = await securePassword(password);
//       const referralLink = `https://www.example.com/signup?ref=${referralCode}`;
//       const newUser = new User({
//         name: name,
//         email: email,
//         password: securedPassword,
//         referralcode: referralCode,
//         referralLink: referralLink,
//       });
//       req.session.user = newUser._id;
//       req.session.loginSuccess = true;
//       req.session.save();
//       await newUser.save();
//       res.redirect("/home");
//     } else {
//       res.render("otpForm", { footer: "Incorrect OTP" });
//     }
//   } else {
//     const referredUserId = userExist[0]._id;
//     let existingWalletAmount = userExist[0].wallet;
//     let updatedWalletAmount = existingWalletAmount + 100;
//     await User.findByIdAndUpdate(referredUserId, {
//       $set: { wallet: updatedWalletAmount },
//     });

//     // Create a wallet transaction for the credit
//     const topUpTransaction = new Wallet({
//       userId: referredUserId,
//       transactionType: "Credited",
//       amount: 100,
//     });

//     await topUpTransaction.save();
//     const EnteredOtp = req.body.otp;
//     if (EnteredOtp === saveOtp) {
//       const referralCode = generateReferralCode(8);
//       const securedPassword = await securePassword(password);
//       const referralLink = `https://www.example.com/signup?ref=${referralCode}`;
//       const newUser = new User({
//         name: name,
//         email: email,
//         password: securedPassword,
//         referralcode: referralCode,
//         referralLink: referralLink,
//         wallet: 100,
//       });
//       await newUser.save();
//       req.session.user = newUser._id;
//       req.session.loginSuccess = true;
//       req.session.save();
//       res.redirect("/home");
//     } else {
//       res.render("otpForm", { footer: "Incorrect OTP" });
//     }
//   }
// };

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    const result = await userService.verifyOtpService(req, otp);

    if (result.success) {
      res.redirect("/home");
    } else {
      res.render("otpForm", { footer: result.message });
    }
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).render("otpForm", { footer: "Something went wrong" });
  }
};

// function generateReferralCode(length) {
//   const characters =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let code = "";
//   for (let i = 0; i < length; i++) {
//     const randomIndex = Math.floor(Math.random() * characters.length);
//     code += characters.charAt(randomIndex);
//   }
//   return code;
// }

const renderSignup = (req, res) => {
  res.render("sign-up", { footer: "" });
};

/*========================
===========OTP============
==========================*/

const renderOtp = (req, res) => {
  res.render("otpForm", { footer: "" });
};

// function generateOTP() {
//   let otp = "";
//   for (let i = 0; i < 6; i++) {
//     otp += Math.floor(Math.random() * 10);
//   }
//   return otp;
// }
// const resendOtp = async (req, res) => {
//   try {
//     const email = req.query.email;
//     await otpcreation.sendemail(req, res, email);
//     res.render("otpForm", { email: email });
//   } catch (error) {
//     res.render("error", { message: "Something went wrong in Re-sending OTP" });
//   }
// };

const resendOtp = async (req, res) => {
  try {
    const email = req.query.email; // Email from query params or session

    if (!email) {
      return res.render("error", {
        message: "Email not provided for re-sending OTP",
      });
    }

    // Generate a new OTP
    const generatedOtp = generateOTP();

    // Save the new OTP in the database (replacing old one)
    await userService.saveOtpToDB(email, generatedOtp);

    // Send OTP mail again
    await userService.sendOtpMail(email, generatedOtp);

    // Render the OTP form again for the user
    return res.render("otpForm", {
      email,
      footer: "A new OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    return res.render("error", {
      message: "Something went wrong while re-sending OTP",
    });
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
// const checkLoggedIn = (req, res, next) => {
//   if (req.session.loginSuccess) {
//     res.redirect("/home"); // Redirect to dashboard if logged in
//   } else {
//     res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // Add cache control headers
//     next(); // Continue to the next middleware/route handler
//   }
// };

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { success, emailError, passwordError, user } =
      await userService.loginService(email, password);

    if (success) {
      req.session.user = user;
      req.session.loginSuccess = true;
      return res.redirect("/home");
    }

    res.render("login", { emailError, passwordError });
  } catch (error) {
    console.error("Login error:", error);
    res.render("error", { message: "Something went wrong in Login" });
  }
};
/*========================
===========Home===========
==========================*/

const renderHome = async (req, res) => {
  try {
    if (!req.session.loginSuccess) {
      return res.redirect("/login"); // Redirect if not logged in
    }

    const userId = req.session.user._id;
    const { user, products } = await userService.getHomeData(userId);

    res.render("home", { products, user });
  } catch (error) {
    console.error("Error rendering home:", error);
    res.status(500).render("error", {
      message: "Something went wrong while loading home page",
    });
  }
};

/*========================
=======User Profile=======
==========================*/
const loadMyAccount = async (req, res) => {
  try {
    const userId = req.session.user?._id;

    const user = await userService.getUserById(userId);

    res.render("userProfile", { user, message: "" });
  } catch (error) {
    console.error("Error in loadMyAccount:", error);
    res.render("error", { message: "Something went wrong in loading account" });
  }
};
const editName = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const firstName = req.body.name;

    await userService.updateUserName(userId, firstName);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in editName:", error);
    res.render("error", { message: "Something went wrong in Editing name" });
  }
};

// ✏️ Edit Second Name
const editsName = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const secondName = req.body.sname;

    await userService.updateUserSecondName(userId, secondName);

    res.status(200).json({ message: "Name updated successfully" });
  } catch (error) {
    console.error("Error in editsName:", error);
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
    const userId = req.session.user?._id;

    const addresses = await userService.getUserAddresses(userId);

    res.render("addressManagement", { addresses });
  } catch (error) {
    console.error("Error in userAddress:", error);
    res.render("error", { message: "Something went wrong in User Address" });
  }
};
const renderAddaddress = (req, res) => {
  res.render("address");
};
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    await userService.addNewAddress(userId, req.body);
    res.redirect("/addressmanagement");
  } catch (error) {
    console.error("Error in addAddress:", error);
    res.render("error", {
      message: "Something went wrong in adding new address",
    });
  }
};
const renderEditAddress = async (req, res) => {
  try {
    const addressData = await userService.getAddressById(req.query._id);
    if (addressData) {
      res.render("editAddress", { address: addressData });
    } else {
      res.render("error", { message: "Address not found" });
    }
  } catch (error) {
    console.error("Error in renderEditAddress:", error);
    res.render("error", {
      message: "Something went wrong in loading edit address",
    });
  }
};
const editAddress = async (req, res) => {
  try {
    await userService.updateAddress(req.query._id, req.body);
    res.redirect("/addressmanagement");
  } catch (error) {
    console.error("Error in editAddress:", error);
    res.render("error", {
      message: "Something went wrong in editing address",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query._id;
    await userService.softDeleteAddress(addressId);

    res
      .status(200)
      .json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAddress:", error);
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
    await userService.addNewAddress(userId, req.body);

    res.redirect("/checkout");
  } catch (error) {
    console.error("Error in newAddress:", error);
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
    const userId = req.session.user._id;
    const orders = await userService.getUserOrdersWithBreakdown(userId);

    res.render("userOrder", { orders });
  } catch (error) {
    console.error("Error in showOrder:", error);
    res.render("error", {
      message: "Something went wrong in Showing orders",
    });
  }
};
const cancelOrder = async (req, res) => {
  try {
    const { orderId, productId } = req.query;
    await userService.cancelOrderItem(orderId, productId);

    return res.redirect("/showorders?cancelSuccess=true");
  } catch (error) {
    console.error("Error in cancelOrder:", error);
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

    await userService.requestProductReturn(orderId, productId, reason);
    console.log("Order updated and saved successfully");

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error in returnProduct:", error.message);
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

    const userdata = await userService.getUserById(id);
    res.render("changePassword", { user: userdata });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading change password",
    });
  }
};
const changeNewPasssword = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { password, newpassword, conpassword } = req.body;

    // Call the service function
    const result = await userService.changePasswordService(
      userId,
      password,
      newpassword,
      conpassword
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
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
    const { addressId, paymentMethod, wallet, couponId } = req.body;
    const userId = req.session.user._id;

    const orderData = await userService.placeOrder({
      addressId,
      paymentMethod,
      wallet: parseInt(wallet, 10),
      couponId,
      userId,
    });

    req.session.orderData = orderData;
    res.render("orderSuccess", { orderdata: orderData });
  } catch (error) {
    console.error("Error in placeOrder controller:", error);
    res.render("orderFailure");
  }
};

const createPendingOrder = async (req, res) => {
  try {
    const result = await userService.createPendingOrderService(
      req.body,
      req.session.user
    );

    if (result.success) {
      req.session.orderData = result.orderData;
      res.json({ success: true, orderData: result.orderData });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error("Error in createPendingOrder controller:", error.message);
    res.render("orderFailure");
  }
};
/*==================================
===========Coupon==================
===================================*/

const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const couponId = req.body.couponId;

    const percentage = await userService.applyCouponService(userId, couponId);

    res.json(percentage);
  } catch (error) {
    console.error("Error in applyCoupon:", error.message);
    res.render("error", {
      message: "Something went wrong while applying the coupon",
    });
  }
};
const cancelSelection = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const selectedCouponId = req.body.selectedCouponId;

    const result = await userService.cancelCouponSelectionService(
      userId,
      selectedCouponId
    );

    res.json(result);
  } catch (error) {
    console.error("Error in cancelSelection:", error.message);
    res.render("error", {
      message: "Something went wrong while cancelling the coupon",
    });
  }
};
/*==================================
===========Payment==================
===================================*/

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const orderResponse = await userService.createRazorpayOrder(amount);

    res.json(orderResponse);
  } catch (error) {
    console.error("Error in createOrder:", error.message);
    res.render("error", {
      message: "Something went wrong in creating Razorpay order",
    });
  }
};

const capturepayment = async (req, res) => {
  try {
    const paymentData = req.body;

    const paymentResponse = await userService.captureRazorpayPayment(
      paymentData
    );

    if (paymentResponse.status === "success") {
      res.json(paymentResponse);
    } else {
      res.status(400).json(paymentResponse);
    }
  } catch (error) {
    console.error("Error in capturePayment:", error.message);
    res.render("error", {
      message: "Something went wrong in capturing Razorpay payment",
    });
  }
};

const continuePayment = async (req, res) => {
  try {
    const orderId = req.body.orderId;

    // Fetch order details from the service
    const order = await userService.getOrderById(orderId);

    // Validate order
    const validation = userService.validateOrderStatus(order);
    if (!validation.valid) {
      return res.status(validation.status).send(validation.message);
    }

    // Store order details in session
    req.session.pendingOrder = order;

    // Redirect to checkout
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

const renderOrderSuccess = async (req, res) => {
  try {
    const orderSessionData = req.session.orderData;

    if (!orderSessionData?._id) {
      return res.render("error", { message: "No order data found in session" });
    }

    const orderData = await userService.getOrderById(orderSessionData._id);

    res.render("orderSuccess", { orderdata: orderData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong while rendering success page",
    });
  }
};

/**
 * Render Order Failure Page
 */
const renderOrderFailure = async (req, res) => {
  try {
    const orderSessionData = req.session.orderData;

    if (!orderSessionData?._id) {
      return res.render("error", { message: "No order data found in session" });
    }

    const orderData = await userService.getOrderById(orderSessionData._id);

    res.render("orderFailure", { orderdata: orderData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong while rendering failure page",
    });
  }
};

/*==================================
======= WishList===============
===================================*/

const loadWishlist = async (req, res) => {
  try {
    console.log("🟢 Entered wishlist route");

    const userId = req.session.user?._id;
    console.log("User ID from session:", userId);

    if (!userId) {
      console.log("🚫 No user ID found in session");
      return res
        .status(401)
        .render("failure", { message: "Please log in first." });
    }

    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      console.log("🚫 Invalid user ID format");
      return res.status(400).render("failure", { message: "Invalid user ID" });
    }

    console.log("🔹 Fetching user and wishlist data...");
    const userData = await userService.getUserById(userId);
    const wishlistData = await userService.getWishlistData(userId);

    console.log("✅ userData:", userData);
    console.log("✅ wishlistData:", wishlistData);

    if (!wishlistData.length) {
      console.log("ℹ️ Wishlist is empty");
      return res.render("wishlist", { userData, items: [] });
    }

    console.log("🎯 Rendering wishlist with items");
    res.render("wishlist", { userData, items: wishlistData[0].items });
  } catch (err) {
    console.error("❌ Error in loadWishlist:", err);
    res.render("error", {
      message: "Something went wrong in loading wishlist",
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;

    // Validate product and user IDs
    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .render("failure", { message: "Invalid user or product ID" });
    }

    // Fetch product with category details (currently unused, but kept for logic parity)
    await userService.getProductWithCategory(productId);

    // Check if the user already has a wishlist
    const userWishlist = await userService.findUserWishlist(userId);

    if (userWishlist) {
      // Check if product already exists
      const existingItem = userWishlist.item.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        return res.json({
          success: false,
          message: "Item is already in the wishlist",
        });
      }

      // Add item to existing wishlist
      await userService.addItemToWishlist(userId, productId);
      return res.json({
        success: true,
        message: "Item added to wishlist",
      });
    }

    // Create a new wishlist for user
    await userService.createWishlist(userId, productId);
    res.json({
      success: true,
      message: "Wishlist created and item added",
    });
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

    const result = await userService.removeWishlistItem(userId, itemId);

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
    const userId = req.session.user._id; // ✅ fixed: use user._id instead of whole user object

    // Fetch user data and wallet details from service layer
    const userData = await userService.getUserById(userId);
    const walletData = await userService.getWalletDataByUserId(userId);

    // Render the wallet page
    res.render("wallet", {
      userData,
      walletData,
      date: walletData.map((item) => ({ timestamp: item.formattedDate })),
    });
  } catch (error) {
    console.error("Error in renderWallet:", error);
    res.render("error", {
      message: "Something went wrong in loading wallet",
    });
  }
};

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
  renderOrderSuccess,
  renderOrderFailure,
  createPendingOrder,
  capturepayment,
  renderWallet,
  continuePayment,
  setNoCache,
  logout,
};
