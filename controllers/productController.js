const Products = require("../models/productmodel");
const Categories = require("../models/categorymodel");
const { ObjectId } = require("mongodb");

const userProductList = async (req, res) => {
  try {
    let User = req.session.user;
    let query = { isDeleted: false };

    // Clean query parameters
    const cleanQuery = {};
    for (const key in req.query) {
      if (req.query[key]) {
        cleanQuery[key] = req.query[key];
      }
    }

    if (cleanQuery.search) {
      // Adjust the query to filter by search term
      query.$or = [
        { name: { $regex: cleanQuery.search, $options: "i" } },
        { brand: { $regex: cleanQuery.search, $options: "i" } },
        // Add other fields as needed
      ];
    }
    if (cleanQuery.brand) {
      // Adjust the query to filter by selected brands
      query.brand = { $in: cleanQuery.brand };
    }
    if (cleanQuery.size) {
      query[`sizes.${cleanQuery.size}`] = { $gt: 0 };
    }
    if (cleanQuery.min_price && cleanQuery.max_price) {
      query.price = {
        $gte: parseInt(cleanQuery.min_price),
        $lte: parseInt(cleanQuery.max_price),
      };
    }
    if (cleanQuery.category) {
      query.category = cleanQuery.category;
    }

    const sortOption = req.query.SortBy || "created_at"; // Default sorting
    let sortObject = {};

    // Handle array of SortBy values
    if (Array.isArray(sortOption)) {
      sortOption.forEach((option) => {
        const direction = option.startsWith("-") ? -1 : 1;
        const key = option.startsWith("-") ? option.substring(1) : option;
        sortObject[key] = direction;
      });
    } else {
      // Handle single SortBy value
      const direction = sortOption.startsWith("-") ? -1 : 1;
      const key = sortOption.startsWith("-")
        ? sortOption.substring(1)
        : sortOption;
      sortObject[key] = direction;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 12; // Number of products per page
    const skip = (page - 1) * limit;

    const productdata = await Products.find(query)
      .sort(sortObject)
      .skip(skip)
      .limit(limit);

    const totalProducts = await Products.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await Categories.find({ isDeleted: false });

    // Fetch unique brands from the products for generating brand checkboxes
    const uniqueBrands = await Products.distinct("brand", query);

    // Aggregating size data (as before)
    const sizesAvailable = await Products.aggregate([
      { $match: { isDeleted: false } },
      { $project: { sizes: 1 } },
      {
        $group: {
          _id: null,
          s: { $sum: "$sizes.s" },
          m: { $sum: "$sizes.m" },
          l: { $sum: "$sizes.l" },
          xl: { $sum: "$sizes.xl" },
          xxl: { $sum: "$sizes.xxl" },
        },
      },
    ]);

    const availableSizes = Object.keys(sizesAvailable[0])
      .filter((size) => sizesAvailable[0][size] > 0)
      .map((size) => size.toUpperCase());

    res.render("productList", {
      products: productdata,
      user: User,
      categories: categories,
      sizes: availableSizes,
      brands: uniqueBrands,
      currentPage: page,
      totalPages: totalPages,
      req, // Pass the req object to use query parameters in the template
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const productDetail = async (req, res) => {
  try {
    const id = req.query._id;
    const userdata = req.session.user;
    console.log(userdata);
    const productdata = await Products.findById(id).populate("category");
    productdata.images.forEach((image, index) => {
      productdata.images[index] = image.replace(/\\/g, "/");
    });
    const relatedProducts = await Products.find({
      category: productdata.category._id, // Assuming category is a populated object with _id field
    });
    console.log(productdata);
    if (productdata) {
      res.render("productDetail", {
        product: productdata,
        user: userdata,
        relatedProducts: relatedProducts,
        text: "",
      });
    } else {
      res.send("not getting");
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  userProductList,
  productDetail,
};
