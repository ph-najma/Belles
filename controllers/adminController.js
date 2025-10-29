const User = require("../models/userModel");
const Categories = require("../models/categoryModel");
const Product = require("../models/productModel");
const Orders = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Offer = require("../models/offerModel");
const Wallet = require("../models/walletModel");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const multer = require("multer");
const path = require("path");
const moment = require("moment");
const fs = require("fs");
const ExcelJS = require("exceljs");

const puppeteer = require("puppeteer");
const adminService = require("../services/adminService");

/*====================================
==============LOGIN====================
=====================================*/
const renderAdmin = (req, res) => {
  let emailError = "";
  let passwordError = "";
  res.render("adminLogin", { emailError, passwordError });
};

const checkLoggedIn = (req, res, next) => {
  if (req.session.loginadminSuccess) {
    res.redirect("/dashboard"); // Redirect to dashboard if logged in
  } else {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // Add cache control headers
    next(); // Continue to the next middleware/route handler
  }
};

const admin = async (req, res) => {
  try {
    const { email, password } = req.body;
    let emailError = "";
    let passwordError = "";

    const result = await adminService.adminLogin(email, password);

    if (!result.success) {
      // Error handling based on error type
      if (result.errorType === "email") emailError = result.message;
      if (result.errorType === "password") passwordError = result.message;

      return res.render("adminLogin", { emailError, passwordError });
    }

    // ✅ Admin login success
    req.session.admin = result.user._id;
    req.session.loginadminSuccess = true;
    req.session.save(() => {
      res.redirect("/dashboard");
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    res.render("error", { message: "Something went wrong in Login" });
  }
};

/*====================================
===========USER MANAGEMENT============
=====================================*/
const userList = async (req, res) => {
  try {
    const users = await adminService.getAllNonAdminUsers();
    res.render("adminUserManagement", { users });
  } catch (error) {
    console.error("Error loading user list:", error);
    res.render("error", {
      message: "Something went wrong in loading userList",
    });
  }
};
const blockUser = async (req, res) => {
  try {
    const userId = req.body.id;
    console.log(req.query);
    const sessionStore = req.sessionStore;
    console.log(userId);

    const result = await adminService.blockUserById(userId, sessionStore);
    console.log(result);
    if (!result.success) {
      return res.status(404).send(result.message);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.render("error", { message: "Something went wrong in blocking user" });
  }
};

const unBlockUser = async (req, res) => {
  try {
    const userId = req.body.id;
    const result = await adminService.unblockUserById(userId);

    if (!result.success) {
      return res.status(404).send(result.message);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.render("error", { message: "Something went wrong in Unblocking user" });
  }
};
/*====================================
=========CATEGORY MANAGEMENT==========
=====================================*/
const categoryList = async (req, res) => {
  try {
    const categoryData = await adminService.getAllCategories();
    res.render("adminCategoryManagement", { Category: categoryData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in category listing",
    });
  }
};
const renderEditCategory = async (req, res) => {
  try {
    const id = req.query._id;
    const categoryData = await adminService.getCategoryById(id);
    if (categoryData) {
      res.render("adminEditCategory", { Category: categoryData });
    } else {
      res.redirect("/adminHome");
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading edit category",
    });
  }
};
const editCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await adminService.updateCategory(id, req.body.name);
    res.status(201).json({ success: true });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in editing category",
    });
  }
};
const renderAddCcategory = (req, res) => {
  res.render("adminAddCategory");
};
const addCategory = async (req, res) => {
  try {
    let name = req.body.name.toLowerCase();
    const existingCategory = await adminService.findCategoryByName(name);

    if (existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }

    await adminService.createCategory(name);
    res.status(200).json({ success: true });
  } catch (error) {
    res.render("error", { message: "Something went wrong in adding Category" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.query._id;
    await adminService.softDeleteCategory(id);
    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in deleting Category",
    });
  }
};
/*====================================
=========PRODUCT MANAGEMENT===========
=====================================*/

