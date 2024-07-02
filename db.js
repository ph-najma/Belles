// db.js - Database connection setup
const mongoose = require("mongoose");

const connectToDatabase = async () => {
  try {
    const mongoURI = "mongodb://localhost:27017/ecommerce";
    await mongoose.connect(mongoURI, {});
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
};

module.exports = connectToDatabase;
