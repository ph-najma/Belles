// db.js - Database connection setup
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const connectToDatabase = async () => {
  try {
    const mongoURI = process.env.mongoURI;

    await mongoose.connect(mongoURI, {});
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
};

module.exports = connectToDatabase;
