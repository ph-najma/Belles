const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const adminController = require("../controllers/adminController");
const connectToDatabase = require("../db");
connectToDatabase();

router.get("/dashboard", auth.adminLogin, adminController.dashboardload);
router.get(
  "/loginAdmin",
  adminController.checkLoggedIn,
  adminController.renderAdmin
);
router.post("/loginAdmin", adminController.admin);
router.get("/userManagement", auth.adminLogin, adminController.userList);
router.get("/blockUser", auth.adminLogin, adminController.blockUser);
router.get("/unblockUser", auth.adminLogin, adminController.unBlockUser);
router.get(
  "/categoryManagement",
  auth.adminLogin,
  adminController.categoryList
);
router.get(
  "/editCategory",
  auth.adminLogin,
  adminController.renderEditCategory
);
router.post("/editCategory", auth.adminLogin, adminController.editCategory);
router.get("/addCategory", auth.adminLogin, adminController.renderAddCcategory);
router.post("/addCategory", auth.adminLogin, adminController.addCategory);
router.post("/deleteCategory", auth.adminLogin, adminController.deleteCategory);
router.get("/productManagement", auth.adminLogin, adminController.productList);
router.get("/addProduct", auth.adminLogin, adminController.renderAddProduct);
router.post(
  "/addProduct",
  auth.adminLogin,
  adminController.upload.array("images", 5),
  adminController.addProduct
);
router.get("/editProduct", auth.adminLogin, adminController.renderEditProduct);
router.post(
  "/editProduct",
  auth.adminLogin,
  adminController.upload.array("images", 5),
  adminController.editProduct
);
router.delete("/deleteImage", auth.adminLogin, adminController.deleteImage);
router.post("/deleteProduct", auth.adminLogin, adminController.deleteProduct);
router.get(
  "/orderManagement",
  auth.adminLogin,
  adminController.orderManagement
);
router.get("/changeStatus", auth.adminLogin, adminController.changeStatus);
router.post("/changeStatus", auth.adminLogin, adminController.changeNewStatus);
router.get("/returnAprroval", auth.adminLogin, adminController.renderApproval);
router.post("/returnApproval", auth.adminLogin, adminController.returnApproval);
router.get("/orders/:orderId/ledger", auth.adminLogin, adminController.ledger);
router.get("/couponList", auth.adminLogin, adminController.renderCouponList);
router.get(
  "/createCoupon",
  auth.adminLogin,
  adminController.rendercouponCreate
);
router.post("/createCoupon", auth.adminLogin, adminController.createCoupon);
router.get("/couponDelete/:id", auth.adminLogin, adminController.deleteCoupon);
router.get("/offerList", auth.adminLogin, adminController.renderOfferList);
router.get("/createOffer", auth.adminLogin, adminController.rendercreateOffer);
router.post("/createOffer", auth.adminLogin, adminController.createOffer);
router.get("/deleteOffer/:id", auth.adminLogin, adminController.deleteOffer);
router.get(
  "/categoryOfferCreate",
  auth.adminLogin,
  adminController.categoryOfferCreate
);
router.post(
  "/categoryOfferCreate",
  auth.adminLogin,
  adminController.addCategoryOffer
);
router.get(
  "/deleteCategoryOffer/:id",
  auth.adminLogin,
  adminController.deleteCategoryOffer
);

//======sales===============//
router.post("/lineChart", auth.adminLogin, adminController.fetchlineChartData);
router.post("/barChart", auth.adminLogin, adminController.fetchbarChartData);
router.post("/pieChart", auth.adminLogin, adminController.fetchpieChartData);
router.post(
  "/updateDashboard",
  auth.adminLogin,
  adminController.updateDashboard
);

router.get("/dailySales", auth.adminLogin, adminController.dailySales);
router.get("/weeklySales", auth.adminLogin, adminController.weeklySales);
router.get("/yearlySales", auth.adminLogin, adminController.yearlySales);
router.get("/generate-invoice/:orderId", adminController.generateInvoice);
router.get("/logoutAdmin", adminController.logout);
module.exports = router;
