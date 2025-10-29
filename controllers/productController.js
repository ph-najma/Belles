const Products = require("../models/productModel");
const Categories = require("../models/categoryModel");
const { ObjectId } = require("mongodb");
const productService = require("../services/productService");

const userProductList = async (req, res) => {
  try {
    const user = req.session.user;
    const queryParams = req.query;

    // Service handles all DB and filtering logic
    const {
      productdata,
      totalPages,
      categories,
      uniqueBrands,
      availableSizes,
      page,
    } = await productService.getFilteredProducts(queryParams);

    res.render("productList", {
      products: productdata,
      user: user,
      categories: categories,
      sizes: availableSizes,
      brands: uniqueBrands,
      currentPage: page,
      totalPages: totalPages,
      req, // for template access
    });
  } catch (error) {
    console.error("Error in userProductList Controller:", error);
    res.status(500).send("Internal Server Error");
  }
};

const productDetail = async (req, res) => {
  try {
    const id = req.query._id;
    const userData = req.session.user;

    // Service handles all DB and data formatting logic
    const { productData, relatedProducts } =
      await productService.getProductDetails(id);

    if (productData) {
      res.render("productDetail", {
        product: productData,
        user: userData,
        relatedProducts: relatedProducts,
        text: "",
      });
    } else {
      res.status(404).render("error", { message: "Product not found" });
    }
  } catch (error) {
    console.error("Error in productDetail Controller:", error);
    res.status(500).render("error", {
      message: "Something went wrong while loading product details",
    });
  }
};

module.exports = {
  userProductList,
  productDetail,
};