const productList = async (req, res) => {
  try {
    const productData = await adminService.getAllProducts();
    res.render("adminProductManagement", { products: productData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading product list",
    });
  }
};
const renderAddProduct = (req, res) => {
  res.render("adminAddProduct");
};

/*====================================
===============MULTER=================
=====================================*/

const addProduct = async (req, res) => {
  try {
    await adminService.addNewProduct(req.body, req.files);
    res.status(201).json({ success: true });
  } catch (error) {
    if (error.message === "No files were uploaded.") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.render("error", { message: "Something went wrong in adding Product" });
  }
};
const renderEditProduct = async (req, res) => {
  try {
    const id = req.query._id;
    const productData = await adminService.getProductById(id);
    const categories = await adminService.getAllCategories();

    if (productData) {
      res.render("adminEditProduct", {
        product: productData,
        categories: categories,
      });
    } else {
      res.redirect("/adminHome");
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading edit product form",
    });
  }
};
const editProduct = async (req, res) => {
  try {
    await adminService.updateProduct(req.query._id, req.body, req.files);
    res.status(200).json({ success: true });
  } catch (error) {
    if (error.message === "Product not found") {
      return res.status(404).json({ success: false });
    }
    res.render("error", { message: "Something went wrong in editing product" });
  }
};

const deleteImage = async (req, res) => {
  try {
    const { productId, imageUrl } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    product.images = product.images.filter((image) => image !== imageUrl);

    await product.save();

    res.json({ success: true });
  } catch (error) {
    res.render("error", { message: "Something went wrong in deleting image" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.query._id;
    await adminService.deleteProduct(productId);

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    if (error.message === "Product not found") {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.render("error", {
      message: "Something went wrong in deleting product",
    });
  }
};

/*====================================
===============HOME==================
=====================================*/

const adminHome = (req, res) => {
  res.render("adminHome");
};

/*====================================
========ORDER MANAGEMENT==============
=====================================*/

const orderManagement = async (req, res) => {
  try {
    const orders = await adminService.getAllOrders();
    res.render("adminOrderManagement", { Orders: orders });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading orders",
    });
  }
};

// Ledger view for specific order
const ledger = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await adminService.getOrderById(orderId);
    res.json(order);
  } catch (error) {
    if (error.message === "Order not found") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.render("error", { message: "Something went wrong in loading ledger" });
  }
};

// Render change status form
const changeStatus = async (req, res) => {
  try {
    const { orderId, itemIndex } = req.query;
    const data = adminService.getChangeStatusData(orderId, itemIndex);
    res.render("adminChangeStatus", data);
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading change status form",
    });
  }
};

// Update the new status of an order item
const changeNewStatus = async (req, res) => {
  try {
    const { orderId, itemIndex, status } = req.body;
    await adminService.updateItemStatus(orderId, itemIndex, status);
    return res.redirect("/ordermanagement");
  } catch (error) {
    if (error.message === "Order not found") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.render("error", {
      message: "Something went wrong in changing new status",
    });
  }
};

const renderReturnRequets = async (req, res) => {
  try {
    const orders = await adminService.getReturnRequests();
    res.render("adminReturnOrders", { Orders: orders });
  } catch (error) {
    console.error("Error in renderReturnRequests:", error);
    res.render("error", {
      message: "Something went wrong while loading return requests",
    });
  }
};

const renderApproval = (req, res) => {
  try {
    const { orderId, itemIndex } = req.query;
    res.render("adminReturnApproval", { orderId, itemIndex });
  } catch (error) {
    console.error("Error in renderApproval:", error);
    res.render("error", {
      message: "Something went wrong while loading approval form",
    });
  }
};

const returnApproval = async (req, res) => {
  try {
    const { orderId, itemIndex, status } = req.body;
    await adminService.processReturnApproval(orderId, itemIndex, status);
    res.redirect("/ordermanagement");
  } catch (error) {
    console.error("Error in returnApproval:", error);
    res.status(500).json({
      message: "Something went wrong in return approval process",
    });
  }
};
/*=======================================
=========coupon Management==============
========================================*/

