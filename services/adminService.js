const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const Coupon = require("../models/couponModel");
const Offer = require("../models/offerModel");
const Product = require("../models/productModel");
const Categories = require("../models/categoryModel");
const Orders = require("../models/orderModel");

// 🧩 Admin Login Service
const adminLogin = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    return { success: false, errorType: "email", message: "Email not found" };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return { success: false, errorType: "password", message: "Wrong password" };
  }

  if (user.is_admin !== 1) {
    return {
      success: false,
      errorType: "email",
      message: "Not authorized as admin",
    };
  }

  // ✅ Success case
  return { success: true, user };
};
const getAllNonAdminUsers = async () => {
  try {
    const users = await User.find({ is_admin: 0 });
    return users;
  } catch (error) {
    throw new Error("Failed to fetch user list");
  }
};

// 🧩 Block a user by ID and destroy their session
const blockUserById = async (userId, sessionStore) => {
  try {
    console.log(userId);
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.is_blocked = true;
    await user.save();

    // Destroy user's active session
    sessionStore.all((err, sessions) => {
      if (err) {
        console.error("Error fetching sessions:", err);
        return;
      }

      for (let sessionId in sessions) {
        if (
          sessions[sessionId].user &&
          sessions[sessionId].user._id.toString() === userId
        ) {
          sessionStore.destroy(sessionId, (err) => {
            if (err) {
              console.error("Error destroying session:", err);
            }
          });
        }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    throw new Error("Failed to block user");
  }
};

// 🧩 Unblock a user by ID
const unblockUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    user.is_blocked = false;
    await user.save();

    return { success: true };
  } catch (error) {
    console.error("Error unblocking user:", error);
    throw new Error("Failed to unblock user");
  }
};
// Fetch all non-deleted categories
const getAllCategories = async () => {
  return await Categories.find({ isDeleted: false });
};

// Get category by ID
const getCategoryById = async (id) => {
  return await Categories.findById({ _id: id });
};

// Update category name
const updateCategory = async (id, name) => {
  return await Categories.findByIdAndUpdate(
    { _id: id },
    { $set: { name } },
    { new: true }
  );
};

// Check if category exists by name
const findCategoryByName = async (name) => {
  return await Categories.findOne({ name });
};

// Create a new category
const createCategory = async (name) => {
  const newCategory = new Categories({ name });
  return await newCategory.save();
};

// Soft delete category
const softDeleteCategory = async (id) => {
  return await Categories.findByIdAndUpdate(
    { _id: id },
    { $set: { isDeleted: true } },
    { new: true }
  );
};
const getAllProducts = async () => {
  return await Product.find({ isDeleted: false }).populate("category");
};
const addNewProduct = async (data, files) => {
  const { name, price, offerprice, brand, sizes, quantity, desc, category } =
    data;

  if (!files || files.length === 0) {
    throw new Error("No files were uploaded.");
  }

  const images = files.map((file) => file.path);

  const newProduct = new Product({
    name,
    price,
    offerprice,
    brand,
    sizes,
    quantity,
    desc,
    category,
    images,
  });

  await newProduct.save();
  return newProduct;
};
// Get product by ID (for edit page)
const getProductById = async (id) => {
  return await Product.findById({ _id: id }).populate("category");
};

// Get all categories (for dropdown)
const getAllCategory = async () => {
  return await Categories.find();
};
const updateProduct = async (id, body, files) => {
  const updateFields = {};

  if (body.name) updateFields.name = body.name;
  if (body.price) updateFields.price = body.price;
  if (body.offerprice) updateFields.offerprice = body.offerprice;
  if (body.brand) updateFields.brand = body.brand;
  if (body.sizes) {
    updateFields.sizes = {
      s: body.sizes.s,
      m: body.sizes.m,
      l: body.sizes.l,
      xl: body.sizes.xl,
      xxl: body.sizes.xxl,
    };
  }
  if (body.quantity) updateFields.quantity = body.quantity;
  if (body.desc) updateFields.desc = body.desc;
  if (body.category) updateFields.category = body.category;

  if (files && files.length > 0) {
    const imagePaths = files.map((file) => file.path);
    updateFields.images = imagePaths;
  }

  const productData = await Product.findByIdAndUpdate(
    { _id: id },
    { $set: updateFields },
    { new: true }
  );

  if (!productData) {
    throw new Error("Product not found");
  }

  return productData;
};
const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    { _id: id },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

const getAllOrders = async () => {
  const orders = await Orders.find()
    .populate({
      path: "item.product",
      populate: { path: "category" },
    })
    .populate("userId")
    .sort({ orderDate: -1 });

  // Check each order for completion status and coupon adjustments
  for (let order of orders) {
    let allCompleted = order.item.every((item) => item.status === "Completed");

    if (allCompleted && order.orderStatus !== "Completed") {
      await Orders.findByIdAndUpdate(order._id, { orderStatus: "Completed" });
      order.orderStatus = "Completed"; // For immediate rendering update
    }

    // If order has a coupon, calculate the original price
    if (order.couponId) {
      order.originalPrice =
        order.totalPrice / ((100 - order.discountPercentage) / 100);
    }
  }

  return orders;
};

// Fetch single order for ledger
const getOrderById = async (orderId) => {
  const order = await Orders.findById(orderId);
  if (!order) throw new Error("Order not found");
  return order;
};

// Get order and item index for status update view
const getChangeStatusData = (orderId, itemIndex) => {
  return { orderId, itemIndex };
};

// Update status of an order item
const updateItemStatus = async (orderId, itemIndex, status) => {
  const order = await Orders.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.item[itemIndex].status = status;
  await order.save();

  return order;
};

const getReturnRequests = async () => {
  return await Orders.find({
    item: { $elemMatch: { status: "return_requested" } },
  })
    .populate("userId")
    .populate("item.product")
    .populate("address");
};
const processReturnApproval = async (orderId, itemIndex, status) => {
  const order = await Orders.findById(orderId);
  if (!order) throw new Error("Order not found");

  const product = order.item[itemIndex];
  if (!product) throw new Error("Product not found in order");

  if (status === "approve") {
    // ✅ Approve return request
    product.status = "Completed";
    const returnedProductPrice = parseFloat(product.price);

    // Add wallet transaction
    const topUpTransaction = new Wallet({
      userId: order.userId,
      transactionType: "Credited",
      amount: returnedProductPrice,
    });

    await topUpTransaction.save();

    // Update wallet balance in user model
    const user = await User.findOneAndUpdate(
      { _id: order.userId },
      { $inc: { wallet: returnedProductPrice } },
      { new: true }
    );

    await user.save();
  } else if (status === "cancel") {
    // ❌ Cancel return request
    product.status = "Cancelled";
  }

  await order.save();
  return order;
};
// Get all coupons
const getAllCoupons = async () => {
  return await Coupon.find();
};

// Create a new coupon
const createNewCoupon = async (couponData) => {
  const { name, percentage, date, maxLimit } = couponData;

  if (!name || !percentage || !date) {
    throw new Error("Missing required fields");
  }

  const lowerCouponCode = name.toLowerCase();
  const existingCoupon = await Coupon.findOne({ code: lowerCouponCode });

  if (existingCoupon) {
    return { exists: true };
  }

  const newCoupon = new Coupon({
    code: lowerCouponCode,
    percentage,
    expiryDate: date,
    maxLimit,
  });

  await newCoupon.save();
  return { exists: false, coupon: newCoupon };
};

// Delete a coupon
const deleteCouponById = async (couponId) => {
  await Coupon.findByIdAndDelete(couponId);
  return true;
};

// Fetch all offers with product and category populated
const getAllOffers = async () => {
  return await Offer.find().populate("product").populate("category");
};

// Create a new offer and update the product’s offer price
const createNewOffer = async (offerData) => {
  const { name, percentage, product } = offerData;

  if (!name || !percentage || !product) {
    throw new Error("Missing required fields");
  }

  const offerName = name.toLowerCase();
  const offerExist = await Offer.findOne({ name: offerName });

  if (offerExist) {
    return { exists: true };
  }

  const existingProduct = await Product.findById(product);
  if (!existingProduct) {
    throw new Error("Product not found");
  }

  // Calculate new offer price
  const offerPercentage = parseInt(percentage, 10);
  const originalProductPrice = existingProduct.offerprice;
  const newPrice = Math.round(
    originalProductPrice *
      ((100 - (existingProduct.offerPercentage + offerPercentage)) / 100)
  );

  // Update product with new offer details
  await Product.findByIdAndUpdate(product, {
    $set: {
      offerprice: newPrice,
      offerPercentage: existingProduct.offerPercentage + offerPercentage,
    },
  });

  // Create and save new offer
  const newOffer = new Offer({
    name: offerName,
    percentage: offerPercentage,
    product,
  });
  await newOffer.save();

  return { exists: false, offer: newOffer };
};

// Delete an offer by ID
const deleteOfferById = async (offerId) => {
  await Offer.findByIdAndDelete(offerId);
  return true;
};

const createCategoryOffer = async (offerName, offerPercentage, category) => {
  const lowerOfferName = offerName.toLowerCase();
  const offerExist = await Offer.findOne({ name: lowerOfferName });
  if (offerExist) return null;

  const products = await Product.find({ category });
  for (const product of products) {
    const currentOfferPercentage = product.offerPercentage || 0;
    const currentOfferPrice = product.offerPrice || product.price;

    const newOfferPercentage = currentOfferPercentage + offerPercentage;
    const newPrice = Math.round(
      currentOfferPrice - (currentOfferPrice * newOfferPercentage) / 100
    );

    product.offerPercentage = newOfferPercentage;
    product.offerprice = newPrice;
    await product.save();
  }

  const newOffer = new Offer({
    name: offerName,
    percentage: offerPercentage,
    category,
  });
  await newOffer.save();

  return newOffer;
};
const deleteCategoryOfferById = async (offerId) => {
  const offerDoc = await Offer.findById(offerId);
  if (!offerDoc) return null;

  const products = await Product.find({ category: offerDoc.category });
  for (const product of products) {
    const currentOffer = product.offerPercentage || 0;
    const newOffer = currentOffer - offerDoc.percentage;
    const offerPrice = product.offerPrice || product.price;
    const newPrice = ((100 - newOffer) * offerPrice) / 100;

    product.price = newPrice;
    product.offerPercentage = newOffer;
    await product.save();
  }

  await Offer.deleteOne({ _id: offerId });
  return true;
};

module.exports = {
  adminLogin,
  getAllNonAdminUsers,
  blockUserById,
  unblockUserById,
  getAllCategories,
  getCategoryById,
  updateCategory,
  findCategoryByName,
  createCategory,
  softDeleteCategory,
  getAllProducts,
  addNewProduct,
  getProductById,
  getAllCategory,
  updateProduct,
  deleteProduct,
  getAllOrders,
  getOrderById,
  getChangeStatusData,
  updateItemStatus,
  getReturnRequests,
  processReturnApproval,
  getAllCoupons,
  createNewCoupon,
  deleteCouponById,
  getAllOffers,
  createNewOffer,
  deleteOfferById,
  deleteCategoryOfferById,
  createCategoryOffer,
};
