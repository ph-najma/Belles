const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const userController = require("../controllers/userController");
const connectToDatabase = require("../db");
const { use } = require("passport");
connectToDatabase();

router.get("/signup", userController.renderSignup);
router.post("/signup", userController.sendOtp);
router.get("/login", auth.checkLoggedIn, userController.renderLogin);
router.post("/login", userController.login);
router.get("/otp", userController.renderOtp);
router.post("/otp", userController.verifyOtp);
router.get("/resendotp", userController.sendOtp);
router.get("/home", auth.userLogin, userController.renderHome);

//==============profile===========================//
router.get("/userProfile", auth.userLogin, userController.loadMyAccount);
router.post("/editName", auth.userLogin, userController.editName);
router.post("/editSname", auth.userLogin, userController.editsName);
router.get("/addressManagement", auth.userLogin, userController.userAddress);
router.get("/addAddress", auth.userLogin, userController.renderAddaddress);
router.post("/addNewAddress", auth.userLogin, userController.addAddress);
router.get("/editAddress", auth.userLogin, userController.renderEditAddress);
router.post("/editAddress", auth.userLogin, userController.editAddress);
router.post("/deleteAddress", auth.userLogin, userController.deleteAddress);
router.post("/placeOrder", auth.userLogin, userController.placeOrder);
router.post("/cancelSelection", auth.userLogin, userController.cancelSelection);
router.post("/applyCoupon", auth.userLogin, userController.applyCoupon);
router.post("/newAddress", auth.userLogin, userController.newAddress);
router.get("/showOrders", auth.userLogin, userController.showOrder);

router.get("/cancelOrder", auth.userLogin, userController.cancelOrder);
router.get("/returnForm", auth.userLogin, userController.renderReturn);
router.post("/returnProduct", auth.userLogin, userController.returnProduct);
router.get("/changePassword", auth.userLogin, userController.changePassword);
router.post(
  "/changePassword",
  auth.userLogin,
  userController.changeNewPasssword
);
router.post("/createOrder", auth.userLogin, userController.createOrder);
router.post("/capturePayment", auth.userLogin, userController.capturepayment);
router.get("/wishlist", auth.userLogin, userController.loadWishlist);
router.post("/addtowishlist/:id", auth.userLogin, userController.addToWishlist);
router.post(
  "/removeWishlistItem",
  auth.userLogin,
  userController.removeWishlistItem
);
router.get("/wallet", auth.userLogin, userController.renderWallet);
router.get("/orderSuccess", auth.userLogin, userController.renderOrderSuccess);
router.get("/orderFailure", auth.userLogin, userController.renderOrderFailure);
router.post(
  "/createPendingOrder",
  auth.userLogin,
  userController.createPendingOrder
);
router.post("/continuePayment", auth.userLogin, userController.continuePayment);
//========================================//
router.get("/logout", userController.setNoCache, userController.logout);

module.exports = router;