const renderCouponList = async (req, res) => {
  try {
    const couponData = await adminService.getAllCoupons();
    res.render("adminCouponList", { data: couponData });
  } catch (error) {
    console.error("Error in renderCouponList:", error);
    res.render("error", {
      message: "Something went wrong in loading coupon list",
    });
  }
};

const rendercouponCreate = async (req, res) => {
  try {
    res.render("createCoupon", { footer: "" });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading coupon create form",
    });
  }
};
const createCoupon = async (req, res) => {
  try {
    const result = await adminService.createNewCoupon(req.body);

    if (result.exists) {
      return res.render("adminCouponCreate", {
        footer: "Coupon already exists",
      });
    }

    res.redirect("/couponlist");
  } catch (error) {
    console.error("Error in createCoupon:", error);
    res.render("error", {
      message: "Something went wrong in creating coupon",
    });
  }
};
const deleteCoupon = async (req, res) => {
  try {
    await adminService.deleteCouponById(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error in deleteCoupon:", error);
    res.render("error", {
      message: "Something went wrong in deleting coupon",
    });
  }
};
/*====================================
==========OFFER MANAGEMENT============
=====================================*/
const renderOfferList = async (req, res) => {
  try {
    const offerData = await adminService.getAllOffers();
    res.render("adminOfferList", { data: offerData });
  } catch (error) {
    console.error("Error in renderOfferList:", error);
    res.render("error", { message: "Something went wrong in loading offers" });
  }
};

const rendercreateOffer = async (req, res) => {
  try {
    const productData = await adminService.getAllProducts();
    res.render("adminCreateOffer", { data: productData });
  } catch (error) {
    console.error("Error in renderCreateOffer:", error);
    res.render("error", {
      message: "Something went wrong in loading creating offer form",
    });
  }
};

const createOffer = async (req, res) => {
  try {
    const result = await adminService.createNewOffer(req.body);

    if (result.exists) {
      return res.redirect("/createOffer"); // If offer already exists
    }

    res.redirect("/offerlist");
  } catch (error) {
    console.error("Error in createOffer:", error);
    res.render("error", { message: "Something went wrong creating offer" });
  }
};
const deleteOffer = async (req, res) => {
  try {
    await adminService.deleteOfferById(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error in deleteOffer:", error);
    res.render("error", { message: "Something went wrong in deleting offer" });
  }
};

/*====================================
=============Category Offer===========
=====================================*/
const categoryOfferCreate = async (req, res) => {
  try {
    const categoryData = await adminService.getAllCategories();
    res.render("adminCategoryOfferCreate", { data: categoryData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading category offer form",
    });
  }
};
const addCategoryOffer = async (req, res) => {
  try {
    const { name, percentage, category } = req.body;
    if (!name || !percentage || !category) {
      return res.status(400).send("Missing required fields");
    }

    const offer = await adminService.createCategoryOffer(
      name,
      parseInt(percentage, 10),
      category
    );

    if (!offer) return res.redirect("/categoryOfferCreate");

    res.redirect("/offerlist");
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in adding category offer",
    });
  }
};
const deleteCategoryOffer = async (req, res) => {
  try {
    const deleted = await adminService.deleteCategoryOfferById(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });

    res
      .status(200)
      .json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in deleting offer",
    });
  }
};

/*====================================
=============SALES REPORT============
=====================================*/

