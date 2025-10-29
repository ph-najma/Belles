const Products = require("../models/productModel");
const Categories = require("../models/categoryModel");

const getFilteredProducts = async (queryParams) => {
  let query = { isDeleted: false };

  // Clean query parameters
  const cleanQuery = {};
  for (const key in queryParams) {
    if (queryParams[key]) {
      cleanQuery[key] = queryParams[key];
    }
  }

  // Apply search filter
  if (cleanQuery.search) {
    query.$or = [
      { name: { $regex: cleanQuery.search, $options: "i" } },
      { brand: { $regex: cleanQuery.search, $options: "i" } },
    ];
  }

  // Apply brand filter
  if (cleanQuery.brand) {
    query.brand = { $in: cleanQuery.brand };
  }

  // Apply size filter
  if (cleanQuery.size) {
    query[`sizes.${cleanQuery.size}`] = { $gt: 0 };
  }

  // Apply price range filter
  if (cleanQuery.min_price && cleanQuery.max_price) {
    query.price = {
      $gte: parseInt(cleanQuery.min_price),
      $lte: parseInt(cleanQuery.max_price),
    };
  }

  // Apply category filter
  if (cleanQuery.category) {
    query.category = cleanQuery.category;
  }

  // Handle sorting
  const sortOption = queryParams.SortBy || "created_at";
  let sortObject = {};

  if (Array.isArray(sortOption)) {
    sortOption.forEach((option) => {
      const direction = option.startsWith("-") ? -1 : 1;
      const key = option.startsWith("-") ? option.substring(1) : option;
      sortObject[key] = direction;
    });
  } else {
    const direction = sortOption.startsWith("-") ? -1 : 1;
    const key = sortOption.startsWith("-")
      ? sortOption.substring(1)
      : sortOption;
    sortObject[key] = direction;
  }

  // Pagination setup
  const page = parseInt(queryParams.page) || 1;
  const limit = 12;
  const skip = (page - 1) * limit;

  // Fetch products
  const productdata = await Products.find(query)
    .sort(sortObject)
    .skip(skip)
    .limit(limit);

  // Count total products for pagination
  const totalProducts = await Products.countDocuments(query);
  const totalPages = Math.ceil(totalProducts / limit);

  // Fetch categories
  const categories = await Categories.find({ isDeleted: false });

  // Fetch unique brands
  const uniqueBrands = await Products.distinct("brand", query);

  // Aggregate available sizes
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

  return {
    productdata,
    totalPages,
    categories,
    uniqueBrands,
    availableSizes,
    page,
  };
};

const getProductDetails = async (productId) => {
  try {
    // Fetch product with category populated
    const productData = await Products.findById(productId).populate("category");

    if (!productData) {
      return { productData: null, relatedProducts: [] };
    }

    // Replace backslashes with forward slashes in image paths
    productData.images = productData.images.map((img) =>
      img.replace(/\\/g, "/")
    );

    // Fetch related products from the same category
    const relatedProducts = await Products.find({
      category: productData.category._id,
      _id: { $ne: productData._id }, // Exclude the current product
      isDeleted: false,
    });

    return { productData, relatedProducts };
  } catch (error) {
    console.error("Error in getProductDetails Service:", error);
    throw error;
  }
};

module.exports = {
  getFilteredProducts,
  getProductDetails,
};
