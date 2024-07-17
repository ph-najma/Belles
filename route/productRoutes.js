const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const productController = require("../controllers/productController");
const connectToDatabase = require("../db");
const {
  validateQueryParam,
  isValidProductId,
} = require("../middleware/validateId");
connectToDatabase();

router.get(
  "/userProductList",
  auth.userLogin,
  productController.userProductList
);
router.get(
  "/productDetail",
  auth.userLogin,
  validateQueryParam("_id", isValidProductId),
  productController.productDetail
);

module.exports = router;