const dailySales = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = await Orders.aggregate([
      {
        $match: {
          orderDate: {
            $gte: new Date(today),
            $lt: new Date(today + "T23:59:59.999Z"),
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);
    todayOrders.forEach((order) => {
      order.discount = (order.totalPrice * order.discountPercentage) / 100;
      order.couponDeduction = order.discount; // Assuming coupon deduction is the same as discount
    });
    const orderData = {
      todaysOrders: todayOrders,
    };
    console.log(orderData);
    const filePath = path.resolve(__dirname, "../views/convertPdf.ejs");
    const htmlString = fs.readFileSync(filePath).toString();
    const ejsData = ejs.render(htmlString, orderData);
    await createDailySales(ejsData);
    await createDailySalesExcel(todayOrders);

    const pdfFilePath = path.resolve(process.cwd(), "DailySalesReport.pdf");
    const pdfData = fs.readFileSync(pdfFilePath);
    const excelFilePath = "DailySalesReport.xlsx";
    const excelData = fs.readFileSync(excelFilePath);
    const fileType = req.query.fileType || "pdf"; // Default to PDF if not specified
    if (fileType === "excel") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="DailySalesReport.xlsx"'
      );
      res.send(excelData);
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="DailySalesReport.pdf"'
      );
      res.send(pdfData);
    }
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading daily sales ",
    });
  }
};

const createDailySales = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html);

  await page.pdf({
    path: path.resolve(process.cwd(), "DailySalesReport.pdf"),
  });
  await browser.close();
};

const createDailySalesExcel = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daily Sales");

  // Adding columns to the worksheet
  worksheet.columns = [
    { header: "SL.NO", key: "slNo", width: 10 },
    { header: "USERNAME", key: "userName", width: 30 },
    { header: "PRODUCT", key: "productName", width: 30 },
    { header: "QUANTITY", key: "quantity", width: 10 },
    { header: "TOTAL PRICE", key: "totalPrice", width: 15 },
    { header: "DISCOUNT", key: "discount", width: 15 },
    { header: "COUPON DEDUCTION", key: "couponDeduction", width: 20 },
    { header: "PAYMENT TYPE", key: "paymentType", width: 20 },
    { header: "STATUS", key: "status", width: 15 },
  ];

  // Adding rows to the worksheet
  orders.forEach((order, index) => {
    order.productDetails.forEach((product, productIndex) => {
      worksheet.addRow({
        slNo: productIndex === 0 ? index + 1 : "",
        orderId: productIndex === 0 ? order._id : "",
        userName: productIndex === 0 ? order.user.name : "",
        productName: product.name,
        quantity: order.item[productIndex].quantity,
        totalPrice:
          order.item[productIndex].quantity * order.item[productIndex].price,
        discount: productIndex === 0 ? order.discount.toFixed(2) : "",
        couponDeduction:
          productIndex === 0 ? order.couponDeduction.toFixed(2) : "",
        paymentType: productIndex === 0 ? order.paymentType : "",
        status: productIndex === 0 ? order.status : "",
      });
    });
  });

  // Write to file
  await workbook.xlsx.writeFile("DailySalesReport.xlsx");
};

const weeklySales = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() - today.getDay() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const todaysOrders = await Orders.aggregate([
      {
        $match: {
          orderDate: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);
    todaysOrders.forEach((order) => {
      order.discount = (order.totalPrice * order.discountPercentage) / 100;
      order.couponDeduction = order.discount; // Assuming coupon deduction is the same as discount
    });
    const orderData = {
      todaysOrders: todaysOrders,
    };
    console.log("from orders:", orderData);
    const filePathName = path.resolve(__dirname, "../views/convertPdf.ejs");
    const htmlString = fs.readFileSync(filePathName).toString();
    const ejsData = ejs.render(htmlString, orderData);
    await createWeeklySalesPdf(ejsData);
    await createWeeklySalesExcel(todaysOrders);
    const pdfFilePath = path.resolve(process.cwd(), "WeeklySalesReport.pdf");
    const pdfData = fs.readFileSync(pdfFilePath);

    const excelFilePath = "WeeklySalesReport.xlsx";
    const excelData = fs.readFileSync(excelFilePath);
    const fileType = req.query.fileType || "pdf"; // Default to PDF if not specified
    if (fileType === "excel") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="WeeklySalesReport.xlsx"'
      );
      res.send(excelData);
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="WeeklySalesReport.pdf"'
      );
      res.send(pdfData);
    }
  } catch (error) {
    console.log(error);
    res.render("error", {
      message: "Something went wrong in loading weekly sales",
    });
  }
};

