const express = require("express");
const createError = require("http-errors");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const { v4: uuidv4 } = require("uuid");
const flash = require("express-flash");
const userRouter = require("./route/userRoutes");
const adminRouter = require("./route/adminRoute");
const cartRouter = require("./route/cartRoute");
const productRouter = require("./route/productRoutes");
const Products = require("./models/productModel");
const User = require("./models/userModel");
const mongoose = require("mongoose");
const passport = require("passport");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/fonts", express.static(path.join(__dirname, "fonts")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/validations", express.static(path.join(__dirname, "validations")));
app.use(cookieParser());
app.use(
  session({
    secret: "key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(userRouter);
app.use(adminRouter);
app.use(cartRouter);
app.use(productRouter);

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

app.get("/", async (req, res) => {
  const productdata = await Products.find({ isDeleted: false }).sort({
    created_at: -1,
  });
  res.render("index", { products: productdata });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  function (req, res) {
    req.session.user = req.user;
    res.redirect("/home");
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${3000}`);
});
