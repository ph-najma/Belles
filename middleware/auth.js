const userLogin = (req, res, next) => {
  try {
    if (!req.session.user) {
      res.redirect("/login");
    } else {
      next();
    }
  } catch (error) {
    console.log(error.message);
  }
};

const adminLogin = (req, res, next) => {
  try {
    if (!req.session.admin) {
      res.redirect("/loginadmin");
    } else {
      next();
    }
  } catch (error) {
    console.log(error.message);
  }
};

// middlewares/authMiddleware.js

const checkLoggedIn = (req, res, next) => {
  if (req.session.loginSuccess) {
    return res.redirect("/home"); // Redirect to home if logged in
  }

  // Prevent caching for non-logged-in users
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
};

module.exports = { userLogin, adminLogin, checkLoggedIn };