const createWeeklySalesPdf = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({
    path: path.resolve(process.cwd(), "WeeklySalesReport.pdf"),
  });

  await browser.close();
};
const createWeeklySalesExcel = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Weekly Sales");

  // Adding columns to the worksheet
  worksheet.columns = [
    { header: "SL.NO", key: "slNo", width: 10 },
    { header: "USERNAME", key: "userName", width: 30 },
    { header: "PRODUCT", key: "productName", width: 30 },
    { header: "QUANTITY", key: "quantity", width: 10 },
    { header: "TOTAL PRICE", key: "totalPrice", width: 15 },
    { header: "DISCOUNT", key: "discount", width: 15 },
    { header: "COUPON DEDUCTION", key: "couponDeduction", width: 20 },
    { header: "PAYMENT TYPE", key: "paymentType", width: 20 },
    { header: "STATUS", key: "status", width: 15 },
  ];

  // Adding rows to the worksheet
  orders.forEach((order, index) => {
    order.productDetails.forEach((product, productIndex) => {
      worksheet.addRow({
        slNo: productIndex === 0 ? index + 1 : "",
        orderId: productIndex === 0 ? order._id : "",
        userName: productIndex === 0 ? order.user.name : "",
        productName: product.name,
        quantity: order.item[productIndex].quantity,
        totalPrice:
          order.item[productIndex].quantity * order.item[productIndex].price,
        discount: productIndex === 0 ? order.discount.toFixed(2) : "",
        couponDeduction:
          productIndex === 0 ? order.couponDeduction.toFixed(2) : "",
        paymentType: productIndex === 0 ? order.paymentType : "",
        status: productIndex === 0 ? order.status : "",
      });
    });
  });

  // Write to file
  await workbook.xlsx.writeFile("WeeklySalesReport.xlsx");
};
const yearlySales = async (req, res) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31);
    endOfYear.setHours(23, 59, 59, 999);
    const todaysOrders = await Orders.aggregate([
      {
        $match: {
          orderDate: {
            $gte: startOfYear,
            $lt: endOfYear,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);

    todaysOrders.forEach((order) => {
      order.discount = (order.totalPrice * order.discountPercentage) / 100;
      order.couponDeduction = order.discount; // Assuming coupon deduction is the same as discount
    });
    const orderData = {
      todaysOrders: todaysOrders,
    };
    const filePathName = path.resolve(__dirname, "../views/convertPdf.ejs");
    const htmlString = fs.readFileSync(filePathName).toString();
    const ejsData = ejs.render(htmlString, orderData);
    await createYearlySalesPdf(ejsData);
    await createYearlySalesExcel(orderData.todaysOrders);
    const pdfFilePath = path.resolve(process.cwd(), "YearlySalesReport.pdf");
    const pdfData = fs.readFileSync(pdfFilePath);

    const excelFilePath = "YearlySalesReport.xlsx";
    const excelData = fs.readFileSync(excelFilePath);

    const fileType = req.query.fileType || "pdf"; // Default to PDF if not specified
    if (fileType === "excel") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="YearlySalesReport.xlsx"'
      );
      res.send(excelData);
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="YearlySalesReport.pdf"'
      );
      res.send(pdfData);
    }
  } catch (error) {
    res.render("error", { message: "Something went wrong in yearly sales" });
  }
};

const createYearlySalesPdf = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html);

  await page.pdf({
    path: path.resolve(process.cwd(), "YearlySalesReport.pdf"),
  });

  await browser.close();
};

