const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const productController = require("../controllers/productController");
const connectToDatabase = require("../db");
connectToDatabase();

router.get(
  "/userProductList",
  auth.userLogin,
  productController.userProductList
);
router.get("/productDetail", auth.userLogin, productController.productDetail);

module.exports = router;