const createYearlySalesExcel = async (orders) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Yearly Sales");

  // Adding columns to the worksheet
  worksheet.columns = [
    { header: "SL.NO", key: "slNo", width: 10 },
    { header: "USERNAME", key: "userName", width: 30 },
    { header: "PRODUCT", key: "productName", width: 30 },
    { header: "QUANTITY", key: "quantity", width: 10 },
    { header: "TOTAL PRICE", key: "totalPrice", width: 15 },
    { header: "DISCOUNT", key: "discount", width: 15 },
    { header: "COUPON DEDUCTION", key: "couponDeduction", width: 20 },
    { header: "PAYMENT TYPE", key: "paymentType", width: 20 },
    { header: "STATUS", key: "status", width: 15 },
  ];

  // Adding rows to the worksheet
  orders.forEach((order, index) => {
    order.productDetails.forEach((product, productIndex) => {
      worksheet.addRow({
        slNo: productIndex === 0 ? index + 1 : "",
        orderId: productIndex === 0 ? order._id : "",
        userName: productIndex === 0 ? order.user.name : "",
        productName: product.name,
        quantity: order.item[productIndex].quantity,
        totalPrice:
          order.item[productIndex].quantity * order.item[productIndex].price,
        discount: productIndex === 0 ? order.discount.toFixed(2) : "",
        couponDeduction:
          productIndex === 0 ? order.couponDeduction.toFixed(2) : "",
        paymentType: productIndex === 0 ? order.paymentType : "",
        status: productIndex === 0 ? order.status : "",
      });
    });
  });

  // Write to file
  await workbook.xlsx.writeFile("YearlySalesReport.xlsx");
};
const fetchlineChartData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const processedData = await Orders.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderDate" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $limit: 6,
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
    res.json({ result: processedData });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading line chart",
    });
  }
};

const fetchbarChartData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const processedData = await Orders.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderDate" },
          },
          totalPrice: { $sum: { $toInt: "$totalPrice" } },
        },
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $limit: 6,
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);
    res.json({ result: processedData });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Bar chart" });
  }
};
const fetchpieChartData = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const processedData = await Orders.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentType",
          count: { $sum: 1 },
        },
      },
    ]);
    res.json({ result: processedData });
  } catch (error) {
    res.render("error", { message: "Something went wrong in Pie chart" });
  }
};

const dashboardload = async (req, res) => {
  try {
    const userdata = await User.find();
    const orderNumber = await Orders.find();
    const sumResult = await Orders.aggregate([
      {
        $group: {
          _id: null,
          totalPriceSum: { $sum: { $toInt: "$totalPrice" } },
        },
      },
    ]);
    const currentDate = new Date();
    const dateBefore7Days = new Date(
      currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const weeklyEarnings = await Orders.aggregate([
      {
        $match: {
          orderDate: {
            $gte: dateBefore7Days,
            $lt: currentDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPriceSum: { $sum: { $toInt: "$totalPrice" } },
        },
      },
    ]);
    const salesData = await Orders.find().populate("couponId");

    let totalDiscount = 0;
    let totalCouponDeduction = 0;

    salesData.forEach((sale) => {
      const discount = (sale.totalPrice * sale.discountPercentage) / 100;
      totalDiscount += discount;
      totalCouponDeduction += discount;
    });
    const bestSellingProducts = await Orders.aggregate([
      { $unwind: "$item" },
      {
        $group: {
          _id: "$item.product",
          totalQuantity: { $sum: "$item.quantity" },
        },
      },
      {
        $lookup: {
          from: "products", // Assuming your product collection is named 'products'
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" }, // Unwind to destructure the array from lookup
      {
        $project: {
          _id: "$product._id",
          productName: "$product.name", // Replace '_id' with 'productName'
          totalQuantity: 1,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 10,
      },
    ]).exec();

    const bestSellingCategories = await Orders.aggregate([
      { $unwind: "$item" },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          totalQuantity: { $sum: "$item.quantity" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: "$category._id",
          categoryName: "$category.name",
          totalQuantity: 1,
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 10,
      },
    ]).exec();

    const bestSellingBrands = await Orders.aggregate([
      { $unwind: "$item" },
      {
        $lookup: {
          from: "products",
          localField: "item.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.brand",
          totalQuantity: { $sum: "$item.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 10,
      },
    ]).exec();
    console.log(bestSellingCategories);
    console.log(totalDiscount, totalCouponDeduction);
    res.render("adminHome", {
      data: userdata,
      totalPriceSum: sumResult,
      weeklyEarnings: weeklyEarnings,
      orderNumber: orderNumber,
      totalDiscount,
      totalCouponDeduction,
      bestSellingBrands,
      bestSellingCategories,
      bestSellingProducts,
    });
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in loading dashboard",
    });
  }
};
const updateDashboard = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    // Fetch the data based on the date range
    const totalUsers = await User.countDocuments({
      created_at: { $gte: startDate, $lte: endDate },
    });

    const totalEarningsResult = await Orders.aggregate([
      {
        $match: {
          orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    const totalEarnings =
      totalEarningsResult.length > 0 ? totalEarningsResult[0].total : 0;

    const totalOrders = await Orders.countDocuments({
      orderDate: { $gte: startDate, $lte: endDate },
    });

    const salesData = await Orders.find({
      orderDate: { $gte: startDate, $lte: endDate },
    });

    let totalDiscount = 0;
    let totalCouponDeduction = 0;

    salesData.forEach((sale) => {
      // Calculate discount for each sale
      const discount = (sale.totalPrice * sale.discountPercentage) / 100;
      totalDiscount += discount;
      totalCouponDeduction += discount;

      // Accumulate coupon deductions if applicable
    });

    res.json({
      totalUsers,
      totalEarnings,
      totalOrders,
      totalDiscount,
      totalCouponDeduction,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Error fetching dashboard data" });
  }
};

/*====================================
===============INVOICE=================
=====================================*/

const generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    console.log(orderId);
    const order = await Orders.findById(orderId)
      .populate("userId")
      .populate("address")
      .populate("item.product");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const filePathName = path.resolve(__dirname, "../views/invoicePdf.ejs");
    const htmlString = fs.readFileSync(filePathName).toString();
    const ejsData = ejs.render(htmlString, { order });

    await createInvoicePdf(ejsData);

    const pdfFilePath = "Invoice.pdf";
    const pdfData = fs.readFileSync(pdfFilePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice-${order._id}.pdf"`
    );
    res.send(pdfData);
  } catch (error) {
    res.render("error", {
      message: "Something went wrong in generating invoice",
    });
  }
};

const createInvoicePdf = async (html) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: "Invoice.pdf" });
  await browser.close();
};

/*====================================
===============LOGOUT=================
=====================================*/

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out.");
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.redirect(`/login`);
    // Ensure headers prevent caching
  });
};
module.exports = {
  renderAdmin: renderAdmin,
  dashboardload,
  admin,
  checkLoggedIn,
  userList,
  blockUser,
  unBlockUser,
  categoryList,
  editCategory,
  renderEditCategory,
  productList,
  renderAddCcategory,
  addCategory,
  deleteCategory,
  renderAddProduct,
  addProduct,
  renderEditProduct,
  editProduct,
  deleteImage,
  deleteProduct,
  adminHome,
  orderManagement,
  changeStatus,
  changeNewStatus,
  renderReturnRequets,
  renderApproval,
  returnApproval,
  rendercouponCreate,
  createCoupon,
  renderCouponList,
  deleteCoupon,
  rendercreateOffer,
  createOffer,
  renderOfferList,
  deleteOffer,
  addCategoryOffer,
  categoryOfferCreate,
  deleteCategoryOffer,
  fetchbarChartData,
  fetchlineChartData,
  fetchpieChartData,
  dailySales,
  weeklySales,
  yearlySales,
  updateDashboard,
  generateInvoice,
  ledger,
  logout,
};
